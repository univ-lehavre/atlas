"""Tests de l'asset ref_universities et de ses corps PURS de parsing/jointure.

Le référentiel joint DEUX sources ouvertes par un ROR partagé : un catalogue
d'organisations (SNAPSHOT S3 Parquet, ``type=education`` — drift D27) et une base de
connaissances (SPARQL) qui donne qid + titres d'article multilingues, chaque titre
étant RÉSOLU vers sa cible de redirection (piège renommage) avant écriture.

Stratégie (patron mediawatch, sans Docker) : les corps de parsing/jointure et le SQL
(``institutions_query``) sont PURS (aucune I/O) → testés directement. La glue I/O est
isolée : les institutions derrière ``_fetch_institutions`` (stubé ; testé à part sur un
mini-snapshot Parquet LOCAL), le reste derrière un ``_Fetcher`` injectable (SPARQL/REST)
et ``lakehouse`` (connect/copy_to_parquet/duckdb_s3_config_from_env) → hermétique
(zéro réseau, zéro S3 réel).
"""

import sys
import urllib.error

import pytest
from dagster import Failure, build_asset_context

from pageviews_dagster.assets import ref_universities_snapshot as mod
from pageviews_dagster.assets.ref_universities_snapshot import (
    RefRow,
    RefUniversitiesConfig,
    join_rows,
    parse_institutions,
    parse_wikidata_titles,
    ref_universities,
    resolve_batch,
    works_band,
)

_MODULE = sys.modules["pageviews_dagster.assets.ref_universities_snapshot"]

# URLs des sources HTTP restantes (SPARQL / résolution REST) — le fake fetcher dispatche
# dessus. Les institutions viennent désormais du snapshot S3 (drift D27), pas d'une URL.
_SPARQL = "query.wikidata.org/sparql"
_ACTION_API = "/w/api.php"  # résolution des redirections BATCHÉE (action=query, D27 §3)


# ─────────────────────────────────────────────────────────────────────────────
#  Contrat de chemin RÉFÉRENTIEL — producteur (écrit) ↔ consommateur (lit)
# ─────────────────────────────────────────────────────────────────────────────


def test_referential_producer_writes_where_consumer_reads():
    """GARDE-FOU du contrat producteur/consommateur (drift : chemins divergents).

    `ref_universities` ÉCRIT via `lakehouse.referential_dest` ; `raw_pageviews` LIT via
    `lakehouse.referential_glob`. Ce test VERROUILLE que le fichier écrit tombe bien dans le
    glob lu, pour la MÊME source — sinon `raw_pageviews` échoue au run (« No files found … »).
    Avant, chaque asset codait son chemin en dur de son côté et ils avaient divergé.
    """
    from pageviews_dagster import lakehouse

    bucket, source = "pageviews", _MODULE._REF_SOURCE
    dest = lakehouse.referential_dest(bucket, source)  # ce que le producteur écrit
    glob = lakehouse.referential_glob(bucket, source)  # ce que le consommateur lit
    # Le dest doit être dans le dossier du glob (préfixe identique avant le motif *.parquet).
    glob_dir = glob[: glob.rindex("/") + 1]
    assert dest.startswith(glob_dir), f"écrit {dest} hors du glob de lecture {glob}"
    assert dest.endswith(".parquet")
    # La source ingérée par ref_universities est bien `ingested` (alignée sur la prod).
    assert source == "ingested"


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
#  _Fetcher — reprise sur erreur HTTP transitoire (429/5xx, D27 §2)
# ─────────────────────────────────────────────────────────────────────────────


def test_retry_delay_honours_retry_after_then_backoff():
    # Retry-After (secondes) prime ; sinon backoff exponentiel base×2**attempt.
    assert mod._retry_delay_s(0, "7") == 7.0
    assert mod._retry_delay_s(0, None) == mod._HTTP_BACKOFF_BASE_S
    assert mod._retry_delay_s(2, None) == mod._HTTP_BACKOFF_BASE_S * 4
    # Retry-After aberrant / format date → plafonné / retombe sur le backoff (jamais un gel).
    assert mod._retry_delay_s(0, "99999") == mod._HTTP_BACKOFF_CAP_S
    assert mod._retry_delay_s(1, "Wed, 21 Oct 2099 07:28:00 GMT") == mod._HTTP_BACKOFF_BASE_S * 2


