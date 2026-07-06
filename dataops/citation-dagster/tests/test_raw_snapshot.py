"""Tests de l'asset de sync incrémental ``raw_snapshot`` (rclone mocké)."""

import subprocess
import sys

import pytest
from dagster import Failure, build_asset_context

from citation_dagster.assets.raw_snapshot import RawSnapshotConfig, raw_snapshot

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rgw.local",
    "BUCKET_NAME": "citation-datalake-x",
}

# Partitions retournées par `lsf --dirs-only` (triées = chronologiques).
_PARTITIONS = [
    "updated_date=2019-07-01/",
    "updated_date=2020-01-01/",
    "updated_date=2021-06-15/",
    "updated_date=2026-03-30/",
]


def _completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(
        args=args, returncode=returncode, stdout=stdout, stderr=stderr
    )


class FakeRclone:
    """Mock paramétrable de ``subprocess.run`` pour rclone.

    Distingue les sous-commandes : ``cat`` (watermark), ``rcat`` (écriture),
    ``lsf --dirs-only`` (partitions), ``lsf *.csv.gz`` (merged_ids),
    ``lsf *.gz`` (fichiers d'une partition), ``copy``.
    """

    def __init__(self, watermark_json="", copy_returncode=0):
        self.calls: list[list[str]] = []
        self.watermark_json = watermark_json  # contenu renvoyé par `cat`
        self.rcat_payloads: list[str] = []  # contenus écrits par `rcat`
        self.copy_returncode = copy_returncode

    def __call__(self, cmd, **kwargs):
        self.calls.append(cmd)
        if "cat" in cmd and "rcat" not in cmd:
            return _completed(cmd, stdout=self.watermark_json)
        if "rcat" in cmd:
            self.rcat_payloads.append(kwargs.get("input", ""))
            return _completed(cmd)
        if "lsf" in cmd and "--dirs-only" in cmd:
            return _completed(cmd, stdout="\n".join(_PARTITIONS))
        if "lsf" in cmd and any("csv.gz" in a for a in cmd):
            return _completed(cmd, stdout="2024-01-05.csv.gz\n2026-03-29.csv.gz")
        if "lsf" in cmd:  # fichiers .parquet d'une partition
            return _completed(cmd, stdout="part_000.parquet\npart_001.parquet")
        # copy
        return _completed(cmd, returncode=self.copy_returncode, stderr="boom")


# Le module est ombré dans le namespace `assets` par l'asset homonyme (assets/__init__
# ré-exporte `raw_snapshot`) : on récupère le VRAI module via sys.modules pour patcher.
_RS_MODULE = sys.modules["citation_dagster.assets.raw_snapshot"]


@pytest.fixture
def env(monkeypatch):
    for k, v in _ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
    # Le manifest des footers touche un vrai S3 (lakehouse.connect) : neutralisé par défaut
    # dans les tests rclone-mockés (pas de bucket). Un test dédié valide son câblage.
    monkeypatch.setattr(_RS_MODULE, "_write_works_manifest", lambda bucket: 0)
    return monkeypatch


def _run(monkeypatch, fake, **config):
    monkeypatch.setattr(subprocess, "run", fake)
    return raw_snapshot(build_asset_context(), RawSnapshotConfig(entities=["works"], **config))


def test_bootstrap_syncs_oldest_partitions_bounded(env):
    """Sans watermark (bootstrap), traite les premières partitions, bornées par max_partitions."""
    fake = FakeRclone(watermark_json="")  # cat vide → pas de watermark
    result = _run(env, fake, max_partitions=2)
    # 2 partitions × 2 fichiers = 4
    assert result.metadata["total_files"].value == 4
    copies = [c for c in fake.calls if "copy" in c and "merged_ids" not in c[-1]]
    assert len(copies) == 2  # 2 partitions


def test_incremental_filters_after_watermark(env):
    """Avec watermark à 2020-01-01, ne traite que les partitions postérieures."""
    fake = FakeRclone(watermark_json='{"works": "2020-01-01"}')
    result = _run(env, fake, max_partitions=10)
    # postérieures à 2020-01-01 : 2021-06-15 et 2026-03-30 → 2 partitions × 2 = 4
    assert result.metadata["total_files"].value == 4


def test_unbounded_defaults_sync_all_partitions_and_files(env):
    """DÉFAUT PROD : sans bornage (max_partitions=0, sample_size=0 = illimité), traite TOUTES
    les partitions candidates et TOUS les fichiers de chaque partition (pas de troncature)."""
    fake = FakeRclone(watermark_json="")  # bootstrap, pas de watermark
    # Défauts de RawSnapshotConfig = 0 (illimité) : on ne passe explicitement rien.
    result = _run(env, fake)
    # 4 partitions candidates × 2 fichiers listés = 8 (aucune troncature).
    assert result.metadata["total_files"].value == 8
    copies = [c for c in fake.calls if "copy" in c and "merged_ids" not in c[-1]]
    assert len(copies) == 4  # les 4 partitions


def test_sample_size_zero_copies_all_files_of_partition(env):
    """sample_size=0 (illimité) copie tous les .gz listés ; une petite valeur borne (banc)."""
    fake = FakeRclone(watermark_json='{"works": "2021-06-15"}')  # 1 partition postérieure
    result = _run(env, fake, sample_size=0)  # illimité
    assert result.metadata["total_files"].value == 2  # les 2 fichiers listés
    fake_bounded = FakeRclone(watermark_json='{"works": "2021-06-15"}')
    result_bounded = _run(env, fake_bounded, sample_size=1)  # borné banc
    assert result_bounded.metadata["total_files"].value == 1  # tronqué à 1


