"""Tests de l'asset ``forecast_views`` (câblage : lecture → décision → écriture).

La logique ML pure (porte prédictif/descriptif, backtest honnête) est testée dans
``test_forecast_model`` ; ici on valide l'ORCHESTRATION de l'asset — normalisation du
``month``, lecture de la timeline, écriture COPY, métadonnées ``MaterializeResult`` — avec
lakehouse + MLflow + lineage mockés (hermétique : sans S3 ni serveur MLflow), calqué sur
``mediawatch_dagster.tests.test_forecast_asset`` (ADR 0081).

Série MENSUELLE à saisonnalité ANNUELLE (S=12) : ``MIN_HISTORY = 12`` mois ET le backtest
à 4 plis imposent un historique long. Les timelines de test fournissent ~60 mois (≫ 40)
pour que la porte de décision puisse s'exercer. ``month`` en 1er du mois consécutif.
"""

import datetime as dt
import json
import subprocess
from pathlib import Path

import numpy as np
from dagster import build_asset_context

from pageviews_dagster.assets import forecast as mod

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


_BASE = dt.date(2019, 1, 1)


def _month_index(d: dt.date) -> int:
    return d.year * 12 + (d.month - 1)


def _month_from_index(idx: int) -> dt.date:
    return dt.date(idx // 12, idx % 12 + 1, 1)


class _FakeRel:
    """Relation DuckDB factice : seul ``fetchall`` est consommé par ``_read_timeline``."""

    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeCon:
    """Connexion DuckDB factice : sert la timeline pour la requête de lecture (``read_parquet``),
    capte les écritures (CREATE/COPY via ``sql``, INSERT via ``executemany``). La MÊME instance
    est renvoyée par ``lakehouse.connect`` (lecture ET écriture partagent la connexion mockée)."""

    def __init__(self, timeline_rows):
        self._timeline = timeline_rows
        self.queries: list[str] = []
        self.inserted: list = []

    def sql(self, query: str):
        self.queries.append(query)
        if "read_parquet" in query:  # requête de lecture du mart timeline
            return _FakeRel(self._timeline)
        return _FakeRel([])

    def executemany(self, query: str, rows):
        self.inserted.extend(rows)
        return self


def _seasonal_timeline(uid, n_months, level=1000.0, amp=400.0, noise=20.0, seed=0):
    """~n_months mois d'un signal saisonnier ANNUEL net (mois AAAAMM en chaîne, chemin
    ``_month_to_date`` du parsing texte). Motif que la porte reconnaît comme prédictif."""
    rng = np.random.default_rng(seed)
    start = _month_index(_BASE)
    rows = []
    for i in range(n_months):
        d = _month_from_index(start + i)
        n = max(0, int(level + amp * np.sin(2 * np.pi * d.month / 12) + rng.normal(0, noise)))
        rows.append((uid, f"{d.year:04d}{d.month:02d}", n))  # (university_id, month AAAAMM, views)
    return rows


def _noise_timeline(uid, n_months, seed=99):
    """~n_months mois de bruit i.i.d. (aucune structure temporelle) → contrôle négatif."""
    rng = np.random.default_rng(seed)
    start = _month_index(_BASE)
    return [
        (
            uid,
            f"{_month_from_index(start + i).year:04d}{_month_from_index(start + i).month:02d}",
            int(rng.integers(0, 2000)),
        )
        for i in range(n_months)
    ]


def _patch(monkeypatch, con):
    """Mocke toute la glue I/O : cible Ceph factice, ``lakehouse.connect`` → même ``con``,
    lineage no-op, MLflow no-op (pas de serveur en test)."""
    from pageviews_dagster.resources import CephTarget

    monkeypatch.setattr(
        mod,
        "ceph_target_from_env",
        lambda env=None: CephTarget("AK", "SK", "http://h:8333", "pageviews"),
    )
    monkeypatch.setattr(mod.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(mod.lineage, "emit", lambda *a, **k: None)
    monkeypatch.setattr(mod.tracking, "mlflow_config_from_env", lambda env=None: None)
    # _read_timeline liste le mart via rclone (ADR 0101) : lsjson factice + config no-op.
    monkeypatch.setattr(mod, "_run_rclone", _fake_rclone_lsjson)
    monkeypatch.setattr(mod, "render_rclone_config", lambda target: "")


def _ctx():
    return build_asset_context()


# ── _month_to_date : normalisation du curseur mensuel ────────────────────────


def test_month_to_date_parses_yyyymm_string():
    assert mod._month_to_date("202403") == dt.date(2024, 3, 1)


def test_month_to_date_parses_iso_truncated_string():
    # AAAA-MM et AAAA-MM-JJ → on garde année/mois, réduit au 1er du mois.
    assert mod._month_to_date("2024-03") == dt.date(2024, 3, 1)
    assert mod._month_to_date("2024-03-17") == dt.date(2024, 3, 1)


def test_month_to_date_normalizes_date_to_first_of_month():
    assert mod._month_to_date(dt.date(2024, 3, 17)) == dt.date(2024, 3, 1)


def test_month_to_date_normalizes_datetime_to_first_of_month():
    assert mod._month_to_date(dt.datetime(2024, 3, 17, 9, 30)) == dt.date(2024, 3, 1)


def test_month_to_date_handles_slash_separator():
    # Un curseur ``AAAA/MM`` (slash retiré) tombe sur le chemin AAAAMM.
    assert mod._month_to_date("2024/03") == dt.date(2024, 3, 1)


# ── _read_timeline : lecture + normalisation des lignes ──────────────────────


def test_read_timeline_normalizes_and_casts_rows(monkeypatch):
    monkeypatch.setattr(mod, "_run_rclone", _fake_rclone_lsjson)
    rows = [("ror-A", "202401", 1200), ("ror-A", dt.date(2024, 2, 15), 1350)]
    con = _FakeCon(rows)
    out = mod._read_timeline(con, "pageviews", Path("/tmp/rclone.conf"))
    assert out == [
        ("ror-A", dt.date(2024, 1, 1), 1200),
        ("ror-A", dt.date(2024, 2, 1), 1350),
    ]
    # La requête de lecture cible bien le mart timeline via read_parquet/hive_partitioning
    # et restreint aux (dt, run) retenus par récence (ADR 0101).
    assert any("read_parquet" in q and "views_timeline" in q for q in con.queries)
    assert any("(dt, run) IN (VALUES" in q for q in con.queries)


def test_read_timeline_casts_uid_to_str_and_views_to_int(monkeypatch):
    monkeypatch.setattr(mod, "_run_rclone", _fake_rclone_lsjson)
    con = _FakeCon([(42, "202401", 1200.0)])
    (uid, month, views) = mod._read_timeline(con, "pageviews", Path("/tmp/rclone.conf"))[0]
    assert uid == "42" and isinstance(uid, str)
    assert views == 1200 and isinstance(views, int)
    assert month == dt.date(2024, 1, 1)


# ── _write_forecast : écriture Parquet immuable ──────────────────────────────


def test_write_forecast_inserts_rows_and_copies(monkeypatch):
    con = _FakeCon([])
    monkeypatch.setattr(mod.lakehouse, "connect", lambda cfg=None: con)
    served = [
        {
            "university_id": "ror-A",
            "horizon_label": "month_1",
            "window_start": dt.date(2024, 2, 1),
            "window_end": dt.date(2024, 2, 1),
            "views_pred": 1200.0,
            "served_mode": "predictive",
        }
    ]
    mod._write_forecast(served, "pageviews", "2024-07-01", "run-xyz")
    assert len(con.inserted) == 1
    assert con.inserted[0] == (
        "ror-A",
        "month_1",
        dt.date(2024, 2, 1),
        dt.date(2024, 2, 1),
        1200.0,
        "predictive",
    )
    # Chemin immuable dt=<jour>/run=<id> et écriture COPY effectuée.
    assert any("COPY" in q and "dt=2024-07-01/run=run-xyz" in q for q in con.queries)


def test_write_forecast_empty_writes_schema_only(monkeypatch):
    con = _FakeCon([])
    monkeypatch.setattr(mod.lakehouse, "connect", lambda cfg=None: con)
    mod._write_forecast([], "pageviews", "2024-07-01", "run-empty")
    # Aucune ligne insérée, mais CREATE + COPY (schéma seul) émis sans crash.
    assert con.inserted == []
    assert any("CREATE OR REPLACE TABLE preds" in q for q in con.queries)
    assert any("COPY" in q for q in con.queries)


# ── forecast_views : orchestration bout-en-bout (mockée) ─────────────────────


def test_asset_serves_predictive_on_seasonal_signal(monkeypatch):
    # Signal saisonnier annuel réel sur ~60 mois → la porte confirme le pouvoir → mode
    # prédictif, prévisions servies (1 univ × 3 horizons), écriture COPY effectuée.
    con = _FakeCon(_seasonal_timeline("ror-A", 60, seed=7))
    _patch(monkeypatch, con)
    result = mod.forecast_views(_ctx())
    assert result.metadata["served_mode"].text == "predictive"
    assert result.metadata["n_predictions"].value == 3  # 1 université × 3 horizons
    assert result.metadata["n_universities"].value == 1
    assert result.metadata["r2_honest"].value > 0.0
    assert "prédictif" in result.metadata["decision"].text
    assert any("COPY" in q for q in con.queries)
    assert len(con.inserted) == 3


def test_asset_falls_back_descriptive_on_noise(monkeypatch):
    # Bruit i.i.d. sur ~60 mois → pas de pouvoir prédictif honnête → repli descriptif
    # (baseline saisonnière servie), COPY écrit quand même.
    con = _FakeCon(_noise_timeline("ror-A", 60, seed=1))
    _patch(monkeypatch, con)
    result = mod.forecast_views(_ctx())
    assert result.metadata["served_mode"].text == "descriptive"
    assert "descriptif" in result.metadata["decision"].text
    assert result.metadata["n_predictions"].value == 3
    assert any("COPY" in q for q in con.queries)


def test_asset_handles_short_history_without_crash(monkeypatch):
    # Historique trop court (< MIN_HISTORY + plis) → backtest impossible → repli descriptif,
    # sans crash, COPY écrit.
    con = _FakeCon(_seasonal_timeline("ror-A", 10, seed=0))
    _patch(monkeypatch, con)
    result = mod.forecast_views(_ctx())
    assert result.metadata["served_mode"].text == "descriptive"
    assert any("COPY" in q for q in con.queries)


def test_asset_multi_university_metadata(monkeypatch):
    # Deux établissements → n_universities = 2, n_predictions = 2 × 3 horizons.
    rows = _seasonal_timeline("ror-A", 60, seed=7) + _seasonal_timeline("ror-B", 60, seed=11)
    con = _FakeCon(rows)
    _patch(monkeypatch, con)
    result = mod.forecast_views(_ctx())
    assert result.metadata["n_universities"].value == 2
    assert result.metadata["n_predictions"].value == 6


def test_asset_logs_run_with_served_mode_and_metrics(monkeypatch):
    # tracking.log_run est appelé best-effort avec le served_mode et les métriques honnêtes.
    con = _FakeCon(_seasonal_timeline("ror-A", 60, seed=7))
    _patch(monkeypatch, con)
    captured = {}

    def _capture(**kwargs):
        captured.update(kwargs)
        return None

    monkeypatch.setattr(mod.tracking, "log_run", _capture)
    result = mod.forecast_views(_ctx())
    assert captured["experiment"] == mod.tracking.EXPERIMENT_FORECAST
    assert captured["params"]["served_mode"] == result.metadata["served_mode"].text
    assert captured["metrics"]["n_predictions"] == 3.0
    assert captured["metrics"]["predictive"] == 1.0


def test_asset_emits_lineage_start_and_complete(monkeypatch):
    # Le lineage encadre le run : un START puis un COMPLETE (mêmes datasets in/out).
    con = _FakeCon(_seasonal_timeline("ror-A", 60, seed=7))
    _patch(monkeypatch, con)
    states = []
    monkeypatch.setattr(mod.lineage, "emit", lambda state, *a, **k: states.append(state))
    mod.forecast_views(_ctx())
    from openlineage.client.event_v2 import RunState

    assert states == [RunState.START, RunState.COMPLETE]
