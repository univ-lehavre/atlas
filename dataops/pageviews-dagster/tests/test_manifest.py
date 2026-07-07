"""Tests du contrat manifest GLOBAL du mart de prévisions (assets/manifest.py).

Deux niveaux, patron mediawatch/citation (PAS de Docker) :

- Fonctions **pures** (sans I/O) : ``mart_root``, ``latest_run_parts`` (dernier run
  par mois), ``parse_lsjson_entries``, ``parse_hashsum``, ``build_manifest``
  (cross-check + tri déterministe). Portent l'essentiel de la couverture.
- Corps de l'asset (``_build_and_write_manifest`` / ``forecast_manifest``) piloté par
  un **FakeRclone** (subprocess.run mocké : lsjson / hashsum / rcat) + DuckDB count
  mocké (``_FakeCon``) + ``ceph_target_from_env`` mocké. Couvre l'orchestration sans
  S3 réel et prouve les invariants critiques : ``--download`` sur hashsum, ``rcat`` du
  manifest écrit EN DERNIER (sentinelle de complétude, ADR 0029), ``MANIFEST_SCHEMA_VERSION``.

Série MENSUELLE (S=12) : les chemins de part portent une partition ``dt=<YYYY-MM>``.
"""

import json
import subprocess

import pytest
from dagster import Failure, build_asset_context

from pageviews_dagster.assets import manifest as m
from pageviews_dagster.resources import CephTarget

_SUBDIR = m._FORECAST_SUBDIR  # "marts/views_forecast"
_DIGEST = "d" * 64


# ── mart_root : préfixe rclone racine du mart ────────────────────────────────


def test_mart_root_default_subdir() -> None:
    assert m.mart_root("ceph", "pageviews") == "ceph:pageviews/marts/views_forecast"


def test_mart_root_custom_subdir() -> None:
    assert m.mart_root("ceph", "pageviews", "marts/other") == "ceph:pageviews/marts/other"


# ── latest_run_parts : dernier run par mois (immutabilité, ADR 0054/0057) ────


def test_latest_run_parts_keeps_latest_run_per_month() -> None:
    entries = [
        {"Path": "dt=2024-01/run=AAA/part.parquet", "Size": 10, "IsDir": False},
        {"Path": "dt=2024-01/run=BBB/part.parquet", "Size": 20, "IsDir": False},  # plus récent
        {"Path": "dt=2024-02/run=CCC/part.parquet", "Size": 30, "IsDir": False},
        {"Path": "dt=2024-01/run=AAA", "Size": 0, "IsDir": True},  # dossier ignoré
    ]
    kept = m.latest_run_parts(entries)
    # Mois 1 : run BBB gagne (AAA exclu) ; mois 2 : run CCC.
    assert kept == {
        f"{_SUBDIR}/dt=2024-01/run=BBB/part.parquet": 20,
        f"{_SUBDIR}/dt=2024-02/run=CCC/part.parquet": 30,
    }


def test_latest_run_parts_skips_non_parquet_and_dirs() -> None:
    entries = [
        {"Path": "dt=2024-01/run=AAA/part.parquet", "Size": 10, "IsDir": False},
        {"Path": "dt=2024-01/run=AAA/_SUCCESS", "Size": 0, "IsDir": False},  # pas .parquet
        {"Path": "dt=2024-01/run=AAA", "Size": 0, "IsDir": True},  # dossier
    ]
    assert m.latest_run_parts(entries) == {f"{_SUBDIR}/dt=2024-01/run=AAA/part.parquet": 10}


def test_latest_run_parts_multiple_parts_same_run() -> None:
    """Plusieurs parts d'un même run (dernier) sont toutes retenues."""
    entries = [
        {"Path": "dt=2024-03/run=ZZ/part-0.parquet", "Size": 5, "IsDir": False},
        {"Path": "dt=2024-03/run=ZZ/part-1.parquet", "Size": 7, "IsDir": False},
        {"Path": "dt=2024-03/run=YY/part-0.parquet", "Size": 99, "IsDir": False},  # run obsolète
    ]
    assert m.latest_run_parts(entries) == {
        f"{_SUBDIR}/dt=2024-03/run=ZZ/part-0.parquet": 5,
        f"{_SUBDIR}/dt=2024-03/run=ZZ/part-1.parquet": 7,
    }


