"""Tests de l'asset ref_universities et de ses corps PURS de parsing/jointure.

Le référentiel joint DEUX sources ouvertes par un ROR partagé : un catalogue
d'organisations (API paginée, ``type:education``) et une base de connaissances
(SPARQL) qui donne qid + titres d'article multilingues, chaque titre étant RÉSOLU
vers sa cible de redirection (piège renommage) avant écriture.

Stratégie (patron mediawatch, sans Docker) : les corps de parsing/jointure sont PURS
(aucune I/O) → testés directement sur des payloads synthétiques. La glue I/O est
isolée derrière un ``_Fetcher`` injectable et l'écriture derrière ``lakehouse`` :
on remplace le ``_Fetcher`` du module par un fake qui DISPATCHE sur l'URL, et on
mocke ``lakehouse.connect``/``copy_to_parquet``/``duckdb_s3_config_from_env`` +
``lineage.emit`` → hermétique (zéro réseau, zéro S3).
"""

import sys

import pytest
from dagster import Failure, build_asset_context

from pageviews_dagster.assets import ref_universities_snapshot as mod
from pageviews_dagster.assets.ref_universities_snapshot import (
    RefRow,
    RefUniversitiesConfig,
    join_rows,
    next_cursor,
    parse_institutions,
    parse_wikidata_titles,
    ref_universities,
    works_band,
)

_MODULE = sys.modules["pageviews_dagster.assets.ref_universities_snapshot"]

# URLs des trois sources (miroir des constantes privées du module) — le fake fetcher
# dispatche dessus. Sous-chaînes suffisantes pour éviter tout couplage aux paramètres.
_INSTITUTIONS = "api.openalex.org/institutions"
_SPARQL = "query.wikidata.org/sparql"
_WP_REST = "/w/rest.php/v1/page/"


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — works_band (discrétisation)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("count", "expected"),
    [
        (0, "xs"),
        (999, "xs"),
        (1_000, "s"),  # borne inférieure INCLUSIVE dans la bande suivante
        (4_999, "s"),
        (5_000, "m"),
        (19_999, "m"),
        (20_000, "l"),
        (99_999, "l"),
        (100_000, "xl"),  # au-delà de la dernière borne → xl
        (10_000_000, "xl"),
    ],
)
def test_works_band_bins_on_fixed_bounds(count, expected):
    assert works_band(count) == expected


def test_works_band_negative_falls_into_smallest():
    # Compte négatif (source aberrante) : plus petite bande, pas d'exception.
    assert works_band(-42) == "xs"


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — _ror_id (normalisation)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("https://ror.org/03vek6s52", "03vek6s52"),  # schéma + hôte retirés
        ("03vek6s52", "03vek6s52"),  # déjà nu
        ("https://ror.org/03vek6s52/", "03vek6s52"),  # slash final toléré
        ("  https://ror.org/03vek6s52  ", "03vek6s52"),  # espaces autour
        ("", ""),  # vide → vide
        ("   ", ""),  # blanc → vide
    ],
)
def test_ror_id_normalises_to_bare_key(raw, expected):
    assert mod._ror_id(raw) == expected


def test_ror_id_none_is_empty():
    # Robuste à None (source manquante) : pas d'AttributeError.
    assert mod._ror_id(None) == ""


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — parse_institutions (projection catalogue → normalisé)
# ─────────────────────────────────────────────────────────────────────────────


def test_parse_institutions_projects_and_bins():
    payload = {
        "results": [
            {
                "id": "https://openalex.org/I136199984",
                "ror": "https://ror.org/03vek6s52",
                "works_count": 250_000,
                "geo": {"country_code": "us"},
            }
        ]
    }
    out = parse_institutions(payload)
    assert out == [
        {
            "ror": "03vek6s52",
            "university_id": "https://openalex.org/I136199984",
            "country_code": "US",  # normalisé en MAJUSCULES
            "works_band": "xl",  # 250k > 100k
        }
    ]


