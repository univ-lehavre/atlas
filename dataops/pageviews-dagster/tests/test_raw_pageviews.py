"""Tests de l'asset raw_pageviews et de ses corps PURS d'arithmétique/agrégation.

L'ingestion collecte les VUES MENSUELLES Wikipédia par établissement : arithmétique de
calendrier (fenêtre de mois à collecter, décalage ``AAAAMM``), projection des réponses
d'API (Pageviews REST, MediaWiki redirects) et agrégation ``(university_id, month, views)``
sont **pures** (aucune I/O) → testées directement sur des payloads synthétiques.

Stratégie (patron mediawatch/ref_universities, sans Docker) : la glue I/O est isolée
derrière un ``_Fetcher`` injectable (client HTTP throttlé), ``lakehouse`` (connexion +
lecture/écriture DuckDB) et ``subprocess`` (watermark rclone). On remplace le ``_Fetcher``
du module par un fake qui DISPATCHE sur l'URL, ``lakehouse.connect``/``read_parquet``/
``copy_to_parquet`` par des fakes, ``ceph_target_from_env``/``render_rclone_config`` par
des stubs, ``subprocess.run`` par un fake mémorisant les commandes rclone et ``date`` par
une date figée → hermétique (zéro réseau, zéro S3, zéro binaire rclone).

RAPPEL série MENSUELLE : ``month`` au format ``AAAAMM`` (string). Les fenêtres de test
restent petites (la logique de bornage est indépendante de la longueur d'historique).
"""

import sys
from datetime import date

import httpx
import pytest
from dagster import Failure, MaterializeResult, build_asset_context

from pageviews_dagster.assets.raw_pageviews import (
    MonthlyViews,
    RawPageviewsConfig,
    WikiTitle,
    _fetch_article_views,
    _fetch_title_views,
    _Fetcher,
    _month_add,
    _resolve_redirects,
    _shift_month,
    aggregate_views,
    last_complete_month,
    months_to_collect,
    parse_pageviews_response,
    parse_redirects_response,
    raw_pageviews,
)

# Module réel patché (idiome partagé avec ref_universities/mediawatch) : les noms importés
# dans le namespace du module (``ceph_target_from_env``, ``render_rclone_config``, ``date``,
# ``_Fetcher``) se patchent ICI ; ``lakehouse``/``lineage``/``subprocess`` sont des modules.
_MODULE = sys.modules["pageviews_dagster.assets.raw_pageviews"]

# Sous-chaînes d'URL des deux API (miroir des constantes privées) — le fake fetcher dispatche
# dessus sans se coupler aux paramètres exacts.
_PAGEVIEWS = "/metrics/pageviews/per-article"
_MEDIAWIKI = "/w/api.php"


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — arithmétique de calendrier (_shift_month, _month_add, last_complete_month)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("year", "month", "delta", "expected"),
    [
        (2024, 6, 0, (2024, 6)),  # delta nul : identité
        (2024, 6, 1, (2024, 7)),  # +1 dans l'année
        (2024, 12, 1, (2025, 1)),  # franchit décembre → janvier suivant
        (2024, 1, -1, (2023, 12)),  # recule sous janvier → décembre précédent
        (2024, 6, 12, (2025, 6)),  # +12 = même mois, année +1
        (2024, 6, -18, (2022, 12)),  # recul multi-annuel
    ],
)
def test_shift_month_calendar_arithmetic(year, month, delta, expected):
    assert _shift_month(year, month, delta) == expected


@pytest.mark.parametrize(
    ("month", "delta", "expected"),
    [
        ("202406", 1, "202407"),
        ("202412", 1, "202501"),  # bascule d'année ascendante
        ("202401", -1, "202312"),  # bascule d'année descendante
        ("202406", 0, "202406"),
        ("202406", -12, "202306"),  # recul d'un an, même mois
    ],
)
def test_month_add_roundtrips_yyyymm(month, delta, expected):
    assert _month_add(month, delta) == expected