def test_latest_run_parts_custom_subdir_prefixes_keys() -> None:
    entries = [{"Path": "dt=2024-01/run=AAA/part.parquet", "Size": 10, "IsDir": False}]
    kept = m.latest_run_parts(entries, mart_subdir="marts/other")
    assert kept == {"marts/other/dt=2024-01/run=AAA/part.parquet": 10}


def test_latest_run_parts_empty() -> None:
    assert m.latest_run_parts([]) == {}


# ── parse_lsjson_entries ─────────────────────────────────────────────────────


def test_parse_lsjson_entries_ok() -> None:
    stdout = json.dumps([{"Path": "dt=2024-01/run=A/part.parquet", "Size": 12, "IsDir": False}])
    assert m.parse_lsjson_entries(stdout) == [
        {"Path": "dt=2024-01/run=A/part.parquet", "Size": 12, "IsDir": False}
    ]


def test_parse_lsjson_entries_empty_and_blank() -> None:
    assert m.parse_lsjson_entries("") == []
    assert m.parse_lsjson_entries("   ") == []
    assert m.parse_lsjson_entries("[]") == []


# ── parse_hashsum ────────────────────────────────────────────────────────────


def test_parse_hashsum_prefixes_keys() -> None:
    out = f"{_DIGEST}  dt=2024-01/run=BBB/part.parquet"
    assert m.parse_hashsum(out, prefix=_SUBDIR) == {
        f"{_SUBDIR}/dt=2024-01/run=BBB/part.parquet": _DIGEST
    }


def test_parse_hashsum_no_prefix_and_blank_lines() -> None:
    a = "a" * 64
    b = "b" * 64
    # Lignes vides intercalées (tolérées) : sortie rclone avec retours à la ligne.
    stdout = f"{a}  part.parquet\n\n{b}  part_001.parquet\n"
    assert m.parse_hashsum(stdout) == {"part.parquet": a, "part_001.parquet": b}


def test_parse_hashsum_rejects_malformed_hash() -> None:
    with pytest.raises(Failure, match="hashsum"):
        m.parse_hashsum("not-a-hash  part.parquet")


def test_parse_hashsum_rejects_single_column() -> None:
    with pytest.raises(Failure, match="hashsum"):
        m.parse_hashsum("deadbeef")


# ── build_manifest : cross-check + tri déterministe ──────────────────────────


def test_build_manifest_shape_sorted_and_crosschecked() -> None:
    k1 = f"{_SUBDIR}/dt=2024-02/run=C/part.parquet"
    k2 = f"{_SUBDIR}/dt=2024-01/run=B/part.parquet"
    sizes = {k1: 30, k2: 20}
    shas = {k1: "c" * 64, k2: "b" * 64}
    man = m.build_manifest(sizes, shas, row_count=5, produced_at="2026-01-01T00:00:00+00:00")
    assert man["mart"] == _SUBDIR
    assert man["schema_version"] == m.MANIFEST_SCHEMA_VERSION == 1
    assert man["row_count"] == 5
    assert man["produced_at"] == "2026-01-01T00:00:00+00:00"
    # Parts triées par clé (déterminisme) → mois 1 (k2) avant mois 2 (k1).
    assert [p["key"] for p in man["parts"]] == [k2, k1]
    assert man["parts"][0]["sha256"] == "b" * 64
    assert man["parts"][0]["bytes"] == 20


def test_build_manifest_carries_custom_mart_subdir() -> None:
    key = "marts/other/dt=2024-01/run=r1/part.parquet"
    man = m.build_manifest({key: 10}, {key: "a" * 64}, 2, "t", mart_subdir="marts/other")
    assert man["mart"] == "marts/other"
    assert man["parts"][0]["key"] == key


def test_build_manifest_raises_on_empty() -> None:
    with pytest.raises(Failure, match="Aucune part"):
        m.build_manifest({}, {}, 0, "t")


def test_build_manifest_raises_on_keyset_mismatch() -> None:
    with pytest.raises(Failure, match="Désaccord"):
        m.build_manifest({"a": 1}, {"b": "c" * 64}, 1, "t")


# ── Glue I/O + asset complet (rclone + DuckDB mockés) ────────────────────────

_PART = "dt=2024-01/run=BBB/part.parquet"


def _completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(
        args=args, returncode=returncode, stdout=stdout, stderr=stderr
    )