def _http_error(code):
    return urllib.error.HTTPError("http://x", code, "err", {}, None)


def test_fetcher_retries_transient_then_succeeds(monkeypatch):
    # 502 (transitoire) puis 200 → 1 reprise, sleep mocké (aucune attente réelle), succès.
    slept, calls = [], {"n": 0}

    def fake_urlopen(req, timeout=None):
        calls["n"] += 1
        if calls["n"] == 1:
            raise _http_error(502)
        return _FakeResp(b'{"ok": true}')

    monkeypatch.setattr(mod.urllib.request, "urlopen", fake_urlopen)
    fetcher = mod._Fetcher(sleep=slept.append)
    out = fetcher.get_json("http://x")
    assert out == {"ok": True}
    assert calls["n"] == 2  # 1 échec transitoire + 1 succès
    assert len(slept) == 1  # exactement 1 backoff


def test_fetcher_gives_up_after_max_attempts(monkeypatch):
    # 502 permanent → épuise les tentatives puis Failure (aucun faux-vert).
    slept, calls = [], {"n": 0}

    def fake_urlopen(req, timeout=None):
        calls["n"] += 1
        raise _http_error(503)

    monkeypatch.setattr(mod.urllib.request, "urlopen", fake_urlopen)
    fetcher = mod._Fetcher(sleep=slept.append)
    with pytest.raises(Failure, match="après .* tentatives"):
        fetcher.post_json("http://x", {"q": "1"})
    assert calls["n"] == mod._HTTP_MAX_ATTEMPTS  # a bien tout tenté
    assert len(slept) == mod._HTTP_MAX_ATTEMPTS - 1  # 1 backoff entre chaque essai


def test_fetcher_does_not_retry_non_transient_4xx(monkeypatch):
    # 404 (non-transitoire) → échec IMMÉDIAT, pas de reprise inutile.
    slept, calls = [], {"n": 0}

    def fake_urlopen(req, timeout=None):
        calls["n"] += 1
        raise _http_error(404)

    monkeypatch.setattr(mod.urllib.request, "urlopen", fake_urlopen)
    fetcher = mod._Fetcher(sleep=slept.append)
    with pytest.raises(Failure):
        fetcher.get_json("http://x")
    assert calls["n"] == 1  # un seul essai
    assert slept == []  # aucun backoff


class _FakeResp:
    """Réponse urlopen factice (context manager) rendant un corps JSON fixe."""

    def __init__(self, body: bytes):
        self._body = body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return self._body


# ─────────────────────────────────────────────────────────────────────────────
#  institutions_query (SQL PUR) — filtre/dédup/borne du snapshot institutions (D27)
# ─────────────────────────────────────────────────────────────────────────────


def test_institutions_query_filters_education_and_dedups():
    # Le SQL filtre type='education' + ROR non nul et dédup par id (dernière partition).
    sql = mod.institutions_query("/snap/**/*.parquet", RefUniversitiesConfig())
    assert "type = 'education'" in sql
    assert "ror IS NOT NULL" in sql
    assert "row_number() OVER (PARTITION BY id ORDER BY updated_date DESC)" in sql
    assert "WHERE rn = 1" in sql
    assert "/snap/**/*.parquet" in sql
    # Pas de filtre pays quand country_codes vide, pas de LIMIT quand max=0.
    assert " IN (" not in sql
    assert "LIMIT" not in sql


def test_institutions_query_country_and_limit():
    # country_codes → filtre IN (majuscules) ; max_institutions → LIMIT.
    sql = mod.institutions_query(
        "/snap/**/*.parquet",
        RefUniversitiesConfig(country_codes=["fr", "de"], max_institutions=50),
    )
    assert "IN ('FR', 'DE')" in sql
    assert "LIMIT 50" in sql