@pytest.mark.parametrize(
    ("today", "expected"),
    [
        (date(2024, 6, 15), "202405"),  # mois courant exclu → mois précédent
        (date(2024, 1, 1), "202312"),  # janvier → décembre de l'année précédente
        (date(2024, 12, 31), "202411"),  # décembre → novembre
    ],
)
def test_last_complete_month_excludes_current(today, expected):
    # Le mois courant est PARTIEL : on ne retient que le dernier mois révolu.
    assert last_complete_month(today) == expected


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — months_to_collect (fenêtre incrémentale / bootstrap)
# ─────────────────────────────────────────────────────────────────────────────


def test_months_to_collect_incremental_starts_after_watermark():
    # Watermark posé : on part du mois SUIVANT et on comble jusqu'à until (chronologique).
    assert months_to_collect("202401", "202404", max_months=0) == [
        "202402",
        "202403",
        "202404",
    ]


def test_months_to_collect_incremental_up_to_date_returns_empty():
    # until <= watermark : déjà à jour au dernier mois complet → rien à collecter.
    assert months_to_collect("202404", "202404", max_months=0) == []
    assert months_to_collect("202405", "202404", max_months=0) == []


def test_months_to_collect_incremental_truncates_oldest_when_bounded():
    # max_months borne : on remonte le retard par le DÉBUT (les plus anciens d'abord).
    assert months_to_collect("202401", "202406", max_months=2) == ["202402", "202403"]


def test_months_to_collect_bootstrap_uses_max_months_window():
    # after=None (premier run) + borne : fenêtre des N mois les plus RÉCENTS jusqu'à until.
    assert months_to_collect(None, "202406", max_months=3) == [
        "202404",
        "202405",
        "202406",
    ]


def test_months_to_collect_bootstrap_unbounded_uses_default_depth():
    # after=None + illimité : profondeur de bootstrap par défaut (36 mois), fenêtre récente.
    out = months_to_collect(None, "202412", max_months=0)
    assert len(out) == 36
    assert out[-1] == "202412"
    assert out[0] == "202201"  # 202412 - 35 mois
    assert out == sorted(out)  # tri chronologique (== lexicographique sur AAAAMM)


def test_months_to_collect_crossing_year_boundary_is_contiguous():
    # Fenêtre franchissant une fin d'année : mois contigus, sans trou ni doublon.
    out = months_to_collect("202311", "202402", max_months=0)
    assert out == ["202312", "202401", "202402"]


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — aggregate_views (somme par établissement, filtre fenêtre, tri)
# ─────────────────────────────────────────────────────────────────────────────


def test_aggregate_views_sums_multiple_titles_per_university():
    # Deux lignes de référentiel visent le même établissement (2 langues) → sommées par mois.
    titles = [
        WikiTitle("uni-A", "en", "Harvard University"),
        WikiTitle("uni-A", "fr", "Université Harvard"),
    ]
    fetched = {
        ("en", "Harvard University"): [MonthlyViews("202401", 100), MonthlyViews("202402", 200)],
        ("fr", "Université Harvard"): [MonthlyViews("202401", 30)],
    }
    out = aggregate_views(titles, fetched, {"202401", "202402"})
    assert out == [
        {"university_id": "uni-A", "month": "202401", "views": 130},  # 100 + 30
        {"university_id": "uni-A", "month": "202402", "views": 200},
    ]


def test_aggregate_views_filters_months_outside_window():
    # Un mois hors ``wanted_months`` est ignoré (fenêtre incrémentale).
    titles = [WikiTitle("uni-A", "en", "Foo")]
    fetched = {("en", "Foo"): [MonthlyViews("202401", 10), MonthlyViews("202312", 999)]}
    out = aggregate_views(titles, fetched, {"202401"})
    assert out == [{"university_id": "uni-A", "month": "202401", "views": 10}]


def test_aggregate_views_omits_zero_totals():
    # Pas de zéro fabriqué : un (university_id, month) sans vue positive est OMIS.
    titles = [WikiTitle("uni-A", "en", "Foo")]
    fetched = {("en", "Foo"): [MonthlyViews("202401", 0)]}
    assert aggregate_views(titles, fetched, {"202401"}) == []