def test_parse_institutions_reads_ror_from_ids_fallback():
    # ROR absent au niveau racine mais présent dans ``ids`` → utilisé.
    payload = {
        "results": [{"id": "https://openalex.org/I2", "ids": {"ror": "https://ror.org/05a28rw58"}}]
    }
    out = parse_institutions(payload)
    assert out[0]["ror"] == "05a28rw58"
    assert out[0]["works_band"] == "xs"  # works_count absent → 0 → xs


def test_parse_institutions_country_code_fallback_and_upper():
    # Pas de geo → repli sur country_code racine, mis en MAJUSCULES.
    payload = {"results": [{"id": "u", "ror": "r1", "country_code": "fr"}]}
    assert parse_institutions(payload)[0]["country_code"] == "FR"


def test_parse_institutions_skips_entries_without_ror():
    # Une entrée sans ROR ne peut être jointe → ignorée silencieusement.
    payload = {"results": [{"id": "u1"}, {"id": "u2", "ror": "https://ror.org/rok"}]}
    out = parse_institutions(payload)
    assert len(out) == 1
    assert out[0]["ror"] == "rok"


def test_parse_institutions_skips_entries_without_id():
    # ROR présent mais id (university_id) vide → ignorée (pas de grain identifiable).
    payload = {"results": [{"ror": "https://ror.org/rok", "id": ""}]}
    assert parse_institutions(payload) == []


def test_parse_institutions_empty_payload():
    assert parse_institutions({}) == []
    assert parse_institutions({"results": None}) == []


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — next_cursor (pagination)
# ─────────────────────────────────────────────────────────────────────────────


def test_next_cursor_returns_value():
    assert next_cursor({"meta": {"next_cursor": "abc=="}}) == "abc=="


def test_next_cursor_none_on_terminal_markers():
    # null, "*" figé, absence → None (arrête la boucle, pas de pagination infinie).
    assert next_cursor({"meta": {"next_cursor": None}}) is None
    assert next_cursor({"meta": {"next_cursor": "*"}}) is None
    assert next_cursor({"meta": {}}) is None
    assert next_cursor({}) is None


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — parse_wikidata_titles (index SPARQL par ROR)
# ─────────────────────────────────────────────────────────────────────────────


def _sparql_binding(ror, item, lang, title):
    return {
        "ror": {"value": ror},
        "item": {"value": item},
        "lang": {"value": lang},
        "title": {"value": title},
    }


def test_parse_wikidata_titles_indexes_by_ror_and_merges_langs():
    item = "http://www.wikidata.org/entity/Q13371"
    payload = {
        "results": {
            "bindings": [
                _sparql_binding("03vek6s52", item, "en", "Harvard University"),
                _sparql_binding("03vek6s52", item, "fr", "Université Harvard"),
            ]
        }
    }
    index = parse_wikidata_titles(payload, ["en", "fr"])
    assert index == {
        "03vek6s52": {
            "qid": "Q13371",
            "titles": {"en": "Harvard University", "fr": "Université Harvard"},
        }
    }


def test_parse_wikidata_titles_filters_unwanted_langs():
    payload = {
        "results": {
            "bindings": [
                _sparql_binding("r1", "http://x/entity/Q1", "en", "Foo"),
                _sparql_binding("r1", "http://x/entity/Q1", "de", "Foo (de)"),
            ]
        }
    }
    index = parse_wikidata_titles(payload, ["en"])
    assert index["r1"]["titles"] == {"en": "Foo"}  # de exclu


def test_parse_wikidata_titles_first_title_per_lang_wins():
    # Requête triée : le premier titre pour une langue est stable et l'emporte.
    payload = {
        "results": {
            "bindings": [
                _sparql_binding("r1", "http://x/entity/Q1", "en", "Canonical"),
                _sparql_binding("r1", "http://x/entity/Q1", "en", "Alias"),
            ]
        }
    }
    assert parse_wikidata_titles(payload, ["en"])["r1"]["titles"]["en"] == "Canonical"