class _FakeRclone:
    """Mock de subprocess.run pour rclone : lsjson -R / hashsum -R / rcat."""

    def __init__(self, lsjson=None, hashsum=None) -> None:
        self.calls: list[list[str]] = []
        self.rcat_payloads: list[str] = []
        self._lsjson = (
            lsjson
            if lsjson is not None
            else json.dumps([{"Path": _PART, "Size": 128, "IsDir": False}])
        )
        self._hashsum = hashsum if hashsum is not None else f"{_DIGEST}  {_PART}\n"

    def __call__(self, cmd, **kwargs):
        self.calls.append(cmd)
        if "lsjson" in cmd:
            return _completed(cmd, stdout=self._lsjson)
        if "hashsum" in cmd:
            return _completed(cmd, stdout=self._hashsum)
        if "rcat" in cmd:
            self.rcat_payloads.append(kwargs.get("input", ""))
            return _completed(cmd)
        return _completed(cmd)


class _FakeCon:
    """Connexion DuckDB factice : ``con.sql(...).fetchone()[0]`` → nombre de lignes."""

    def __init__(self, row_count=3) -> None:
        self._row_count = row_count
        self.queries: list[str] = []

    def sql(self, query):
        self.queries.append(query)
        return self

    def fetchone(self):
        return (self._row_count,)


