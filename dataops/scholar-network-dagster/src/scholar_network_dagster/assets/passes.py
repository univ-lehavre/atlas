"""Passes 1 et 2 de l'ingestion scholar-network (ADR 0103 §1.2/§1.3, lots 3-4).

Sur le **brut pré-filtré** (``≥2016 ∧ article``, projeté — produit par ``prefiltered_raw``,
lot 2) :

- **Passe 1 (lot 3)** — asset ``researchers`` : extrait les ``author_id`` AFFILIÉS EUNICoast
  (au moins une de LEURS institutions porte un ROR du référentiel). C'est l'ensemble des
  chercheurs identifiés du réseau.
- **Passe 2 (lot 4)** — asset ``scholar_works`` : semi-jointure du brut pré-filtré contre la
  table des chercheurs → tous les articles ≥2016 de ces chercheurs, **y compris hors
  affiliation EUNICoast** (le chercheur appartient au réseau une fois identifié).

Les SQL sont des fonctions **PURES** (aucune I/O), testées sans réseau puis prouvées sur
MinIO. La distinction clé de la passe 1 : on déroule ``authorships`` PAR AUTEUR et on teste
le ROR au grain AUTEUR (``a.institutions[].ror``), pas au grain work — un co-auteur NON
affilié EUNICoast d'un work EUNICoast n'entre PAS dans la table (il entrera en passe 2 s'il
co-signe avec un membre, mais il n'est pas lui-même « identifié »).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

from dagster import AssetKey, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from openlineage.client.uuid import generate_new_uuid

from scholar_network_dagster import lakehouse, lineage
from scholar_network_dagster.assets.prefilter import (
    PREFILTERED_SUBDIR,
    prefilter_sql,
    source_glob,
)
from scholar_network_dagster.cache import resolve_cache_mode
from scholar_network_dagster.ref_eunicoast import EUNICOAST_ROR
from scholar_network_dagster.resources import ceph_target_from_env

# Sous-préfixes des sorties des passes.
RESEARCHERS_SUBDIR = "passes/researchers"
SCHOLAR_WORKS_SUBDIR = "passes/scholar_works"


def _ror_sql_list(ror_list) -> str:
    """Littéral liste SQL des ROR (petit — 14 valeurs, jamais une entrée utilisateur)."""
    return "[" + ", ".join("'" + r.replace("'", "''") + "'" for r in ror_list) + "]"


def researchers_sql(prefiltered_from: str, ror_list=EUNICOAST_ROR) -> str:
    """SQL DuckDB : ``author_id`` DISTINCTS affiliés EUNICoast (passe 1, PURE ; ADR 0103 §1.2).

    ``prefiltered_from`` est une **expression FROM** qui produit le brut pré-filtré : soit un
    ``read_parquet('<cache>/*.parquet')`` (full/bounded), soit la sous-requête du filtre sur la
    source (ephemeral). L'appelant compose ainsi la passe indépendamment du mode de cache
    (ADR 0103 §3) — le SQL ci-dessous ne sait pas d'où vient le brut.

    Déroule ``authorships`` par auteur (``UNNEST``), garde un auteur SSI au moins une de SES
    institutions porte un ROR du référentiel (``list_has_any`` sur ``a.institutions[].ror``),
    projette ``a.author.id`` DISTINCT. Grain AUTEUR (pas work) : c'est ce qui distingue « être
    identifié comme membre » (affilié) de « co-signer avec un membre » (passe 2). Déterministe :
    ``DISTINCT`` + ``ORDER BY`` (ADR 0057).
    """
    ror_sql = _ror_sql_list(ror_list)
    return f"""
        SELECT DISTINCT a.author.id AS author_id
        FROM ({prefiltered_from}) AS w,
             UNNEST(w.authorships) AS t(a)
        WHERE a.author.id IS NOT NULL
          AND list_has_any(
                {ror_sql},
                list_transform(a.institutions, i -> i.ror)
              )
        ORDER BY author_id
    """


def scholar_works_sql(prefiltered_from: str, researchers_from: str) -> str:
    """SQL DuckDB : works ≥2016 co-écrits par ≥1 chercheur identifié (passe 2, PURE ; §1.3).

    ``prefiltered_from`` : expression FROM du brut pré-filtré ; ``researchers_from`` :
    expression FROM de la table des chercheurs (author_id). Un work est retenu SSI au moins
    un de ses co-auteurs est dans la table — **indépendamment de l'affiliation de ce work**
    (c'est l'élargissement : un chercheur identifié « emporte » ses works écrits ailleurs).

    Mécanique (ADR 0103 §perf) : SEMI-JOINTURE par hachage. On déroule ``authorships`` par
    auteur (``UNNEST``) pour obtenir (work_id, author_id), on ``SEMI JOIN`` sur la table des
    chercheurs (petite → hash en RAM), puis on ne garde QUE les works dont un auteur a matché
    (``EXISTS`` au grain work, pas de duplication du work par co-auteur). Dédup par récence
    (``updated_date`` DESC) : OpenAlex réédite un work_id sur plusieurs partitions (ADR 0099).
    Déterministe (ADR 0057) : ``row_number`` ordonné + ``ORDER BY`` final.
    """
    return f"""
        WITH prefiltered AS ({prefiltered_from}),
             researchers AS ({researchers_from}),
             work_authors AS (
                 -- déroule authorships → (work_id, author_id) au grain co-auteur
                 SELECT w.id AS work_id, a.author.id AS author_id
                 FROM prefiltered AS w,
                      UNNEST(w.authorships) AS t(a)
             ),
             matched AS (
                 -- works ayant AU MOINS UN co-auteur dans la table des chercheurs
                 -- (INNER JOIN + DISTINCT : semi-jointure par hachage, sans sous-requête
                 --  corrélée — le planner DuckDB ne sait pas aplatir un SEMI JOIN sur un UNNEST)
                 SELECT DISTINCT wa.work_id
                 FROM work_authors AS wa
                 JOIN researchers AS r ON r.author_id = wa.author_id
             ),
             kept AS (
                 SELECT w.*, row_number() OVER (
                     PARTITION BY w.id ORDER BY w.updated_date DESC NULLS LAST
                 ) AS _rn
                 FROM prefiltered AS w
                 JOIN matched AS m ON m.work_id = w.id
             )
        SELECT * EXCLUDE (_rn) FROM kept WHERE _rn = 1 ORDER BY id
    """


def _prefiltered_source(target, mode, run_id: str) -> str:
    """Glob à lire pour le brut pré-filtré, selon le mode de cache (ADR 0103 §3).

    ``full``/``bounded`` : le brut est matérialisé par ``prefiltered_raw`` → on relit le cache
    (``prefiltered/`` ou ``prefiltered/_transient/run=<id>``). ``ephemeral`` : rien n'est
    matérialisé → on reconstitue le pré-filtré à la volée depuis la source (``prefilter_sql``
    enveloppé comme sous-requête via une CTE lisible par ``read_parquet``… non : on lit la
    source directement et l'appelant enveloppe). Ici on renvoie le GLOB du cache si
    matérialisé, sinon ``None`` (l'appelant bascule sur la source).
    """
    if not mode.materializes:
        return None
    base = f"s3://{target.bucket}/{PREFILTERED_SUBDIR}"
    prefix = base if mode.persists_between_runs else f"{base}/_transient/run={run_id}"
    return f"{prefix}/*.parquet"


def _prefiltered_relation_sql(target, mode, run_id: str) -> str:
    """SQL renvoyant le brut pré-filtré, que le cache soit matérialisé (full/bounded) ou non.

    - matérialisé → ``SELECT * FROM read_parquet('<cache>/*.parquet')`` ;
    - ephemeral   → le ``prefilter_sql`` sur la source (recalcul à la volée).

    Ainsi les passes s'écrivent PONT identiquement quel que soit le mode : elles consomment
    « le brut pré-filtré », sans savoir s'il vient du cache ou de la source (ADR 0103 §3).
    """
    cache_glob = _prefiltered_source(target, mode, run_id)
    if cache_glob is not None:
        return f"SELECT * FROM read_parquet('{cache_glob}')"
    return prefilter_sql(source_glob())


@asset(
    name="researchers",
    group_name="ingestion",
    deps=[AssetKey("prefiltered_raw")],
    description="Passe 1 — author_id affiliés EUNICoast (chercheurs identifiés du réseau, "
    "ADR 0103 §1.2).",
)
def researchers() -> MaterializeResult:
    """Écrit la table des chercheurs (``passes/researchers/``) : ``author_id`` affiliés.

    Lit le brut pré-filtré (cache si full/bounded, source à la volée si ephemeral) et en
    extrait les auteurs affiliés EUNICoast. Table petite (~10⁴–10⁵ ids) — un fichier.
    """
    target = ceph_target_from_env()
    mode = resolve_cache_mode()
    run_id = str(generate_new_uuid())

    inputs = [lineage.prefiltered_dataset("works")]
    outputs = [lineage.pass_dataset("researchers")]
    lineage.emit(RunState.START, run_id, "researchers", inputs, outputs)

    con = lakehouse.connect()
    prefiltered = _prefiltered_relation_sql(target, mode, run_id)
    select = researchers_sql(prefiltered)

    # Préfixe STABLE (pas run=<id>) : le recompute est INTÉGRAL mensuel (un seul run) et la
    # passe 2 du MÊME run doit relire cette table. On écrase à chaque run (OVERWRITE_OR_IGNORE
    # via le COPY d'un fichier unique) — déterministe, pas d'accumulation de run= à trier.
    dest = f"s3://{target.bucket}/{RESEARCHERS_SUBDIR}/part-00000.parquet"
    con.execute(f"COPY ({select}) TO '{dest}' (FORMAT PARQUET)")
    n = con.execute(f"SELECT count(*) FROM read_parquet('{dest}')").fetchone()[0]

    lineage.emit(RunState.COMPLETE, run_id, "researchers", inputs, outputs)
    return MaterializeResult(
        metadata={
            "researchers": MetadataValue.int(int(n)),
            "destination": MetadataValue.text(dest),
            "cache_mode": MetadataValue.text(mode.value),
        }
    )


def researchers_glob(bucket: str) -> str:
    """Glob de la table des chercheurs (préfixe stable) — relu par la passe 2 et le profilage."""
    return f"s3://{bucket}/{RESEARCHERS_SUBDIR}/*.parquet"


@asset(
    name="scholar_works",
    group_name="ingestion",
    deps=[AssetKey("researchers")],
    description="Passe 2 — tous les articles ≥2016 des chercheurs identifiés (y compris hors "
    "affiliation EUNICoast, ADR 0103 §1.3).",
)
def scholar_works() -> MaterializeResult:
    """Écrit le périmètre works final (``passes/scholar_works/run=<id>/``).

    Semi-jointure du brut pré-filtré contre la table des chercheurs → tous les articles
    ≥2016 co-écrits par ≥1 chercheur identifié, MÊME sans affiliation EUNICoast sur ce work.
    """
    target = ceph_target_from_env()
    mode = resolve_cache_mode()
    run_id = str(generate_new_uuid())

    inputs = [lineage.prefiltered_dataset("works"), lineage.pass_dataset("researchers")]
    outputs = [lineage.pass_dataset("scholar_works")]
    lineage.emit(RunState.START, run_id, "scholar_works", inputs, outputs)

    con = lakehouse.connect()
    prefiltered = _prefiltered_relation_sql(target, mode, run_id)
    researchers_from = f"SELECT * FROM read_parquet('{researchers_glob(target.bucket)}')"
    select = scholar_works_sql(prefiltered, researchers_from)

    dest = f"s3://{target.bucket}/{SCHOLAR_WORKS_SUBDIR}/run={run_id}/part-00000.parquet"
    con.execute(f"COPY ({select}) TO '{dest}' (FORMAT PARQUET)")
    n = con.execute(f"SELECT count(*) FROM read_parquet('{dest}')").fetchone()[0]

    lineage.emit(RunState.COMPLETE, run_id, "scholar_works", inputs, outputs)
    return MaterializeResult(
        metadata={
            "scholar_works": MetadataValue.int(int(n)),
            "destination": MetadataValue.text(dest),
            "cache_mode": MetadataValue.text(mode.value),
        }
    )