def test_parse_wikidata_titles_skips_binding_without_ror():
    payload = {"results": {"bindings": [{"item": {"value": "http://x/entity/Q1"}}]}}
    assert parse_wikidata_titles(payload, ["en"]) == {}


def test_parse_wikidata_titles_empty():
    assert parse_wikidata_titles({}, ["en"]) == {}
    assert parse_wikidata_titles({"results": {}}, ["en"]) == {}


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — _sparql_query (construction de requête)
# ─────────────────────────────────────────────────────────────────────────────


def test_sparql_query_embeds_rors_langs_and_property():
    query = mod._sparql_query(["03vek6s52", "05a28rw58"], ["en", "fr"])
    assert '"03vek6s52"' in query
    assert '"05a28rw58"' in query
    assert '"en"' in query and '"fr"' in query
    assert "wdt:P6782" in query  # propriété ROR de la base de connaissances
    assert "ORDER BY ?ror ?lang" in query  # tri déterministe


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — join_rows (jointure établissements × base de connaissances)
# ─────────────────────────────────────────────────────────────────────────────


def _inst(uid, ror, country="US", band="m"):
    return {"ror": ror, "university_id": uid, "country_code": country, "works_band": band}


def test_join_rows_matches_on_ror_and_uses_resolved_title():
    institutions = [_inst("u1", "r1")]
    kb = {"r1": {"qid": "Q1", "titles": {"en": "Old Name"}}}
    # Titre brut RENOMMÉ → résolu vers la cible canonique.
    resolved = {("Q1", "Old Name"): "New Name"}
    rows = join_rows(institutions, kb, resolved, ["en"])
    assert len(rows) == 1
    row = rows[0]
    assert isinstance(row, RefRow)
    assert row.ror == "r1"
    assert row.qid == "Q1"
    assert row.university_id == "u1"
    assert row.lang == "en"
    assert row.title == "New Name"  # résolu, pas l'ancien
    assert row.has_wp is True


def test_join_rows_keeps_institution_absent_from_knowledge_base():
    # Établissement sans entrée SPARQL → conservé, qid/title vides, has_wp=False.
    institutions = [_inst("u1", "r-unknown", country="FR", band="s")]
    rows = join_rows(institutions, {}, {}, ["en"])
    assert len(rows) == 1
    assert rows[0].qid == ""
    assert rows[0].title == ""
    assert rows[0].has_wp is False
    assert rows[0].country_code == "FR"  # pays/bande restent exploitables en aval
    assert rows[0].works_band == "s"


def test_join_rows_one_row_per_lang_missing_lang_has_no_title():
    institutions = [_inst("u1", "r1")]
    kb = {"r1": {"qid": "Q1", "titles": {"en": "Foo"}}}
    rows = join_rows(institutions, kb, {}, ["en", "fr"])
    assert len(rows) == 2
    by_lang = {r.lang: r for r in rows}
    assert by_lang["en"].title == "Foo" and by_lang["en"].has_wp is True
    assert by_lang["fr"].title == "" and by_lang["fr"].has_wp is False


def test_join_rows_sorted_by_university_id_deterministic():
    # Entrée désordonnée → sortie triée par university_id (déterminisme ADR 0057).
    institutions = [_inst("u2", "r2"), _inst("u1", "r1")]
    rows = join_rows(institutions, {}, {}, ["en"])
    assert [r.university_id for r in rows] == ["u1", "u2"]


def test_join_rows_falls_back_to_raw_title_when_not_resolved():
    # Titre présent mais absent de resolved (résolution best-effort échouée) → brut gardé.
    institutions = [_inst("u1", "r1")]
    kb = {"r1": {"qid": "Q1", "titles": {"en": "Raw Title"}}}
    rows = join_rows(institutions, kb, {}, ["en"])
    assert rows[0].title == "Raw Title"
    assert rows[0].has_wp is True