def _patch(monkeypatch, fake, con):
    """Câble les frontières I/O : ceph target, subprocess.run, lakehouse.connect, lineage no-op."""
    monkeypatch.setattr(
        m,
        "ceph_target_from_env",
        lambda: CephTarget("AK", "SK", "http://seaweedfs:8333", "pageviews"),
    )
    monkeypatch.setattr(subprocess, "run", fake)
    monkeypatch.setattr(m.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(m.lineage, "emit", lambda *a, **k: None)


# ── _count_rows (frontière DuckDB) ───────────────────────────────────────────


def test_count_rows_empty_is_zero() -> None:
    # Aucune part retenue → 0 (pas d'appel DuckDB).
    assert m._count_rows("pageviews", []) == 0


def test_count_rows_delegates_to_duckdb(monkeypatch) -> None:
    con = _FakeCon(row_count=42)
    monkeypatch.setattr(m.lakehouse, "connect", lambda cfg=None: con)
    keys = [f"{_SUBDIR}/dt=2024-02/run=A/part.parquet", f"{_SUBDIR}/dt=2024-01/run=A/part.parquet"]
    assert m._count_rows("pageviews", keys) == 42
    # Prédicat anti-ligne-fantôme embarqué + clés triées (déterminisme).
    q = con.queries[0]
    assert "WHERE NOT (COLUMNS(*) IS NULL)" in q
    assert q.index("dt=2024-01") < q.index("dt=2024-02")
    assert "s3://pageviews/" in q


# ── _hashsum (frontière rclone) ──────────────────────────────────────────────


def test_hashsum_uses_download_flag(monkeypatch) -> None:
    fake = _FakeRclone()
    monkeypatch.setattr(subprocess, "run", fake)
    from pathlib import Path

    result = m._hashsum("ceph:pageviews/marts/views_forecast", Path("/tmp/c"))
    assert result == {f"{_SUBDIR}/{_PART}": _DIGEST}
    # Invariant : --download obligatoire (S3 n'expose pas de sha256 côté serveur).
    call = fake.calls[0]
    assert "--download" in call and "*.parquet" in call


def test_hashsum_failure_raises(monkeypatch) -> None:
    def boom(cmd, **kwargs):
        return _completed(cmd, returncode=1, stderr="nope")

    monkeypatch.setattr(subprocess, "run", boom)
    from pathlib import Path

    with pytest.raises(Failure, match="hashsum"):
        m._hashsum("ceph:pageviews/marts/views_forecast", Path("/tmp/c"))


# ── _write_manifest_last (frontière rclone rcat) ─────────────────────────────


def test_write_manifest_last_rcat_failure_raises(monkeypatch) -> None:
    def boom(cmd, **kwargs):
        return _completed(cmd, returncode=1, stderr="denied")

    monkeypatch.setattr(subprocess, "run", boom)
    from pathlib import Path

    with pytest.raises(Failure, match="rcat"):
        m._write_manifest_last("ceph:pageviews/marts/views_forecast", "{}", Path("/tmp/c"))


# ── Asset complet : forecast_manifest (bout-en-bout mocké) ───────────────────


def test_forecast_manifest_writes_global_contract(monkeypatch) -> None:
    fake = _FakeRclone()
    con = _FakeCon(row_count=3)
    _patch(monkeypatch, fake, con)

    result = m.forecast_manifest(build_asset_context())

    # Un seul manifest écrit, JSON compact.
    assert len(fake.rcat_payloads) == 1
    written = json.loads(fake.rcat_payloads[0])
    assert written["schema_version"] == m.MANIFEST_SCHEMA_VERSION
    assert written["mart"] == _SUBDIR
    assert written["row_count"] == 3
    assert written["parts"][0]["key"] == f"{_SUBDIR}/{_PART}"
    assert written["parts"][0]["sha256"] == _DIGEST
    assert written["parts"][0]["bytes"] == 128

    # Métadonnées de matérialisation.
    assert result.metadata["row_count"].value == 3
    assert result.metadata["parts"].value == 1
    assert result.metadata["schema_version"].value == m.MANIFEST_SCHEMA_VERSION
    assert result.metadata["mart"].text == _SUBDIR


def test_forecast_manifest_invariants_download_and_rcat_last(monkeypatch) -> None:
    fake = _FakeRclone()
    con = _FakeCon(row_count=3)
    _patch(monkeypatch, fake, con)

    m.forecast_manifest(build_asset_context())

    # Invariant 1 : hashsum appelé AVEC --download (sinon « hash type not supported »).
    hashsum_calls = [c for c in fake.calls if "hashsum" in c]
    assert hashsum_calls and "--download" in hashsum_calls[0]
    assert "--include" in hashsum_calls[0] and "*.parquet" in hashsum_calls[0]

    # Invariant 2 (atomicité) : le rcat du manifest est la DERNIÈRE commande rclone.
    assert "rcat" in fake.calls[-1]
    assert fake.calls[-1][-1].endswith("/manifest.json")
    # Le payload JSON est compact (séparateurs sans espace).
    assert " " not in fake.rcat_payloads[0]


def test_forecast_manifest_compact_json_written_last(monkeypatch) -> None:
    """Sur mart multi-mois, chaque part retenue figure dans le manifest, triée par clé."""
    ls = json.dumps(
        [
            {"Path": "dt=2024-02/run=B/part.parquet", "Size": 30, "IsDir": False},
            {"Path": "dt=2024-01/run=A/part.parquet", "Size": 20, "IsDir": False},
        ]
    )
    hs = f"{'b' * 64}  dt=2024-02/run=B/part.parquet\n{'a' * 64}  dt=2024-01/run=A/part.parquet\n"
    fake = _FakeRclone(lsjson=ls, hashsum=hs)
    con = _FakeCon(row_count=7)
    _patch(monkeypatch, fake, con)

    m.forecast_manifest(build_asset_context())
    written = json.loads(fake.rcat_payloads[0])
    assert [p["key"] for p in written["parts"]] == [
        f"{_SUBDIR}/dt=2024-01/run=A/part.parquet",
        f"{_SUBDIR}/dt=2024-02/run=B/part.parquet",
    ]
    assert written["row_count"] == 7


def test_forecast_manifest_lsjson_failure_raises(monkeypatch) -> None:
    class _Boom(_FakeRclone):
        def __call__(self, cmd, **kwargs):
            self.calls.append(cmd)
            if "lsjson" in cmd:
                return _completed(cmd, returncode=1, stderr="boom")
            return super().__call__(cmd, **kwargs)

    fake = _Boom()
    con = _FakeCon()
    _patch(monkeypatch, fake, con)
    with pytest.raises(Failure, match="lsjson"):
        m.forecast_manifest(build_asset_context())
    # Aucun manifest écrit (échec avant la sentinelle).
    assert fake.rcat_payloads == []


def test_forecast_manifest_fails_on_empty_mart(monkeypatch) -> None:
    fake = _FakeRclone(lsjson="[]", hashsum="")
    con = _FakeCon(row_count=0)
    _patch(monkeypatch, fake, con)
    with pytest.raises(Failure, match="Aucune part"):
        m.forecast_manifest(build_asset_context())
    # Pas de sentinelle de complétude sur un mart vide.
    assert fake.rcat_payloads == []
