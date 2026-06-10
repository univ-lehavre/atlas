"""Tests de l'asset de sync incrémental ``raw_snapshot`` (rclone mocké)."""

import subprocess

import pytest
from dagster import Failure, build_asset_context

from citation_dagster.assets.raw_snapshot import RawSnapshotConfig, raw_snapshot

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rgw.local",
    "BUCKET_NAME": "atlas-datalake-x",
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
        if "lsf" in cmd:  # fichiers .gz d'une partition
            return _completed(cmd, stdout="part_000.gz\npart_001.gz")
        # copy
        return _completed(cmd, returncode=self.copy_returncode, stderr="boom")


@pytest.fixture
def env(monkeypatch):
    for k, v in _ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
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


def test_watermark_advances_after_success(env):
    """Le watermark est réécrit à la date de la partition la plus récente synchronisée."""
    fake = FakeRclone(watermark_json='{"works": "2020-01-01"}')
    _run(env, fake, max_partitions=10)
    assert fake.rcat_payloads, "le watermark doit être réécrit"
    assert "2026-03-30" in fake.rcat_payloads[-1]


def test_watermark_not_advanced_on_copy_failure(env):
    """Si un rclone copy échoue, le watermark n'est PAS réécrit (idempotence/reprise)."""
    fake = FakeRclone(watermark_json='{"works": "2020-01-01"}', copy_returncode=1)
    with pytest.raises(Failure, match="rclone copy a échoué"):
        _run(env, fake, max_partitions=1)
    assert fake.rcat_payloads == [], "le watermark ne doit pas avancer sur échec"


def test_idempotent_when_nothing_new(env):
    """Watermark à la dernière partition → aucune partition postérieure, aucune copie."""
    fake = FakeRclone(watermark_json='{"works": "2026-03-30"}')
    result = _run(env, fake, max_partitions=10)
    assert result.metadata["total_files"].value == 0
    assert [c for c in fake.calls if "copy" in c] == []
    assert fake.rcat_payloads == [], "rien de neuf → watermark inchangé"


def test_merged_ids_synced_to_raw_never_applied(env):
    """merged_ids rapatriés vers raw/merged_ids/<entity>, jamais appliqués (pas de mutation)."""
    fake = FakeRclone(watermark_json="")
    _run(env, fake, max_partitions=1, max_merged_files=5)
    merged_copies = [c for c in fake.calls if "copy" in c and "merged_ids" in c[-1]]
    assert len(merged_copies) == 1
    assert merged_copies[0][-1] == "ceph:atlas-datalake-x/raw/merged_ids/works"


def test_explicit_partition_ignores_watermark(env):
    """Une partition explicite cible cette partition et n'écrit pas le watermark."""
    fake = FakeRclone(watermark_json='{"works": "2026-03-30"}')
    result = _run(env, fake, partition="updated_date=2016-06-24")
    assert result.metadata["total_files"].value == 2  # 1 partition × 2 fichiers
    assert fake.rcat_payloads == [], "mode ciblé → watermark non touché"
    # la cible utilise la partition explicite
    copy = next(c for c in fake.calls if "copy" in c and "merged_ids" not in c[-1])
    assert copy[-1] == "ceph:atlas-datalake-x/raw/works/updated_date=2016-06-24"