# ─────────────────────────────────────────────────────────────────────────────
#  Corps PURS — _summary (compteurs de métadonnées)
# ─────────────────────────────────────────────────────────────────────────────


def _row(uid, lang, has_wp):
    return RefRow(
        ror="r",
        qid="Q",
        university_id=uid,
        lang=lang,
        title="T" if has_wp else "",
        country_code="US",
        works_band="m",
        has_wp=has_wp,
    )


def test_summary_counts_distinct_and_titles():
    rows = [
        _row("u1", "en", True),
        _row("u1", "fr", True),
        _row("u2", "en", False),  # établissement distinct, sans titre
    ]
    summary = mod._summary(rows)
    assert summary["n_etablissements"] == 2  # u1, u2
    assert summary["n_titres"] == 2  # 2 lignes has_wp
    assert summary["n_langues"] == 2  # en, fr couvertes par un titre


def test_summary_ignores_langs_without_title():
    # n_langues ne compte QUE les langues portant un titre résolu.
    rows = [_row("u1", "en", True), _row("u1", "fr", False)]
    summary = mod._summary(rows)
    assert summary["n_langues"] == 1  # fr sans titre → non compté
    assert summary["n_titres"] == 1


def test_summary_empty():
    assert mod._summary([]) == {"n_etablissements": 0, "n_titres": 0, "n_langues": 0}


# ─────────────────────────────────────────────────────────────────────────────
#  Glue I/O — _Fetcher fake + assets via monkeypatch
# ─────────────────────────────────────────────────────────────────────────────


class _FakeCon:
    """Connexion DuckDB factice : capte les DDL/DML et les lignes insérées (aucun I/O)."""

    def __init__(self):
        self.queries: list[str] = []
        self.inserted: list = []

    def execute(self, query, *args, **kwargs):
        self.queries.append(query)
        return self

    def executemany(self, query, rows):
        self.queries.append(query)
        self.inserted.extend(rows)
        return self


class _FakeFetcher:
    """Fetcher HTTP factice : DISPATCHE sur l'URL (catalogue / SPARQL / résolution REST).

    - Institutions : rend les pages fournies dans ``institution_pages`` (pagination).
    - SPARQL : rend ``sparql_payload``.
    - Résolution REST : rend ``{"title": <canonique>}`` selon ``resolved`` (défaut : titre
      inchangé — pas de renommage). Enregistre les titres résolus (``resolved_calls``).
    """

    def __init__(self, institution_pages, sparql_payload, resolved=None):
        self._institution_pages = list(institution_pages)
        self._sparql_payload = sparql_payload
        self._resolved = resolved or {}
        self.resolved_calls: list[str] = []

    def get_json(self, url, params=None):
        if _INSTITUTIONS in url:
            return self._institution_pages.pop(0)
        if _SPARQL in url:
            return self._sparql_payload
        if _WP_REST in url:
            # Le titre brut (avec espaces → underscores + quote) est dans l'URL ; on
            # résout via la table ``resolved`` indexée par titre brut lisible.
            for raw, canonical in self._resolved.items():
                if raw.replace(" ", "_") in url:
                    self.resolved_calls.append(raw)
                    return {"title": canonical}
            return {"title": ""}  # pas de canonique connu → garde le brut (best-effort)
        raise AssertionError(f"URL inattendue : {url}")


def _one_page(results, next_cur=None):
    return {"results": results, "meta": {"next_cursor": next_cur}}


def _inst_result(uid, ror, works=6_000, country="US"):
    return {"id": uid, "ror": ror, "works_count": works, "geo": {"country_code": country}}


def _sparql_payload(bindings):
    return {"results": {"bindings": bindings}}