def test_aggregate_views_sorted_by_university_then_month():
    # Sortie déterministe triée (university_id, month) — entrée désordonnée (ADR 0057).
    titles = [WikiTitle("uni-B", "en", "B"), WikiTitle("uni-A", "en", "A")]
    fetched = {
        ("en", "B"): [MonthlyViews("202402", 5), MonthlyViews("202401", 5)],
        ("en", "A"): [MonthlyViews("202401", 5)],
    }
    out = aggregate_views(titles, fetched, {"202401", "202402"})
    assert [(r["university_id"], r["month"]) for r in out] == [
        ("uni-A", "202401"),
        ("uni-B", "202401"),
        ("uni-B", "202402"),
    ]


def test_aggregate_views_ignores_titles_without_fetched_series():
    # Un titre absent de ``fetched`` (aucune donnée récupérée) n'ajoute rien.
    titles = [WikiTitle("uni-A", "en", "Missing")]
    assert aggregate_views(titles, {}, {"202401"}) == []


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — parse_pageviews_response (projection API REST → MonthlyViews)
# ─────────────────────────────────────────────────────────────────────────────


def test_parse_pageviews_response_projects_monthly_grain():
    # timestamp AAAAMM0100 → on ne garde que AAAAMM ; item hors fenêtre filtré.
    payload = {
        "items": [
            {"timestamp": "2024010100", "views": 1200},
            {"timestamp": "2024020100", "views": 1350},
            {"timestamp": "2023120100", "views": 999},  # hors wanted
        ]
    }
    out = parse_pageviews_response(payload, {"202401", "202402"})
    assert out == [MonthlyViews("202401", 1200), MonthlyViews("202402", 1350)]


def test_parse_pageviews_response_defensive_on_malformed_items():
    # Défensif : item sans views, views non numérique, timestamp trop court → ignorés.
    payload = {
        "items": [
            {"timestamp": "2024010100"},  # pas de views
            {"timestamp": "2024010100", "views": None},  # views None
            {"timestamp": "2024010100", "views": "nan"},  # views str
            {"timestamp": "24", "views": 5},  # timestamp < 6 caractères
            {"timestamp": "2024010100", "views": 42.0},  # float valide → int
        ]
    }
    assert parse_pageviews_response(payload, {"202401"}) == [MonthlyViews("202401", 42)]


def test_parse_pageviews_response_empty_payload():
    # Réponse sans clé items (API renvoyant un mois vide) → série vide, pas d'erreur.
    assert parse_pageviews_response({}, {"202401"}) == []


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — parse_redirects_response (extraction titres de redirection)
# ─────────────────────────────────────────────────────────────────────────────


def test_parse_redirects_response_extracts_and_dedups_sorted():
    payload = {
        "query": {
            "pages": {
                "12345": {
                    "redirects": [
                        {"title": "Harvard"},
                        {"title": "Harvard Univ."},
                        {"title": "Harvard"},  # doublon → dédupliqué
                    ]
                }
            }
        }
    }
    assert parse_redirects_response(payload) == ["Harvard", "Harvard Univ."]


def test_parse_redirects_response_empty_when_no_redirects():
    # Page sans redirection ou structure absente → [] (défensif).
    assert parse_redirects_response({}) == []
    assert parse_redirects_response({"query": {"pages": {"1": {}}}}) == []


def test_parse_redirects_response_skips_non_string_titles():
    # Titre absent/None dans une entrée de redirection → ignoré sans crash.
    payload = {"query": {"pages": {"1": {"redirects": [{"title": None}, {"title": "Ok"}]}}}}
    assert parse_redirects_response(payload) == ["Ok"]


# ─────────────────────────────────────────────────────────────────────────────
#  Glue HTTP — _Fetcher (throttle/retry/backoff) avec get/sleep/monotonic injectés
# ─────────────────────────────────────────────────────────────────────────────


class _Resp:
    """Réponse HTTP factice (interface minimale consommée par ``_Fetcher.get_json``)."""

    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("boom", request=None, response=None)