def test_watermark_advances_after_success(env):
    """Le watermark partition est réécrit à la date de la partition la plus récente."""
    fake = FakeRclone(watermark_json='{"works": "2020-01-01"}')
    _run(env, fake, max_partitions=10)
    assert fake.rcat_payloads, "le watermark doit être réécrit"
    # Le watermark partition (works) avance à la plus récente synchronisée.
    assert any('"works": "2026-03-30"' in p for p in fake.rcat_payloads)


def test_watermark_not_advanced_on_copy_failure(env):
    """Si un rclone copy échoue, le watermark n'est PAS réécrit (idempotence/reprise)."""
    fake = FakeRclone(watermark_json='{"works": "2020-01-01"}', copy_returncode=1)
    with pytest.raises(Failure, match="rclone copy a échoué"):
        _run(env, fake, max_partitions=1)
    assert fake.rcat_payloads == [], "le watermark ne doit pas avancer sur échec"


def test_idempotent_when_nothing_new(env):
    """Watermarks aux dernières dates (partition ET merged_ids) → aucune copie, aucune écriture."""
    # merged_ids du mock vont jusqu'à 2026-03-29 ; partitions jusqu'à 2026-03-30.
    fake = FakeRclone(watermark_json='{"works": "2026-03-30", "merged_ids:works": "2026-03-29"}')
    result = _run(env, fake, max_partitions=10)
    assert result.metadata["total_files"].value == 0
    assert [c for c in fake.calls if "copy" in c] == []
    assert fake.rcat_payloads == [], "rien de neuf → aucun watermark réécrit"


def test_merged_ids_synced_to_raw_never_applied(env):
    """merged_ids rapatriés vers raw/merged_ids/<entity>, jamais appliqués (pas de mutation)."""
    fake = FakeRclone(watermark_json="")
    _run(env, fake, max_partitions=1, max_merged_files=5)
    merged_copies = [c for c in fake.calls if "copy" in c and "merged_ids" in c[-1]]
    assert len(merged_copies) == 1
    assert merged_copies[0][-1] == "ceph:citation-datalake-x/raw/merged_ids/works"


def test_explicit_partition_ignores_watermark(env):
    """Une partition explicite cible cette partition et n'écrit pas le watermark."""
    fake = FakeRclone(watermark_json='{"works": "2026-03-30"}')
    result = _run(env, fake, partition="updated_date=2016-06-24")
    assert result.metadata["total_files"].value == 2  # 1 partition × 2 fichiers
    assert fake.rcat_payloads == [], "mode ciblé → watermark non touché"
    # la cible utilise la partition explicite
    copy = next(c for c in fake.calls if "copy" in c and "merged_ids" not in c[-1])
    assert copy[-1] == "ceph:citation-datalake-x/raw/works/updated_date=2016-06-24"


def test_merged_watermark_independent_no_silent_loss(env):
    """FIX (revue 2.2) : le watermark merged_ids n'avance qu'aux fichiers réellement copiés.

    Scénario de perte : une nouvelle partition (watermark partition → 2026-03-30) ET des
    merged_ids frais à date intermédiaire (2024-01-05, 2026-03-29), tronqués par
    ``max_merged_files=1``. Le watermark merged_ids doit avancer à **2024-01-05** (le seul
    copié), surtout PAS à 2026-03-29 ni à la date de partition — sinon 2026-03-29 serait
    « antérieur » au prochain run et perdu à jamais.
    """
    fake = FakeRclone(watermark_json="")  # bootstrap : rien de connu
    _run(env, fake, max_partitions=1, max_merged_files=1)
    # Le mock merged_ids renvoie 2024-01-05 et 2026-03-29 ; un seul copié (max_merged_files=1).
    merged_payloads = [p for p in fake.rcat_payloads if "merged_ids:works" in p]
    assert merged_payloads, "le watermark merged_ids doit être écrit"
    last = merged_payloads[-1]
    assert '"merged_ids:works": "2024-01-05"' in last, "n'avance qu'au fichier copié"
    assert "2026-03-29" not in last, "ne dépasse JAMAIS le dernier fichier copié (anti-perte)"


# ── Manifest des footers (ADR 0105) ──────────────────────────────────────────


def test_manifest_written_after_works_sync(env, monkeypatch):
    """Après le sync works, ``_write_works_manifest`` est appelé et son compte remonté."""
    called = {}

    def fake_manifest(bucket):
        called["bucket"] = bucket
        return 7

    monkeypatch.setattr(_RS_MODULE, "_write_works_manifest", fake_manifest)
    fake = FakeRclone(watermark_json="")
    result = _run(env, fake, max_partitions=1)
    assert called["bucket"] == "citation-datalake-x"
    assert result.metadata["manifest_files"].value == 7


def test_manifest_skipped_when_works_not_ingested(env, monkeypatch):
    """Sans « works » dans entities, aucun manifest (le manifest est propre aux works)."""

    def _boom(bucket):
        raise AssertionError("ne doit pas être appelé sans works")

    monkeypatch.setattr(_RS_MODULE, "_write_works_manifest", _boom)
    fake = FakeRclone(watermark_json="")
    monkeypatch.setattr(subprocess, "run", fake)
    result = raw_snapshot(
        build_asset_context(),
        RawSnapshotConfig(entities=["authors"], max_partitions=1),
    )
    assert result.metadata["manifest_files"].value == 0