def _patch_glue(monkeypatch, fetcher, con):
    """Isole toute la glue I/O : fetcher, bucket, connexion + écriture DuckDB, lineage."""
    from pageviews_dagster.resources import DuckDBS3Config

    monkeypatch.setattr(_MODULE, "_Fetcher", lambda *a, **k: fetcher)
    monkeypatch.setattr(
        mod.lakehouse,
        "duckdb_s3_config_from_env",
        lambda env=None: DuckDBS3Config("AK", "SK", "h:8333", False, "us-east-1", "pageviews"),
    )
    monkeypatch.setattr(mod.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(mod.lakehouse, "copy_to_parquet", lambda *a, **k: None)
    monkeypatch.setattr(mod.lineage, "emit", lambda *a, **k: None)


def _ctx():
    return build_asset_context()


def test_asset_builds_referential_and_writes(monkeypatch):
    # Chaîne complète : 1 établissement joint à un titre RÉSOLU → 1 ligne écrite.
    fetcher = _FakeFetcher(
        institution_pages=[
            _one_page([_inst_result("u1", "https://ror.org/03vek6s52")], next_cur=None)
        ],
        sparql_payload=_sparql_payload(
            [_sparql_binding("03vek6s52", "http://x/entity/Q13371", "en", "Old Harvard")]
        ),
        resolved={"Old Harvard": "Harvard University"},  # renommage résolu
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))

    assert result.metadata["n_etablissements"].value == 1
    assert result.metadata["n_titres"].value == 1
    assert result.metadata["n_langues"].value == 1
    assert result.metadata["langs"].text == "en"
    # Écriture DuckDB effectuée : table créée + ligne insérée avec le titre RÉSOLU.
    assert any("CREATE OR REPLACE TABLE _ref_universities" in q for q in con.queries)
    assert len(con.inserted) == 1
    assert con.inserted[0][4] == "Harvard University"  # champ title résolu
    assert "Old Harvard" in fetcher.resolved_calls  # résolution appelée


def test_asset_paginates_institutions(monkeypatch):
    # Deux pages liées par un curseur → les deux établissements sont retenus.
    fetcher = _FakeFetcher(
        institution_pages=[
            _one_page([_inst_result("u1", "https://ror.org/r1")], next_cur="PAGE2"),
            _one_page([_inst_result("u2", "https://ror.org/r2")], next_cur=None),
        ],
        sparql_payload=_sparql_payload([]),  # aucun titre → has_wp False partout
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))
    assert result.metadata["n_etablissements"].value == 2
    assert result.metadata["n_titres"].value == 0  # SPARQL vide


def test_asset_respects_max_institutions(monkeypatch):
    # max_institutions=1 → pagination arrêtée tôt, une seule ligne malgré 2 résultats page 1.
    fetcher = _FakeFetcher(
        institution_pages=[
            _one_page(
                [
                    _inst_result("u1", "https://ror.org/r1"),
                    _inst_result("u2", "https://ror.org/r2"),
                ],
                next_cur="PAGE2",
            )
        ],
        sparql_payload=_sparql_payload([]),
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"], max_institutions=1))
    assert result.metadata["n_etablissements"].value == 1


def test_asset_country_filter_reaches_fetcher(monkeypatch):
    # country_codes non vide → le filtre est passé au catalogue (paramètre ``filter``).
    seen_params = {}

    class _CapturingFetcher(_FakeFetcher):
        def get_json(self, url, params=None):
            if _INSTITUTIONS in url:
                seen_params.update(params or {})
            return super().get_json(url, params)

    fetcher = _CapturingFetcher(
        institution_pages=[_one_page([_inst_result("u1", "https://ror.org/r1")])],
        sparql_payload=_sparql_payload([]),
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"], country_codes=["FR", "DE"]))
    assert "country_code:fr|de" in seen_params["filter"]
    assert "type:education" in seen_params["filter"]


def test_asset_raises_on_empty_referential(monkeypatch):
    # Aucun établissement retenu (filtre trop restrictif) → Failure explicite.
    fetcher = _FakeFetcher(
        institution_pages=[_one_page([], next_cur=None)],
        sparql_payload=_sparql_payload([]),
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    with pytest.raises(Failure, match="Référentiel vide"):
        ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))


def test_asset_resolution_best_effort_keeps_raw_on_failure(monkeypatch):
    # L'API de résolution lève Failure → on garde le titre brut (pas de perte de ligne).
    fetcher = _FakeFetcher(
        institution_pages=[_one_page([_inst_result("u1", "https://ror.org/r1")])],
        sparql_payload=_sparql_payload(
            [_sparql_binding("r1", "http://x/entity/Q1", "en", "Kept Title")]
        ),
    )

    original_get = fetcher.get_json

    def get_json(url, params=None):
        if _WP_REST in url:
            raise Failure(description="endpoint injoignable")
        return original_get(url, params)

    fetcher.get_json = get_json
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con)

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))
    assert result.metadata["n_titres"].value == 1
    assert con.inserted[0][4] == "Kept Title"  # titre brut conservé


