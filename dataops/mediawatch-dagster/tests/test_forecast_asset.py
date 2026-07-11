"""Tests de l'asset forecast_university_timeline (câblage : lecture → décision → écriture).

La logique ML pure est testée dans test_forecast_model. Ici on valide l'orchestration de
l'asset — porte de décision (prédictif vs repli descriptif), métadonnées, écriture — avec
lakehouse + MLflow + lineage mockés (hermétique, sans S3 ni serveur MLflow).
"""

import datetime as dt
import json
import subprocess

import numpy as np
from dagster import build_asset_context

from mediawatch_dagster.assets import forecast as mod

_BASE = dt.date(2024, 1, 1)

# lsjson factice : un seul (dt, run) suffit pour que _read_timeline retienne un run et lise
# la timeline mockée par _FakeCon (qui ignore le WHERE (dt, run) IN …). ModTime présent pour
# que la sélection par récence (ADR 0101) fonctionne.
_FAKE_LSJSON = json.dumps(
    [
        {
            "Path": "dt=2024-01/run=R0/part.parquet",
            "Size": 1,
            "IsDir": False,
            "ModTime": "2024-01-05T12:00:00Z",
        }
    ]
)


def _fake_rclone_lsjson(args, config_path):
    return subprocess.CompletedProcess(args, 0, stdout=_FAKE_LSJSON, stderr="")


class _FakeRel:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeCon:
    """Connexion DuckDB factice : sert la timeline pour la requête de lecture, capte les
    écritures (CREATE/INSERT/COPY). ``executemany`` mémorise les lignes insérées."""

    def __init__(self, timeline_rows):
        self._timeline = timeline_rows
        self.queries: list[str] = []
        self.inserted: list = []

    def sql(self, query: str):
        self.queries.append(query)
        if "read_parquet" in query:  # la requête de lecture du mart timeline
            return _FakeRel(self._timeline)
        return _FakeRel([])

    def executemany(self, query: str, rows):
        self.inserted.extend(rows)
        return self


def _seasonal_timeline(uid, n_days, level=20.0, amp=8.0, noise=1.0, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n_days):
        d = _BASE + dt.timedelta(days=i)
        n = max(0, int(level + amp * np.sin(2 * np.pi * d.weekday() / 7) + rng.normal(0, noise)))
        rows.append((uid, d, n))  # (university_id, event_date, n_articles)
    return rows


def _patch(monkeypatch, con):
    from mediawatch_dagster.resources import CephTarget

    monkeypatch.setattr(
        mod,
        "ceph_target_from_env",
        lambda env=None: CephTarget("AK", "SK", "http://h:8333", "mediawatch"),
    )
    monkeypatch.setattr(mod.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(mod.lineage, "emit", lambda *a, **k: None)
    # MLflow no-op (pas de serveur en test).
    monkeypatch.setattr(mod.tracking, "mlflow_config_from_env", lambda env=None: None)
    # _read_timeline liste le mart via rclone (ADR 0101) : lsjson factice + config no-op.
    monkeypatch.setattr(mod, "_run_rclone", _fake_rclone_lsjson)
    monkeypatch.setattr(mod, "render_rclone_config", lambda target: "")


def _ctx():
    return build_asset_context(partition_key="2024-06-01")


def test_asset_serves_predictive_on_seasonal_signal(monkeypatch):
    # Signal saisonnier réel → la porte confirme le pouvoir → mode prédictif, prévisions
    # servies (n_univ × 3 horizons), écriture COPY effectuée.
    con = _FakeCon(_seasonal_timeline("ror-A", 300, seed=7))
    _patch(monkeypatch, con)
    result = mod.forecast_university_timeline(_ctx())
    assert result.metadata["served_mode"].text == "predictive"
    assert result.metadata["r2_honest"].value > 0.2
    assert result.metadata["n_predictions"].value == 3  # 1 université × 3 horizons
    assert any("COPY" in q for q in con.queries)
    assert len(con.inserted) == 3


def test_asset_falls_back_descriptive_on_noise(monkeypatch):
    # Bruit i.i.d. → pas de pouvoir prédictif honnête → repli descriptif (baseline servie).
    rng = np.random.default_rng(1)
    rows = [("ror-A", _BASE + dt.timedelta(days=i), int(rng.integers(0, 100))) for i in range(300)]
    con = _FakeCon(rows)
    _patch(monkeypatch, con)
    result = mod.forecast_university_timeline(_ctx())
    assert result.metadata["served_mode"].text == "descriptive"


def test_asset_handles_short_history_without_crash(monkeypatch):
    # Banc (peu de jours) → backtest impossible → repli descriptif, sans crash, COPY écrit.
    con = _FakeCon(_seasonal_timeline("ror-A", 20, seed=0))
    _patch(monkeypatch, con)
    result = mod.forecast_university_timeline(_ctx())
    assert result.metadata["served_mode"].text == "descriptive"
    assert any("COPY" in q for q in con.queries)