def _cfg(**kw):
    # Throttle nul + peu de tentatives : aucune attente réelle (le sleep est injecté no-op).
    base = {"min_interval_s": 0.0, "max_attempts": 3, "include_redirects": True, "max_months": 0}
    base.update(kw)
    return RawPageviewsConfig(**base)


def test_fetcher_returns_json_on_success():
    calls = []

    def fake_get(url, **kwargs):
        calls.append(url)
        return _Resp(200, {"ok": True})

    fetcher = _Fetcher(_cfg(), get=fake_get, sleep=lambda _s: None, monotonic=lambda: 0.0)
    assert fetcher.get_json("http://x") == {"ok": True}
    assert calls == ["http://x"]


def test_fetcher_returns_empty_dict_on_404():
    # 404 = article/mois absent → série vide, PAS une erreur.
    fetcher = _Fetcher(
        _cfg(), get=lambda url, **k: _Resp(404), sleep=lambda _s: None, monotonic=lambda: 0.0
    )
    assert fetcher.get_json("http://x") == {}


def test_fetcher_retries_on_5xx_then_succeeds():
    # Premier appel 503 (retryable) → backoff (sleep injecté) → second appel OK.
    responses = [_Resp(503), _Resp(200, {"ok": 1})]
    slept = []
    fetcher = _Fetcher(
        _cfg(max_attempts=3),
        get=lambda url, **k: responses.pop(0),
        sleep=lambda s: slept.append(s),
        monotonic=lambda: 0.0,
    )
    assert fetcher.get_json("http://x") == {"ok": 1}
    assert len(slept) == 1  # un backoff entre les deux tentatives


def test_fetcher_raises_failure_after_exhausting_retries():
    # Toutes les tentatives en 500 (retryable) → Failure explicite après épuisement.
    fetcher = _Fetcher(
        _cfg(max_attempts=2),
        get=lambda url, **k: _Resp(500),
        sleep=lambda _s: None,
        monotonic=lambda: 0.0,
    )
    with pytest.raises(Failure, match="Échec HTTP"):
        fetcher.get_json("http://x")


def test_fetcher_retries_on_transport_error_then_raises():
    # Erreur réseau transitoire répétée → propagée après la dernière tentative.
    def boom(url, **kwargs):
        raise httpx.ConnectError("dns")

    fetcher = _Fetcher(_cfg(max_attempts=2), get=boom, sleep=lambda _s: None, monotonic=lambda: 0.0)
    with pytest.raises(httpx.TransportError):
        fetcher.get_json("http://x")


def test_fetcher_raises_for_status_on_non_retryable_4xx():
    # 400 non retryable → raise_for_status remonte l'erreur HTTP immédiatement.
    fetcher = _Fetcher(
        _cfg(), get=lambda url, **k: _Resp(400), sleep=lambda _s: None, monotonic=lambda: 0.0
    )
    with pytest.raises(httpx.HTTPStatusError):
        fetcher.get_json("http://x")


def test_fetcher_throttles_between_requests():
    # min_interval_s > 0 et monotonic figé : le second appel attend l'intervalle complet.
    slept = []
    fetcher = _Fetcher(
        _cfg(min_interval_s=0.5),
        get=lambda url, **k: _Resp(200, {}),
        sleep=lambda s: slept.append(s),
        monotonic=lambda: 10.0,  # horloge figée → wait == min_interval_s au 2e appel
    )
    fetcher.get_json("http://a")  # premier appel : pas d'attente (last_at None)
    fetcher.get_json("http://b")  # second : wait = 0.5 - 0 = 0.5
    assert slept == [0.5]


# ─────────────────────────────────────────────────────────────────────────────
#  Glue HTTP — _resolve_redirects / _fetch_article_views / _fetch_title_views (fetcher fake)
# ─────────────────────────────────────────────────────────────────────────────