def test_fetch_institutions_reads_local_parquet(monkeypatch, tmp_path):
    # Intégration DuckDB LOCALE : un mini-snapshot Parquet (2 partitions, 1 doublon d'id
    # mis à jour) → dédup sur la partition récente + normalisation parse_institutions.
    import duckdb

    con = duckdb.connect()
    p1 = tmp_path / "updated_date=2024-01-01"
    p2 = tmp_path / "updated_date=2024-06-01"
    p1.mkdir(parents=True)
    p2.mkdir(parents=True)
    # part ancienne : I1 works=1000 ; part récente : I1 works=9000 (gagne) + I2 + un non-education.
    con.execute(
        "COPY (SELECT 'https://openalex.org/I1' AS id, 'https://ror.org/r1' AS ror, "
        "'education' AS type, 'US' AS country_code, 1000 AS works_count, "
        "{'ror': 'https://ror.org/r1'} AS ids, {'country_code': 'US'} AS geo) "
        f"TO '{p1}/part.parquet' (FORMAT PARQUET)"
    )
    con.execute(
        "COPY (SELECT * FROM (VALUES "
        "('https://openalex.org/I1','https://ror.org/r1','education','FR',9000,"
        "{'ror':'https://ror.org/r1'},{'country_code':'FR'}), "
        "('https://openalex.org/I2','https://ror.org/r2','education','DE',5000,"
        "{'ror':'https://ror.org/r2'},{'country_code':'DE'}), "
        "('https://openalex.org/I3','https://ror.org/r3','company','US',1,"
        "{'ror':'https://ror.org/r3'},{'country_code':'US'})) "
        "AS t(id,ror,type,country_code,works_count,ids,geo)) "
        f"TO '{p2}/part.parquet' (FORMAT PARQUET)"
    )
    # Court-circuite le rclone (le snapshot est déjà « rapatrié » dans tmp_path).
    monkeypatch.setattr(mod, "_rclone_copy_institutions", lambda dest: None)
    monkeypatch.setattr(
        mod.tempfile, "TemporaryDirectory", lambda *a, **k: _FixedTmp(str(tmp_path))
    )

    insts = mod._fetch_institutions(RefUniversitiesConfig())
    by_ror = {i["ror"]: i for i in insts}
    # I3 (company) exclu ; I1 dédup sur la partition récente (works=9000 → bande 'm', pays FR).
    assert set(by_ror) == {"r1", "r2"}
    assert by_ror["r1"]["country_code"] == "FR"
    assert by_ror["r1"]["works_band"] == mod.works_band(9000)


class _FixedTmp:
    """Contexte tempfile.TemporaryDirectory factice pointant un dossier fixe (test)."""

    def __init__(self, path):
        self._path = path

    def __enter__(self):
        return self._path

    def __exit__(self, *a):
        return False


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
#  Corps PURS — _chunked (découpage en lots) + merge_knowledge_bases (fusion)
# ─────────────────────────────────────────────────────────────────────────────


def test_chunked_splits_into_bounded_batches():
    # 5 éléments, lots de 2 → [2, 2, 1] (dernier lot plus court).
    assert mod._chunked(["a", "b", "c", "d", "e"], 2) == [["a", "b"], ["c", "d"], ["e"]]


def test_chunked_exact_multiple():
    assert mod._chunked(["a", "b", "c", "d"], 2) == [["a", "b"], ["c", "d"]]


def test_chunked_empty_and_nonpositive_size():
    assert mod._chunked([], 200) == []
    assert mod._chunked(["a", "b"], 0) == [["a", "b"]]  # garde-fou : un seul lot
    assert mod._chunked([], 0) == []


def test_merge_knowledge_bases_assembles_disjoint_lots():
    # Lots à ROR disjoints (cas nominal : partition de la sélection) → simple assemblage.
    b1 = {"r1": {"qid": "Q1", "titles": {"en": "A"}}}
    b2 = {"r2": {"qid": "Q2", "titles": {"en": "B", "fr": "B-fr"}}}
    merged = mod.merge_knowledge_bases([b1, b2])
    assert merged == {
        "r1": {"qid": "Q1", "titles": {"en": "A"}},
        "r2": {"qid": "Q2", "titles": {"en": "B", "fr": "B-fr"}},
    }


def test_merge_knowledge_bases_first_title_per_lang_wins_on_overlap():
    # Même ROR dans deux lots (bord) : premier lot gagné, titres fusionnés sans écrasement.
    b1 = {"r1": {"qid": "Q1", "titles": {"en": "First"}}}
    b2 = {"r1": {"qid": "Q1", "titles": {"en": "Second", "fr": "Fr"}}}
    merged = mod.merge_knowledge_bases([b1, b2])
    assert merged["r1"]["titles"] == {"en": "First", "fr": "Fr"}  # en du 1er lot conservé


