"""Asset d'ingestion : mart EUNICoast par lots colonnaires (ADR 0105).

Deuxième étage de l'ingestion, après ``raw_snapshot``. Lit le snapshot Parquet complet
d'OpenAlex (``raw/works/**/*.parquet``, ~600M works) **par lots homogènes en nombre de
works** et n'en retient que le **périmètre EUNICoast** : les works ayant au moins un
co-auteur affilié à un établissement EUNICoast (les 14 ROR du référentiel) ET publiés
depuis 2016. Le résultat (~10⁴–10⁵ works) est accumulé en Parquet sous
``mart_eunicoast/run=<run_id>/`` — la source de toute la chaîne dbt aval.

**Pourquoi des lots.** Les fichiers Parquet OpenAlex sont très hétérogènes (de quelques
dizaines à ~360k works). Un découpage par nombre de fichiers serait déséquilibré ; on
compose donc les lots en **cumulant ``num_rows``** (lu du manifest des footers, écrit par
``raw_snapshot``) jusqu'à ``works_per_batch``. Chaque lot est traité par UNE requête DuckDB
bornée en mémoire → jamais d'OOM (contrairement au parse JSON de forme, drifts L76/L77).

**Pourquoi DuckDB.** Le filtre fouille dans des structures imbriquées
(``authorships[].institutions[].ror``) : DuckDB le fait nativement (unnest de structs,
``list`` de ROR), en lisant **par colonne** (projection stricte — jamais
``abstract_inverted_index`` ni ``referenced_works``). Dask a été écarté (il ne sait pas
lire un sous-champ imbriqué, charge ``authorships`` entier — drift L78).

**Affiliation lue DANS le work** (ADR 0105) : le ROR est porté par le work lui-même
(``authorships[].institutions[].ror``), pas par l'entité ``authors``. Le work est
auto-suffisant pour le périmètre — aucune jointure externe.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

import csv
from pathlib import Path

from dagster import AssetKey, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from openlineage.client.uuid import generate_new_uuid

from citation_dagster import lakehouse, lineage
from citation_dagster.resources import ceph_target_from_env

# Année plancher du périmètre EUNICoast (ADR 0105). Fixe (pas « année courante − 10 ») :
# le périmètre métier est « depuis 2016 », déterministe et reproductible (ADR 0057).
_MIN_YEAR = 2016

# Taille cible d'un lot, en NOMBRE DE WORKS (pas de fichiers). ~5M works projetés
# (year+authorships+topics+keywords) tiennent largement en RAM d'un pod de run → mémoire
# bornée par lot, jamais par les ~600M works du lac. Dérivable par l'env (banc plus petit).
_WORKS_PER_BATCH = 5_000_000

# Colonnes du mart (projection STRICTE, ADR 0105). Le ``title`` est porté (affichage aval,
# décision utilisateur) ; ``keywords`` aussi (alimente marts_researchers/FTS). JAMAIS
# ``abstract_inverted_index`` ni ``referenced_works`` (hors périmètre, lourds).
# ``updated_date`` : date de dernière révision OpenAlex du work, portée pour DÉDUPLIQUER par
# récence (ADR 0099). OpenAlex réédite un même ``work_id`` (FWCI recalculé, affiliation
# modifiée) dans une partition ``updated_date`` plus récente ; le filigrane d'ingestion est
# additif → le mart voit plusieurs versions. On garde la plus récente (cf. ``_dedup_sql``).
_MART_COLUMNS = (
    "id",
    "publication_year",
    "title",
    "authorships",
    "topics",
    "keywords",
    "fwci",
    "cited_by_count",
    "updated_date",
)

# Sous-dossier de sortie (lakehouse). Écrit par run (immutable, ADR 0054).
_MART_SUBDIR = "mart_eunicoast"

# Les 14 ROR EUNICoast. Copie de ``citation-dbt/seeds/ref_eunicoast.csv`` (source de
# vérité) — un test anti-drift (``test_ror_list_matches_seed``) casse la CI si les deux
# divergent. En dur ici pour que le filtre SQL ne dépende pas de dbt à l'ingestion.
_EUNICOAST_ROR = (
    "https://ror.org/05v509s40",
    "https://ror.org/03761pf32",
    "https://ror.org/02ek1bx64",
    "https://ror.org/05yptqp13",
    "https://ror.org/017wvtq80",
    "https://ror.org/01bnjbv91",
    "https://ror.org/04276xd64",
    "https://ror.org/03e10x626",
    "https://ror.org/04g99jx54",
    "https://ror.org/02ryfmr77",
    "https://ror.org/017nssj40",
    "https://ror.org/05mknbx32",
    "https://ror.org/0596m7f19",
    "https://ror.org/05mwmd090",
)


def plan_batches(manifest, works_per_batch=_WORKS_PER_BATCH):
    """Compose des lots ~homogènes en nombre de works (PURE, testable sans I/O).

    ``manifest`` : liste de ``(file, num_rows)`` (lue de ``raw/manifest_works.parquet``).
    Renvoie une liste de lots, chaque lot = liste de ``file``. On accumule les fichiers en
    cumulant ``num_rows`` : dès que le cumul du lot courant atteint ``works_per_batch``, on
    clôt le lot. Un fichier seul dépassant le seuil forme son propre lot (jamais scindé —
    un Parquet est l'unité atomique de lecture). L'ordre d'entrée est préservé (déterminisme).
    """
    batches = []
    current, current_rows = [], 0
    for file, num_rows in manifest:
        if current and current_rows + num_rows > works_per_batch:
            batches.append(current)
            current, current_rows = [], 0
        current.append(file)
        current_rows += num_rows
    if current:
        batches.append(current)
    return batches


def _filter_sql(files, ror_list, min_year):
    """SQL DuckDB d'un lot : projection stricte + filtre EUNICoast (≥1 auteur) + année.

    Lit ``files`` en projection colonnaire (``_MART_COLUMNS``), garde un work SSI au moins
    une de ses affiliations (``authorships[].institutions[].ror``) est dans ``ror_list`` ET
    ``publication_year >= min_year``. ``list_transform`` + ``flatten`` extraient tous les ROR
    du work, ``list_has_any`` teste l'intersection avec le référentiel — sans dérouler le
    work en lignes (le filtre reste au grain work, pas d'explosion). ``id`` renommé ``work_id``.
    """
    files_sql = "[" + ", ".join(f"'{f}'" for f in files) + "]"
    ror_sql = "[" + ", ".join(f"'{r}'" for r in ror_list) + "]"
    # `id` → `work_id` (clé du mart) ; les autres colonnes projetées telles quelles.
    projection = ", ".join("id AS work_id" if c == "id" else c for c in _MART_COLUMNS)
    return f"""
        SELECT {projection}
        FROM read_parquet({files_sql})
        WHERE publication_year >= {min_year}
          AND list_has_any(
                {ror_sql},
                flatten(list_transform(
                    authorships,
                    a -> list_transform(a.institutions, i -> i.ror)
                ))
              )
    """


def _dedup_sql(parts_glob):
    """SQL DuckDB de la passe de consolidation : dédup GLOBALE par récence (ADR 0099).

    Lit tous les fragments filtrés d'un run (``parts_glob``) et ne garde qu'UNE ligne par
    ``work_id`` — la plus récente (``updated_date`` décroissante ; ``fwci`` puis
    ``cited_by_count`` départagent à égalité de date, déterminisme ADR 0057). La dédup est
    **globale** (sur l'ensemble du run), PAS intra-lot : un ``work_id`` réédité se répartit
    sur plusieurs partitions ``updated_date`` donc plusieurs lots (jusqu'à ~482 partitions
    dans le lac) — une dédup par lot en laisserait passer. Opère sur ~10⁴–10⁵ works (déjà
    filtrés), jamais sur le lac brut : mémoire négligeable (débordement disque en filet).
    ``updated_date`` reste projetée (mart auto-documenté, invariant vérifiable côté dbt).
    """
    return f"""
        SELECT * EXCLUDE (_rn) FROM (
            SELECT *, row_number() OVER (
                PARTITION BY work_id
                ORDER BY updated_date DESC NULLS LAST,
                         fwci DESC NULLS LAST,
                         cited_by_count DESC NULLS LAST
            ) AS _rn
            FROM read_parquet('{parts_glob}')
        )
        WHERE _rn = 1
    """


def _lineage_io():
    """I/O lineage : lit raw/works (+ manifest), écrit mart_eunicoast (ADR 0105)."""
    inputs = [lineage.raw_dataset("works"), lineage.raw_dataset("manifest_works")]
    outputs = [lineage.mart_dataset(_MART_SUBDIR)]
    return inputs, outputs


def _read_manifest(con, bucket):
    """Lit ``raw/manifest_works.parquet`` → liste ``(file, num_rows)`` (ordre stable)."""
    glob = f"s3://{bucket}/raw/manifest_works.parquet"
    rows = con.sql(f"SELECT file, num_rows FROM read_parquet('{glob}') ORDER BY file").fetchall()
    return [(r[0], int(r[1])) for r in rows]


@asset(
    name="mart_eunicoast",
    group_name="ingestion",
    deps=[AssetKey("raw_snapshot")],
)
def mart_eunicoast() -> MaterializeResult:
    """Filtre le snapshot Parquet OpenAlex au périmètre EUNICoast, par lots (ADR 0105).

    Lit le manifest des footers → compose des lots homogènes → filtre chaque lot (≥1 auteur
    EUNICoast + année ≥ 2016) sous ``run=<run_id>/_parts/`` → **déduplique globalement par
    récence** (ADR 0099) vers ``run=<run_id>/part-00000.parquet``. Mémoire bornée par lot au
    filtrage (jamais les 600M works d'un coup) ; la dédup opère sur les ~10⁵ works filtrés.

    Deux temps SÉPARÉS car la dédup doit être GLOBALE : un ``work_id`` réédité par OpenAlex
    se répartit sur plusieurs lots (une version par partition ``updated_date``) — dédupliquer
    à l'intérieur d'un lot en laisserait passer. Le filtrage par lots (borné en mémoire) écrit
    des fragments intermédiaires sous ``_parts/`` ; la passe de consolidation les relit tous et
    ne garde qu'une ligne par ``work_id`` (la plus récente). ``_parts/`` (sous-dossier à deux
    niveaux) n'est PAS lu par la source dbt (glob ``run=*/*.parquet``, un seul niveau)."""
    target = ceph_target_from_env()
    run_id = str(generate_new_uuid())
    con = lakehouse.connect()

    inputs, outputs = _lineage_io()
    lineage.emit(RunState.START, run_id, "mart_eunicoast", inputs, outputs)

    manifest = _read_manifest(con, target.bucket)
    batches = plan_batches(manifest)

    # Passe 1 — filtrage par lots bornés en mémoire → fragments intermédiaires sous _parts/.
    run_dir = f"s3://{target.bucket}/{_MART_SUBDIR}/run={run_id}"
    parts_dir = f"{run_dir}/_parts"
    filtered_works = 0
    for n, files in enumerate(batches):
        part = f"{parts_dir}/part-{n:05d}.parquet"
        con.execute(
            f"COPY ({_filter_sql(files, _EUNICOAST_ROR, _MIN_YEAR)}) TO '{part}' (FORMAT PARQUET)"
        )
        filtered_works += con.sql(f"SELECT count(*) FROM read_parquet('{part}')").fetchone()[0]

    # Passe 2 — dédup GLOBALE par récence sur l'ensemble des fragments → mart final (un fichier).
    # Court-circuitée si aucun lot : `_parts/` n'existe pas, un COPY dessus lèverait « no files
    # found ». Manifest vide → run idempotent, 0 work, aucun mart écrit (comme l'ancien no-op).
    total_works = 0
    if batches:
        dest = f"{run_dir}/part-00000.parquet"
        con.execute(f"COPY ({_dedup_sql(f'{parts_dir}/*.parquet')}) TO '{dest}' (FORMAT PARQUET)")
        total_works = con.sql(f"SELECT count(*) FROM read_parquet('{dest}')").fetchone()[0]

    lineage.emit(RunState.COMPLETE, run_id, "mart_eunicoast", inputs, outputs)

    return MaterializeResult(
        metadata={
            "eunicoast_works": MetadataValue.int(total_works),
            "duplicates_removed": MetadataValue.int(filtered_works - total_works),
            "batches": MetadataValue.int(len(batches)),
            "source_files": MetadataValue.int(len(manifest)),
            "min_year": MetadataValue.int(_MIN_YEAR),
            "run": MetadataValue.text(run_id),
            "bucket": MetadataValue.text(f"{target.bucket}/{_MART_SUBDIR}"),
        }
    )


def _seed_ror() -> set:
    """ROR du seed dbt (source de vérité) — pour l'anti-drift avec ``_EUNICOAST_ROR``."""
    seed = Path(__file__).resolve().parents[4] / "citation-dbt" / "seeds" / "ref_eunicoast.csv"
    with open(seed, newline="", encoding="utf-8") as fh:
        return {row["ror"] for row in csv.DictReader(fh)}