class _FakeFetcher:
    """Fetcher factice : DISPATCHE sur l'URL (Pageviews REST vs MediaWiki redirects).

    - Pageviews : rend un payload ``items`` selon ``views_by_article`` (indexé par article,
      espaces → underscores dans l'URL), un mois donné pour chaque valeur.
    - MediaWiki : rend les redirections de ``redirects`` (liste de titres) pour le titre.
    Enregistre les URLs appelées (``calls``).
    """

    def __init__(self, views_by_article=None, redirects=None):
        self._views = views_by_article or {}
        self._redirects = redirects or []
        self.calls: list[str] = []

    def get_json(self, url, params=None):
        self.calls.append(url)
        if _MEDIAWIKI in url:
            return {
                "query": {"pages": {"1": {"redirects": [{"title": t} for t in self._redirects]}}}
            }
        if _PAGEVIEWS in url:
            for article, items in self._views.items():
                if article.replace(" ", "_") in url:
                    return {
                        "items": [{"timestamp": f"{m}0100", "views": v} for m, v in items.items()]
                    }
            return {}
        raise AssertionError(f"URL inattendue : {url}")


def test_resolve_redirects_reads_mediawiki_titles():
    fetcher = _FakeFetcher(redirects=["Harvard", "Harvard Univ."])
    out = _resolve_redirects(fetcher, WikiTitle("uni-A", "en", "Harvard University"))
    assert out == ["Harvard", "Harvard Univ."]
    assert any(_MEDIAWIKI in u for u in fetcher.calls)


def test_fetch_article_views_projects_window():
    fetcher = _FakeFetcher(views_by_article={"Harvard University": {"202401": 100, "202402": 200}})
    out = _fetch_article_views(
        fetcher, "en", "Harvard University", "202401", "202402", {"202401", "202402"}
    )
    assert out == [MonthlyViews("202401", 100), MonthlyViews("202402", 200)]
    # L'URL encode les espaces en underscores (contrat API REST).
    assert any("Harvard_University" in u for u in fetcher.calls)


def test_fetch_title_views_merges_canonical_and_redirects():
    # Titre canonique + une redirection : leurs vues sont SOMMÉES mois par mois.
    fetcher = _FakeFetcher(
        views_by_article={
            "Harvard University": {"202401": 100},
            "Harvard": {"202401": 40, "202402": 10},
        },
        redirects=["Harvard"],
    )
    out = _fetch_title_views(
        fetcher, WikiTitle("uni-A", "en", "Harvard University"), ["202401", "202402"], True
    )
    assert out == [MonthlyViews("202401", 140), MonthlyViews("202402", 10)]


def test_fetch_title_views_skips_redirects_when_disabled():
    # include_redirects=False : seul le titre canonique est interrogé (pas d'appel MediaWiki).
    fetcher = _FakeFetcher(
        views_by_article={"Harvard University": {"202401": 100}, "Harvard": {"202401": 999}},
        redirects=["Harvard"],
    )
    out = _fetch_title_views(
        fetcher, WikiTitle("uni-A", "en", "Harvard University"), ["202401"], False
    )
    assert out == [MonthlyViews("202401", 100)]  # redirection ignorée
    assert not any(_MEDIAWIKI in u for u in fetcher.calls)  # aucune résolution redirect


# ─────────────────────────────────────────────────────────────────────────────
#  Glue S3 — _read_referential via _FakeCon (DuckDB), watermark via subprocess fake
# ─────────────────────────────────────────────────────────────────────────────


class _FakeRel:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class _FakeCon:
    """Connexion DuckDB factice : sert le référentiel en lecture, capte les COPY d'écriture."""

    def __init__(self, ref_rows=None):
        self._ref_rows = ref_rows or []
        self.queries: list[str] = []
        self.copies: list[tuple] = []

    def execute(self, query, *args, **kwargs):
        self.queries.append(query)
        return _FakeRel(self._ref_rows)


def _patch_read_parquet(monkeypatch):
    # read_parquet délègue au con factice (glob S3 jamais résolu).
    monkeypatch.setattr(
        _MODULE.lakehouse, "read_parquet", lambda c, glob, hive=True: c.execute(glob)
    )