def test_merge_knowledge_bases_empty():
    assert mod.merge_knowledge_bases([]) == {}
    assert mod.merge_knowledge_bases([{}, {}]) == {}


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
    """Fetcher HTTP factice : DISPATCHE sur l'URL (SPARQL / résolution REST).

    Depuis le passage des institutions au snapshot S3 (drift D27), le fetcher ne sert
    PLUS le catalogue — seulement la base de connaissances (SPARQL) et la résolution REST.
    - SPARQL : rend ``sparql_payload``.
    - Résolution BATCHÉE (action=query) : rend `query.redirects[]` depuis `resolved`.
      inchangé — pas de renommage). Enregistre les titres résolus (``resolved_calls``).
    """

    def __init__(self, sparql_payload, resolved=None):
        self._sparql_payload = sparql_payload
        self._resolved = resolved or {}
        self.resolved_calls: list[str] = []

    def get_json(self, url, params=None):
        if _SPARQL in url:
            return self._sparql_payload
        if _ACTION_API in url:
            # Résolution BATCHÉE (action=query&redirects=1) : `params["titles"]` = "A|B|C".
            # On construit une réponse `redirects[]` depuis la table `resolved` (titre→cible)
            # pour les titres demandés qui y figurent (les autres restent bruts, best-effort).
            requested = (params or {}).get("titles", "").split("|")
            redirects = []
            for raw in requested:
                if raw in self._resolved and self._resolved[raw]:
                    self.resolved_calls.append(raw)
                    redirects.append({"from": raw, "to": self._resolved[raw]})
            return {"query": {"redirects": redirects, "pages": {}}}
        raise AssertionError(f"URL inattendue : {url}")

    def post_json(self, url, data=None):
        # Le SPARQL passe en POST (corps de requête, pas d'URL géante) : même payload que
        # le GET d'avant, dispatché sur l'URL de l'endpoint SPARQL.
        if _SPARQL in url:
            return self._sparql_payload
        raise AssertionError(f"POST inattendu : {url}")


def _sparql_payload(bindings):
    return {"results": {"bindings": bindings}}


def _patch_glue(monkeypatch, fetcher, con, institutions):
    """Isole toute la glue I/O : institutions (snapshot S3 stubé), fetcher (SPARQL/REST),
    bucket, connexion + écriture DuckDB, lineage. ``institutions`` = liste NORMALISÉE
    (sortie de ``_fetch_institutions``, stubé : ni rclone ni DuckDB réels)."""
    from pageviews_dagster.resources import DuckDBS3Config

    monkeypatch.setattr(_MODULE, "_Fetcher", lambda *a, **k: fetcher)
    monkeypatch.setattr(_MODULE, "_fetch_institutions", lambda config: list(institutions))
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
        sparql_payload=_sparql_payload(
            [_sparql_binding("03vek6s52", "http://x/entity/Q13371", "en", "Old Harvard")]
        ),
        resolved={"Old Harvard": "Harvard University"},  # renommage résolu
    )
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con, [_inst("u1", "03vek6s52")])

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))

    assert result.metadata["n_etablissements"].value == 1
    assert result.metadata["n_titres"].value == 1
    assert result.metadata["n_langues"].value == 1
    assert result.metadata["langs"].text == "en"
    # Métadonnées d'observabilité (drift L96) : nb titres résolus + durée, historisées par Dagster.
    assert result.metadata["n_titres_resolus"].value == 1
    assert result.metadata["resolution_duration_s"].value >= 0.0
    # Écriture DuckDB effectuée : table créée + ligne insérée avec le titre RÉSOLU.
    assert any("CREATE OR REPLACE TABLE _ref_universities" in q for q in con.queries)
    assert len(con.inserted) == 1
    assert con.inserted[0][4] == "Harvard University"  # champ title résolu
    assert "Old Harvard" in fetcher.resolved_calls  # résolution appelée


def test_asset_multiple_institutions(monkeypatch):
    # Deux établissements retournés par le snapshot → les deux sont retenus.
    fetcher = _FakeFetcher(sparql_payload=_sparql_payload([]))  # aucun titre → has_wp False
    con = _FakeCon()
    _patch_glue(
        monkeypatch,
        fetcher,
        con,
        [_inst("u1", "r1"), _inst("u2", "r2")],
    )

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))
    assert result.metadata["n_etablissements"].value == 2
    assert result.metadata["n_titres"].value == 0  # SPARQL vide


