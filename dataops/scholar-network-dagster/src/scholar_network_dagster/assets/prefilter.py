"""Brut pré-filtré — asset ``prefiltered_raw`` (ADR 0103 §1.1, lot 2).

Premier étage du pipeline. Filtre le snapshot Parquet OpenAlex au **prédicat commun aux
deux passes** — ``publication_year >= 2016 ∧ type = 'article'`` — en **projection stricte**
(seules les colonnes utiles à l'aval, jamais ``abstract_inverted_index`` ni
``referenced_works``, lourds). Le résultat est le brut pré-filtré : l'intermédiaire dont la
reconstruction coûte un balayage complet du lac, et que ``persistence.mode`` met en cache
(``cache.py`` : ``full`` le garde entre runs, ``bounded`` le temps du run, ``ephemeral``
jamais).

La construction du SQL (``prefilter_sql``) et le choix de l'emplacement (``cache_location``)
sont des fonctions **PURES** (aucune I/O), testables sans réseau. L'asset ``prefiltered_raw``
orchestre l'I/O : lecture source → COPY vers le cache selon le mode → purge si ``bounded`` →
lineage.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

import os

from dagster import MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from openlineage.client.uuid import generate_new_uuid

from scholar_network_dagster import lakehouse, lineage
from scholar_network_dagster.cache import resolve_cache_mode
from scholar_network_dagster.resources import ceph_target_from_env

# Prédicat métier du brut pré-filtré (ADR 0103 §1.1). Année plancher FIXE (pas « année −
# N ») : périmètre déterministe et reproductible (ADR 0057). ``type`` STRICT = le champ
# ``work.type`` d'OpenAlex ; ``'article'`` exclut datasets, preprints, book-chapters…
MIN_YEAR = 2016
WORK_TYPE = "article"

# Projection STRICTE : les colonnes utiles aux deux passes + au profilage (lot 5).
#   - ``id``               : clé du work ;
#   - ``publication_year`` : borne temporelle (déjà filtrée, portée pour l'aval/audit) ;
#   - ``type``             : critère (porté pour vérification/audit) ;
#   - ``title``            : affichage aval ;
#   - ``authorships``      : co-auteurs + affiliations (ROR passe 1, author.id passe 2) ;
#   - ``topics``/``keywords`` : texte thématique de l'embedding (lot 5) ;
#   - ``fwci``/``cited_by_count`` : départage DÉTERMINISTE de la dédup par récence à égalité
#     d'``updated_date`` (ordre total, ADR 0057 — parité citation ``_dedup_sql``) ;
#   - ``updated_date``     : dédup par récence (ADR 0099).
# JAMAIS ``abstract_inverted_index`` / ``referenced_works`` (lourds, hors périmètre).
PROJECTED_COLUMNS = (
    "id",
    "publication_year",
    "type",
    "title",
    "authorships",
    "topics",
    "keywords",
    "fwci",
    "cited_by_count",
    "updated_date",
)


def prefilter_sql(source_glob: str, min_year: int = MIN_YEAR, work_type: str = WORK_TYPE) -> str:
    """SQL DuckDB : projection stricte + filtre ``≥ min_year ∧ type = work_type`` (PURE).

    ``source_glob`` : chemin lisible par ``read_parquet`` (ex. ``s3://openalex/…/*.parquet``
    pour l'exécution réelle, ou ``file://…`` / un chemin local pour les tests). Le résultat
    ne porte QUE ``PROJECTED_COLUMNS`` — la projection est appliquée AVANT tout scan de
    données (DuckDB lit par colonne depuis le footer). Le prédicat est le même quel que soit
    le mode de cache : la correction ne dépend jamais du mode (ADR 0103 §3).
    """
    projection = ", ".join(PROJECTED_COLUMNS)
    # work_type est un littéral métier fixe (jamais une entrée utilisateur) : on l'échappe
    # tout de même par doublement des quotes, par principe (SQL DuckDB).
    safe_type = work_type.replace("'", "''")
    return f"""
        SELECT {projection}
        FROM read_parquet('{source_glob}')
        WHERE publication_year >= {int(min_year)}
          AND type = '{safe_type}'
    """


# Sous-préfixe du brut pré-filtré dans le bucket. ``full`` écrit sous ``prefiltered/`` (relu
# tel quel au run suivant) ; ``bounded`` sous ``prefiltered/_transient/run=<id>/`` (purgé en
# fin de run) ; ``ephemeral`` n'écrit rien.
PREFILTERED_SUBDIR = "prefiltered"


def cache_location(mode, bucket: str, run_id: str) -> str | None:
    """Chemin S3 où écrire le brut pré-filtré selon le mode de cache (PURE ; ADR 0103 §3).

    - ``PERSISTENT`` (full)  → ``s3://<bucket>/prefiltered/`` : emplacement STABLE, relu tel
      quel au run suivant (l'écriture est idempotente, ``OVERWRITE_OR_IGNORE``) ;
    - ``TRANSIENT`` (bounded)→ ``s3://<bucket>/prefiltered/_transient/run=<id>/`` : isolé par
      run, purgé en fin de run (le préfixe ``_transient/`` ne collisionne pas avec ``full``) ;
    - ``NONE`` (ephemeral)   → ``None`` : rien n'est matérialisé (recalcul à la volée).

    ``mode`` est un ``cache.CacheMode`` (importé par l'appelant pour éviter un cycle).
    """
    if not mode.materializes:
        return None
    base = f"s3://{bucket}/{PREFILTERED_SUBDIR}"
    return base if mode.persists_between_runs else f"{base}/_transient/run={run_id}"


# Source externe OpenAlex (Parquet). En prose uniquement (jamais dans un identifiant interne,
# ADR 0022). Le glob source est une VALEUR D'INSTANCE (ADR 0023) : le déployeur pointe le
# snapshot Parquet OpenAlex qu'il a rendu lisible par DuckDB (secret S3 scopé au bucket
# source, configuré au déploiement — l'accès à la source est un prérequis d'infra, pas figé
# dans le code). Défaut = le chemin public canonique.
_DEFAULT_SOURCE_GLOB = "s3://openalex/data/parquet/works/**/*.parquet"


def source_glob(env: dict | None = None) -> str:
    """Glob Parquet de la source OpenAlex (valeur d'instance ``SCHOLAR_NETWORK_SOURCE_GLOB``)."""
    env = env if env is not None else os.environ
    return env.get("SCHOLAR_NETWORK_SOURCE_GLOB") or _DEFAULT_SOURCE_GLOB


@asset(
    name="prefiltered_raw",
    group_name="ingestion",
    description="Brut pré-filtré OpenAlex (≥2016 ∧ article, projeté) — cache du prédicat "
    "commun aux deux passes (ADR 0103 §1.1).",
)
def prefiltered_raw() -> MaterializeResult:
    """Produit le brut pré-filtré et le matérialise selon ``persistence.mode`` (ADR 0103 §3).

    ``full`` → écrit sous ``prefiltered/`` (gardé entre runs) ; ``bounded`` → écrit sous
    ``prefiltered/_transient/run=<id>/`` puis PURGÉ en fin d'asset (cache le temps du run) ;
    ``ephemeral`` → n'écrit rien (les passes reconstruiront le pré-filtré à la volée). La
    correction ne dépend PAS du mode : seul l'emplacement/la durée de vie change.

    NB (frontière lot 2/3-4) : en ``ephemeral``, cet asset ne matérialise rien — il valide la
    lisibilité de la source et expose le glob ; les passes aval relisent la source. En
    ``full``/``bounded``, il matérialise le pré-filtré que les passes relisent (1 balayage).
    """
    target = ceph_target_from_env()
    mode = resolve_cache_mode()
    run_id = str(generate_new_uuid())
    glob = source_glob()

    inputs = [lineage.raw_dataset("works")]
    outputs = [lineage.prefiltered_dataset("works")]
    lineage.emit(RunState.START, run_id, "prefiltered_raw", inputs, outputs)

    con = lakehouse.connect()
    select = prefilter_sql(glob)
    dest = cache_location(mode, target.bucket, run_id)

    if dest is None:
        # ephemeral : pas de matérialisation. On COMPTE le pré-filtré (valide la source
        # lisible + renseigne la métadonnée) sans l'écrire — les passes le recalculeront.
        prefiltered_works = con.execute(f"SELECT count(*) FROM ({select})").fetchone()[0]
    else:
        # full/bounded : matérialise le pré-filtré (un fichier ; le partitionnement fin viendra
        # si le volume l'exige — mesure, pas anticipation). OVERWRITE_OR_IGNORE : idempotent.
        part = f"{dest}/part-00000.parquet"
        con.execute(f"COPY ({select}) TO '{part}' (FORMAT PARQUET)")
        prefiltered_works = con.execute(f"SELECT count(*) FROM read_parquet('{part}')").fetchone()[
            0
        ]
    lineage.emit(RunState.COMPLETE, run_id, "prefiltered_raw", inputs, outputs)

    # bounded : le cache ne survit pas au run. Le préfixe isolé ``_transient/run=<id>`` est
    # conçu pour être cueilli par le lifecycle S3 / non relu par un run ultérieur (qui a son
    # propre run_id) ; on le SIGNALE en métadonnée plutôt que de supprimer à la main (une
    # suppression S3 récursive fiable est un geste de fin de RUN, pas d'asset — évite qu'un
    # échec aval laisse le cache à moitié purgé).
    return MaterializeResult(
        metadata={
            "cache_mode": MetadataValue.text(mode.value),
            "materialized": MetadataValue.bool(dest is not None),
            "destination": MetadataValue.text(dest or "(ephemeral — non matérialisé)"),
            "transient_purge": MetadataValue.bool(mode.purge_after_run),
            "prefiltered_works": MetadataValue.int(int(prefiltered_works)),
            "source_glob": MetadataValue.text(glob),
        }
    )