def test_read_referential_maps_rows_to_wiki_titles(monkeypatch):
    con = _FakeCon(ref_rows=[("uni-A", "en", "Harvard University"), ("uni-B", "fr", "Sorbonne")])
    _patch_read_parquet(monkeypatch)
    titles = _MODULE._read_referential(con, "pageviews", "seed")
    assert titles == [
        WikiTitle("uni-A", "en", "Harvard University"),
        WikiTitle("uni-B", "fr", "Sorbonne"),
    ]


def test_read_referential_empty_when_no_rows(monkeypatch):
    con = _FakeCon(ref_rows=[])
    _patch_read_parquet(monkeypatch)
    assert _MODULE._read_referential(con, "pageviews", "seed") == []


# ── Watermark : lecture/écriture via subprocess.run mocké ──


class _FakeProc:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


def test_read_watermark_returns_month_for_key(monkeypatch, tmp_path):
    # rclone cat renvoie un JSON watermark : on extrait le mois de la clé demandée.
    def fake_run(cmd, **kwargs):
        return _FakeProc(returncode=0, stdout='{"seed": "202403", "ingested": "202401"}')

    monkeypatch.setattr(_MODULE.subprocess, "run", fake_run)
    assert _MODULE._read_watermark("pageviews", "seed", tmp_path / "rclone.conf") == "202403"


def _patch_run(monkeypatch, fn):
    monkeypatch.setattr(_MODULE.subprocess, "run", fn)


def test_read_watermark_none_when_absent_or_error(monkeypatch, tmp_path):
    # rclone échoue (fichier absent) OU JSON illisible OU clé manquante → None (premier run).
    _patch_run(monkeypatch, lambda cmd, **k: _FakeProc(returncode=1, stdout=""))
    assert _MODULE._read_watermark("pageviews", "seed", tmp_path / "c") is None

    _patch_run(monkeypatch, lambda cmd, **k: _FakeProc(0, stdout="not json"))
    assert _MODULE._read_watermark("pageviews", "seed", tmp_path / "c") is None

    _patch_run(monkeypatch, lambda cmd, **k: _FakeProc(0, stdout='{"x": "1"}'))
    assert _MODULE._read_watermark("pageviews", "seed", tmp_path / "c") is None


def test_read_watermark_strips_bom(monkeypatch, tmp_path):
    # rclone peut préfixer un BOM UTF-8 : il doit être retiré avant le parse JSON.
    monkeypatch.setattr(
        _MODULE.subprocess, "run", lambda cmd, **k: _FakeProc(0, stdout='﻿{"seed": "202405"}')
    )
    assert _MODULE._read_watermark("pageviews", "seed", tmp_path / "c") == "202405"


def test_write_watermark_read_modify_writes_merged_json(monkeypatch, tmp_path):
    # Read-modify-write : préserve les autres clés, met à jour la clé ciblée.
    written = {}

    def fake_run(cmd, **kwargs):
        if "cat" in cmd:
            return _FakeProc(0, stdout='{"ingested": "202401"}')
        if "rcat" in cmd:
            written["payload"] = kwargs.get("input")
            return _FakeProc(0)
        return _FakeProc(0)

    monkeypatch.setattr(_MODULE.subprocess, "run", fake_run)
    _MODULE._write_watermark("pageviews", "seed", "202406", tmp_path / "c")
    import json

    data = json.loads(written["payload"])
    assert data == {"ingested": "202401", "seed": "202406"}  # fusion, pas d'écrasement


def test_write_watermark_recovers_from_corrupt_existing_json(monkeypatch, tmp_path):
    # cat renvoie du JSON illisible (fichier corrompu) : on repart d'un dict vide, sans crash.
    written = {}

    def fake_run(cmd, **kwargs):
        if "cat" in cmd:
            return _FakeProc(0, stdout="}{ not json")
        if "rcat" in cmd:
            written["payload"] = kwargs.get("input")
            return _FakeProc(0)
        return _FakeProc(0)

    monkeypatch.setattr(_MODULE.subprocess, "run", fake_run)
    _MODULE._write_watermark("pageviews", "seed", "202406", tmp_path / "c")
    import json

    assert json.loads(written["payload"]) == {"seed": "202406"}  # dict neuf, clé posée