def test_asset_batches_sparql_over_many_rors(monkeypatch):
    # >_SPARQL_BATCH_SIZE établissements → PLUSIEURS POST SPARQL (un par lot), fusionnés.
    # C'est le cœur du fix : à l'échelle prod (24k+ ROR) un seul VALUES fait Broken pipe.
    n = mod._SPARQL_BATCH_SIZE * 2 + 5  # 3 lots (200, 200, 5)
    institutions = [_inst(f"u{i:05d}", f"r{i:05d}") for i in range(n)]

    class _CountingFetcher(_FakeFetcher):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            self.post_batches: list[int] = []

        def post_json(self, url, data=None):
            if _SPARQL in url:
                # nb de ROR dans ce lot = occurrences de VALUES ?ror … dans la requête
                q = (data or {}).get("query", "")
                self.post_batches.append(q.count('"r'))  # chaque ROR est "rNNNNN"
            return super().post_json(url, data)

    fetcher = _CountingFetcher(sparql_payload=_sparql_payload([]))
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con, institutions)

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))
    assert result.metadata["n_etablissements"].value == n
    # 3 lots POST, jamais un seul VALUES géant.
    assert len(fetcher.post_batches) == 3
    assert fetcher.post_batches == [mod._SPARQL_BATCH_SIZE, mod._SPARQL_BATCH_SIZE, 5]


def test_asset_raises_on_empty_referential(monkeypatch):
    # Aucun établissement retenu (filtre trop restrictif) → Failure explicite.
    fetcher = _FakeFetcher(sparql_payload=_sparql_payload([]))
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con, [])  # snapshot vide

    with pytest.raises(Failure, match="Référentiel vide"):
        ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))


def test_asset_resolution_best_effort_keeps_raw_on_failure(monkeypatch):
    # L'API de résolution lève Failure → on garde le titre brut (pas de perte de ligne).
    fetcher = _FakeFetcher(
        sparql_payload=_sparql_payload(
            [_sparql_binding("r1", "http://x/entity/Q1", "en", "Kept Title")]
        ),
    )

    original_get = fetcher.get_json

    def get_json(url, params=None):
        if _ACTION_API in url:  # la résolution batchée échoue → titres bruts conservés
            raise Failure(description="endpoint injoignable")
        return original_get(url, params)

    fetcher.get_json = get_json
    con = _FakeCon()
    _patch_glue(monkeypatch, fetcher, con, [_inst("u1", "r1")])

    result = ref_universities(_ctx(), RefUniversitiesConfig(langs=["en"]))
    assert result.metadata["n_titres"].value == 1
    assert con.inserted[0][4] == "Kept Title"  # titre brut conservé


# ── resolve_batch (PUR) — chaînage normalized → redirects ─────────────────────


def test_resolve_batch_chains_normalized_then_redirects():
    # L'API chaîne normalized (casse/_) PUIS redirects (renommage) : demandé → normalisé → cible.
    payload = {
        "query": {
            "normalized": [{"from": "harvard_university", "to": "Harvard university"}],
            "redirects": [{"from": "Harvard university", "to": "Université Harvard"}],
        }
    }
    out = resolve_batch(payload, ["harvard_university", "Inconnu"])
    assert out["harvard_university"] == "Université Harvard"  # les 2 maillons suivis
    assert out["Inconnu"] == "Inconnu"  # ni normalisé ni redirigé → inchangé (best-effort)


def test_resolve_batch_redirect_only_and_missing():
    payload = {
        "query": {"redirects": [{"from": "MIT", "to": "Massachusetts Institute of Technology"}]}
    }
    out = resolve_batch(payload, ["MIT", "France"])
    assert out["MIT"] == "Massachusetts Institute of Technology"
    assert out["France"] == "France"  # pas de redirection → titre brut conservé