def test_resolve_titles_skips_offlang_and_empty(monkeypatch):
    # _resolve_titles ne résout QUE les langues demandées avec un titre non vide.
    # (dans le chemin asset, parse_wikidata_titles pré-filtre déjà — ici on force le skip.)
    calls: list[str] = []

    class _RecordingFetcher:
        def get_json(self, url, params=None):
            calls.append(url)
            return {"title": "Resolved"}

    kb = {
        "r1": {
            "qid": "Q1",
            "titles": {
                "en": "Wanted",  # langue demandée + titre → résolu
                "de": "Ignored",  # langue NON demandée → sauté
                "fr": "",  # langue demandée mais titre vide → sauté
            },
        }
    }
    resolved = mod._resolve_titles(_RecordingFetcher(), kb, ["en", "fr"])
    assert resolved == {("Q1", "Wanted"): "Resolved"}
    assert len(calls) == 1  # une seule résolution (en/Wanted)


def test_resolve_one_title_prefers_canonical(monkeypatch):
    # Redirection : l'API rend un titre canonique non vide → il l'emporte sur le brut.
    class _F:
        def get_json(self, url, params=None):
            return {"title": "Canonical Target"}

    assert mod._resolve_one_title(_F(), "en", "Old Title") == "Canonical Target"


def test_resolve_one_title_falls_back_to_raw_on_empty(monkeypatch):
    # API rend un titre vide → on garde le brut (pas de titre canonique connu).
    class _F:
        def get_json(self, url, params=None):
            return {"title": ""}

    assert mod._resolve_one_title(_F(), "en", "Kept") == "Kept"


# ─────────────────────────────────────────────────────────────────────────────
#  Glue I/O — _Fetcher réel (parsing HTTP + gestion d'erreur, urlopen mocké)
# ─────────────────────────────────────────────────────────────────────────────


class _FakeResp:
    def __init__(self, body: bytes):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_real_fetcher_parses_json(monkeypatch):
    import json

    def fake_urlopen(req, timeout=None):
        # User-Agent explicite posé (endpoints publics rejettent l'anonyme).
        assert req.get_header("User-agent")
        return _FakeResp(json.dumps({"ok": 1}).encode("utf-8"))

    monkeypatch.setattr(mod.urllib.request, "urlopen", fake_urlopen)
    fetcher = mod._Fetcher(timeout=1.0)
    assert fetcher.get_json("https://example/api", {"per-page": 200}) == {"ok": 1}


def test_real_fetcher_raises_failure_on_network_error(monkeypatch):
    def boom(req, timeout=None):
        raise OSError("dns")

    monkeypatch.setattr(mod.urllib.request, "urlopen", boom)
    with pytest.raises(Failure, match="Requête source échouée"):
        mod._Fetcher().get_json("https://example/api")