def test_write_watermark_raises_on_rcat_failure(monkeypatch, tmp_path):
    def fake_run(cmd, **kwargs):
        if "rcat" in cmd:
            return _FakeProc(returncode=1, stderr="disk full")
        return _FakeProc(0, stdout="{}")

    monkeypatch.setattr(_MODULE.subprocess, "run", fake_run)
    with pytest.raises(Failure, match="watermark"):
        _MODULE._write_watermark("pageviews", "seed", "202406", tmp_path / "c")


# ── Écriture brute _write_raw (SQL VALUES + copy_to_parquet mocké) ──


def test_write_raw_builds_partitioned_copy(monkeypatch):
    captured = {}

    def fake_copy(con, select_sql, dest, partition_by=None):
        captured["select"] = select_sql
        captured["dest"] = dest
        captured["partition_by"] = partition_by

    monkeypatch.setattr(_MODULE.lakehouse, "copy_to_parquet", fake_copy)
    rows = [
        {"university_id": "uni-A", "month": "202401", "views": 100},
        {"university_id": "uni-B", "month": "202402", "views": 5},
    ]
    _MODULE._write_raw(_FakeCon(), rows, "pageviews", "run-123")
    assert captured["partition_by"] == ["dt"]
    assert captured["dest"] == "s3://pageviews/raw/pageviews/run=run-123"
    # month porté deux fois (colonne month + dt dérivé pour le partitionnement Hive).
    assert "'202401', 100, '202401'" in captured["select"]
    assert "t(university_id, month, views, dt)" in captured["select"]


def test_write_raw_escapes_single_quotes(monkeypatch):
    # _sql_str échappe le guillemet simple (défense en profondeur, jamais de contenu brut).
    captured = {}
    monkeypatch.setattr(
        _MODULE.lakehouse,
        "copy_to_parquet",
        lambda c, sql, d, partition_by=None: captured.update(sql=sql),
    )
    rows = [{"university_id": "a'b", "month": "202401", "views": 1}]
    _MODULE._write_raw(_FakeCon(), rows, "b", "r")
    assert "'a''b'" in captured["sql"]


# ─────────────────────────────────────────────────────────────────────────────
#  Asset raw_pageviews — chaîne complète via monkeypatch (fetcher + lakehouse + watermark)
# ─────────────────────────────────────────────────────────────────────────────


def _stub_target():
    from pageviews_dagster.resources import CephTarget

    return CephTarget("AK", "SK", "http://h:8333", "pageviews")


