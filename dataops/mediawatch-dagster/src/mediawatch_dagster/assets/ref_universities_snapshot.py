"""Asset d'ingestion du RÉFÉRENTIEL d'universités (ADR 0065).

Télécharge un **dump ouvert** d'organisations de recherche (accès libre, licence
domaine public), en extrait les universités (type ``education``, schema v2) et écrit
le référentiel projeté en JSONL gzippé sous ``ref/universities/`` du lakehouse. Le
projet dbt (``stg_ref_universities``) lit ce référentiel ingéré : la classification
devient **autonome** dès le déploiement (plus besoin d'un référentiel hors dépôt).

À la différence de ``raw_gkg`` (flux 15 minutes partitionné), le référentiel évolue
**lentement** : pas de partition temporelle ni de cadence serrée. On matérialise un
**instantané courant** unique (``ref/universities/current/``), rematérialisable
ponctuellement (mensuel) quand une nouvelle version du dump paraît.

L'URL du dump est **configurable** : le code permet de charger un référentiel, il
n'impose ni source ni URL (neutralité ADR 0035 ; « ROR » n'apparaît qu'en prose). Le
déployeur fournit l'URL du fichier ``.zip`` de la dernière version (résolue depuis le
registre ouvert), via la config de l'asset.

NB : pas de ``from __future__ import annotations`` — Dagster introspecte à l'exécution.
"""

import gzip
import io
import json
import subprocess
import tempfile
import zipfile
from dataclasses import asdict
from pathlib import Path

from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import Dataset, RunState

from mediawatch_dagster import lineage, ror
from mediawatch_dagster.http_fetch import RateLimitError, RetryPolicy, ThrottledClient
from mediawatch_dagster.resources import CephTarget, ceph_target_from_env, render_rclone_config
from mediawatch_dagster.ror import University

_HTTP_TIMEOUT = 300.0  # le dump pèse des dizaines de Mo
_REF_DEST = "ref/universities/current/universities.jsonl.gz"
# Nom du membre v2 dans l'archive (les releases v2.x n'embarquent que le schema v2).
_SCHEMA_V2_SUFFIX = "_schema_v2.json"


class RefUniversitiesConfig(Config):
    """Paramètres d'ingestion du référentiel."""

    dump_url: str = ""
    """URL du ``.zip`` du dump d'organisations (dernière version résolue par le déployeur).

    Vide par défaut : le code n'impose AUCUNE source (neutralité ADR 0035). Sans URL,
    l'asset échoue explicitement — c'est au déployeur de fournir le référentiel choisi.
    """


def _select_dump_member(names: list[str]) -> str:
    """Choisit le fichier JSON schema v2 de l'archive (fallback : 1er ``*.json``)."""
    v2 = [n for n in names if n.endswith(_SCHEMA_V2_SUFFIX)]
    if v2:
        return sorted(v2)[0]
    jsons = [n for n in names if n.endswith(".json")]
    if not jsons:
        raise Failure(description="Archive du dump sans fichier .json")
    return sorted(jsons)[0]


def _download_and_project(dump_url: str) -> list[University]:
    """Télécharge le dump ``.zip``, sélectionne le JSON v2 et projette les universités."""
    if not dump_url:
        raise Failure(
            description="Aucune URL de dump fournie (config dump_url) : le déployeur "
            "doit pointer le référentiel choisi (ADR 0065)."
        )
    # Une seule requête (gros fichier), mais throttlée + retry/backoff sur 429/5xx :
    # le registre du référentiel peut aussi limiter le débit (ADR 0064).
    client = ThrottledClient(RetryPolicy(timeout_s=_HTTP_TIMEOUT))
    try:
        content = client.get_bytes(dump_url)
    except RateLimitError as exc:
        raise Failure(
            description=f"Téléchargement du dump référentiel échoué : {dump_url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            member = _select_dump_member(archive.namelist())
            records = json.loads(archive.read(member).decode("utf-8"))
    except (zipfile.BadZipFile, json.JSONDecodeError, KeyError) as exc:
        raise Failure(
            description="Dump référentiel illisible (zip/json invalide)",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    return ror.project_dump(records)


def _write_referential(
    universities: list[University], target: CephTarget, config_path: Path
) -> None:
    """Écrit le référentiel projeté en JSONL gzippé déterministe sur le lakehouse."""
    payload = "\n".join(json.dumps(asdict(u), sort_keys=True) for u in universities)
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="wb", mtime=0) as gz:
        gz.write(payload.encode("utf-8"))
    dest = f"ceph:{target.bucket}/{_REF_DEST}"
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", dest],
        input=buffer.getvalue(),
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise Failure(
            description=f"Écriture du référentiel échouée : {dest}",
            metadata={"stderr": MetadataValue.text(result.stderr.decode()[-500:])},
        )


@asset(name="ref_universities_snapshot", group_name="ingestion")
def ref_universities_snapshot(context, config: RefUniversitiesConfig) -> MaterializeResult:
    """Ingère le référentiel d'universités (dump ouvert → ``ref/universities/current``)."""
    target = ceph_target_from_env()
    run_id = context.run_id
    universities = _download_and_project(config.dump_url)

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))
        lineage.emit(
            RunState.START,
            run_id,
            "ref_universities_snapshot",
            [Dataset(namespace=lineage.SOURCE_NAMESPACE, name="ref/universities")],
            [],
        )
        _write_referential(universities, target, config_path)
        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "ref_universities_snapshot",
            [Dataset(namespace=lineage.SOURCE_NAMESPACE, name="ref/universities")],
            [Dataset(namespace=lineage.NAMESPACE, name="ref/universities")],
        )

    return MaterializeResult(
        metadata={
            "universities": MetadataValue.int(len(universities)),
            "bucket": MetadataValue.text(f"{target.bucket}/{_REF_DEST}"),
        }
    )