def test_resolve_titles_skips_offlang_and_empty():
    # _resolve_titles ne résout QUE les langues demandées avec un titre non vide.
    calls: list[dict] = []

    class _RecordingFetcher:
        def get_json(self, url, params=None):
            calls.append(params)  # on capture les `titles` batchés
            requested = (params or {}).get("titles", "").split("|")
            return {"query": {"redirects": [{"from": t, "to": "Resolved"} for t in requested]}}

    kb = {
        "r1": {
            "qid": "Q1",
            "titles": {
                "en": "Wanted",  # langue demandée + titre → résolu
                "de": "Ignored",  # langue NON demandée → sautée
                "fr": "",  # langue demandée mais titre vide → sauté
            },
        }
    }
    resolved = mod._resolve_titles(_RecordingFetcher(), kb, ["en", "fr"])
    assert resolved == {("Q1", "Wanted"): "Resolved"}
    assert len(calls) == 1  # UNE requête batch (en/Wanted) ; ni de/Ignored ni fr/vide
    assert calls[0]["titles"] == "Wanted"


def test_resolve_titles_batches_by_50_and_is_deterministic():
    # >50 titres d'une même langue → PLUSIEURS lots (un par 50), résolus, fusionnés. Résultat
    # ORDRE-indépendant (dict clé (qid, titre)) → déterministe (ADR 0057). Log début/fin émis.
    n = mod._RESOLVE_BATCH_SIZE * 2 + 7  # 3 lots (50, 50, 7)
    batch_sizes: list[int] = []

    class _BatchFetcher:
        def get_json(self, url, params=None):
            requested = (params or {}).get("titles", "").split("|")
            batch_sizes.append(len(requested))
            # canonique déterministe par titre : chaque "Title i" → "canon::Title i".
            return {"query": {"redirects": [{"from": t, "to": f"canon::{t}"} for t in requested]}}

    kb = {f"Q{i}": {"qid": f"Q{i}", "titles": {"en": f"Title {i:03d}"}} for i in range(n)}
    lines: list[str] = []
    resolved = mod._resolve_titles(_BatchFetcher(), kb, ["en"], log=lines.append)

    assert len(resolved) == n
    for i in range(n):
        title = f"Title {i:03d}"
        assert resolved[(f"Q{i}", title)] == f"canon::{title}"
    # 3 lots : 50, 50, 7 (jamais un lot > 50 = limite API).
    assert batch_sizes == [mod._RESOLVE_BATCH_SIZE, mod._RESOLVE_BATCH_SIZE, 7]
    assert any("résolution BATCHÉE" in ln for ln in lines)
    assert any(f"{n} titres résolus en" in ln for ln in lines)


def test_resolve_titles_best_effort_on_batch_failure():
    # Un lot qui lève Failure → ses titres restent BRUTS (pas de perte de ligne, best-effort).
    class _FailingFetcher:
        def get_json(self, url, params=None):
            raise Failure(description="endpoint injoignable")

    kb = {"Q1": {"qid": "Q1", "titles": {"en": "Kept"}}}
    resolved = mod._resolve_titles(_FailingFetcher(), kb, ["en"])
    assert resolved == {("Q1", "Kept"): "Kept"}  # titre brut conservé


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


def test_real_fetcher_post_sends_body_not_url(monkeypatch):
    # Le POST porte les paramètres dans le CORPS (pas dans l'URL) : c'est la clé du fix
    # d'échelle (une URL SPARQL de ~400 Ko en GET fait Broken pipe).
    import json

    captured = {}

    def fake_urlopen(req, timeout=None):
        captured["url"] = req.full_url
        captured["body"] = req.data
        captured["ctype"] = req.get_header("Content-type")
        assert req.get_header("User-agent")
        return _FakeResp(json.dumps({"results": {"bindings": []}}).encode("utf-8"))

    monkeypatch.setattr(mod.urllib.request, "urlopen", fake_urlopen)
    out = mod._Fetcher(timeout=1.0).post_json(
        "https://query.wikidata.org/sparql", {"query": "SELECT ?x {}", "format": "json"}
    )
    assert out == {"results": {"bindings": []}}
    assert "?" not in captured["url"]  # aucun paramètre dans l'URL
    assert b"query=" in captured["body"] and b"format=json" in captured["body"]
    assert "x-www-form-urlencoded" in captured["ctype"]


def test_real_fetcher_post_raises_failure_on_network_error(monkeypatch):
    def boom(req, timeout=None):
        raise OSError("broken pipe")

    monkeypatch.setattr(mod.urllib.request, "urlopen", boom)
    with pytest.raises(Failure, match="Requête source échouée"):
        mod._Fetcher().post_json("https://query.wikidata.org/sparql", {"query": "x"})