def _patch_glue(monkeypatch, *, con, fetcher, watermark=None, ref_source="seed"):
    """Isole toute la glue I/O de l'asset (cible Ceph, rclone.conf, fetcher, lakehouse,
    lineage, watermark subprocess, date figée)."""
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: _stub_target())
    monkeypatch.setattr(_MODULE, "render_rclone_config", lambda target: "[ceph]\n")
    monkeypatch.setattr(_MODULE, "_Fetcher", lambda *a, **k: fetcher)
    # date.today() figée → until déterministe (mois complet = 202405).
    monkeypatch.setattr(_MODULE, "date", _FrozenDate)
    monkeypatch.setenv("PAGEVIEWS_REF_SOURCE", ref_source)

    monkeypatch.setattr(_MODULE.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(
        _MODULE.lakehouse, "read_parquet", lambda c, glob, hive=True: _FakeRel(con._ref_rows)
    )
    monkeypatch.setattr(_MODULE.lakehouse, "copy_to_parquet", lambda *a, **k: con.copies.append(a))
    monkeypatch.setattr(_MODULE.lineage, "emit", lambda *a, **k: None)

    # Watermark : cat renvoie le JSON figé, rcat réussit (mémorisé).
    writes = []

    def fake_run(cmd, **kwargs):
        if "rcat" in cmd:
            writes.append(kwargs.get("input"))
            return _FakeProc(0)
        payload = "" if watermark is None else f'{{"{ref_source}": "{watermark}"}}'
        return _FakeProc(0, stdout=payload)

    monkeypatch.setattr(_MODULE.subprocess, "run", fake_run)
    return writes


class _FrozenDate(date):
    @classmethod
    def today(cls):
        return date(2024, 6, 15)  # → last_complete_month == 202405


def _ctx():
    return build_asset_context()


def test_asset_collects_aggregates_and_writes(monkeypatch):
    # Chaîne complète bootstrap borné : 1 établissement, 2 mois collectés, écriture + watermark.
    con = _FakeCon(ref_rows=[("uni-A", "en", "Harvard University")])
    fetcher = _FakeFetcher(
        views_by_article={"Harvard University": {"202404": 100, "202405": 200}},
        redirects=[],
    )
    writes = _patch_glue(monkeypatch, con=con, fetcher=fetcher, watermark=None)

    result = raw_pageviews(_ctx(), _cfg(max_months=2))

    assert isinstance(result, MaterializeResult)
    assert result.metadata["n_series"].value == 1
    assert result.metadata["n_obs"].value == 2
    assert result.metadata["n_months"].value == 2
    assert result.metadata["ref_source"].text == "seed"
    # Écriture Parquet effectuée + watermark avancé au dernier mois écrit (202405).
    assert len(con.copies) == 1
    assert result.metadata["watermark"].text == "202405"
    import json

    assert json.loads(writes[-1])["seed"] == "202405"


def test_asset_incremental_collects_only_after_watermark(monkeypatch):
    # Watermark posé à 202403 : seuls 202404 et 202405 sont collectés (until figé = 202405).
    con = _FakeCon(ref_rows=[("uni-A", "en", "Harvard University")])
    fetcher = _FakeFetcher(views_by_article={"Harvard University": {"202404": 10, "202405": 20}})
    _patch_glue(monkeypatch, con=con, fetcher=fetcher, watermark="202403")

    result = raw_pageviews(_ctx(), _cfg(max_months=0))
    assert result.metadata["months"].text == "202404..202405"
    assert result.metadata["n_obs"].value == 2


def test_asset_up_to_date_is_noop(monkeypatch):
    # Watermark déjà au dernier mois complet (202405) : run idempotent, aucune écriture.
    con = _FakeCon(ref_rows=[("uni-A", "en", "Harvard University")])
    fetcher = _FakeFetcher(views_by_article={"Harvard University": {"202405": 1}})
    _patch_glue(monkeypatch, con=con, fetcher=fetcher, watermark="202405")

    result = raw_pageviews(_ctx(), _cfg(max_months=0))
    assert result.metadata["n_obs"].value == 0
    assert result.metadata["months"].text == "—"
    assert result.metadata["up_to_date_until"].text == "202405"
    assert con.copies == []  # aucun COPY


def test_asset_raises_on_empty_referential(monkeypatch):
    # Référentiel vide → Failure explicite (rien à collecter, contrat rompu en amont).
    con = _FakeCon(ref_rows=[])
    fetcher = _FakeFetcher()
    _patch_glue(monkeypatch, con=con, fetcher=fetcher, watermark=None)
    with pytest.raises(Failure, match="Référentiel vide"):
        raw_pageviews(_ctx(), _cfg(max_months=2))


def test_asset_no_views_skips_write_but_reports(monkeypatch):
    # Mois collectés mais AUCUNE vue (API renvoie du vide) → pas d'écriture, métadonnées à 0.
    con = _FakeCon(ref_rows=[("uni-A", "en", "Harvard University")])
    fetcher = _FakeFetcher(views_by_article={})  # aucun item pour l'article
    _patch_glue(monkeypatch, con=con, fetcher=fetcher, watermark=None)

    result = raw_pageviews(_ctx(), _cfg(max_months=2))
    assert result.metadata["n_obs"].value == 0
    assert con.copies == []  # rien à écrire, mais pas une erreur
