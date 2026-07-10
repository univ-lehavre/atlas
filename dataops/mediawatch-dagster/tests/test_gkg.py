"""Tests du parsing pur GKG 2.1 (hermétique, contre le fixture figé gkg-sample)."""

import zipfile
from pathlib import Path

from mediawatch_dagster import gkg

_FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "gkg-sample"


def _sample_csv() -> str:
    return (_FIXTURES / "sample.gkg.csv").read_text(encoding="utf-8")


# ── Master file list ─────────────────────────────────────────────────────────


def test_parse_master_list_keeps_only_gkg_zip_sorted() -> None:
    text = (
        "227 abc http://data.gdeltproject.org/gdeltv2/20260101121500.gkg.csv.zip\n"
        "115 def http://data.gdeltproject.org/gdeltv2/20260101120000.gkg.csv.zip\n"
        "999 ghi http://data.gdeltproject.org/gdeltv2/20260101120000.export.CSV.zip\n"
        "\n"
        "malformed-line\n"
    )
    files = gkg.parse_master_list(text)
    # Seuls les *.gkg.csv.zip, triés par timestamp croissant ; export/mentions exclus.
    assert [f.timestamp for f in files] == ["20260101120000", "20260101121500"]
    assert files[0].url.endswith("20260101120000.gkg.csv.zip")


def test_files_in_day_filters_by_partition_date_bounded() -> None:
    files = gkg.parse_master_list(
        "1 a http://x/20260101120000.gkg.csv.zip\n"
        "1 b http://x/20260101121500.gkg.csv.zip\n"
        "1 c http://x/20260101123000.gkg.csv.zip\n"
        "1 d http://x/20260102000000.gkg.csv.zip\n"  # autre jour
    )
    kept, truncated = gkg.files_in_day(files, "2026-01-01", limit=2)
    # Seuls les fichiers du 2026-01-01, triés, bornés à 2 → tronqué (3 dispo).
    assert [f.timestamp for f in kept] == ["20260101120000", "20260101121500"]
    assert truncated is True


def test_files_in_day_excludes_other_days() -> None:
    files = gkg.parse_master_list(
        "1 a http://x/20260101120000.gkg.csv.zip\n1 b http://x/20260102000000.gkg.csv.zip\n"
    )
    kept, truncated = gkg.files_in_day(files, "2026-01-02", limit=10)
    assert [f.timestamp for f in kept] == ["20260102000000"]
    assert truncated is False


def test_day_prefix_strips_dashes() -> None:
    assert gkg.day_prefix("2026-01-01") == "20260101"


# ── Projection des lignes ────────────────────────────────────────────────────


def test_project_csv_matches_golden() -> None:
    mentions = gkg.project_csv(_sample_csv())
    # GOLDEN.md : 5 mentions sur 4 documents (doc 4 sans org ignoré, Harvard dédupliqué).
    assert len(mentions) == 4
    by_org = {m.organization for m in mentions}
    assert by_org == {
        "Harvard University",
        "Acme Corporation",
        "Universite du Havre",
        "University of California, Berkeley",
    }


def test_project_csv_dedupes_repeated_org_in_document() -> None:
    mentions = gkg.project_csv(_sample_csv())
    harvard = [m for m in mentions if m.organization == "Harvard University"]
    # Harvard apparaît 2× dans le document 1 → une seule mention.
    assert len(harvard) == 1
    assert harvard[0].record_id == "20260101120000-1"
    assert harvard[0].translated is False


def test_project_csv_keeps_internal_comma_strips_offset() -> None:
    mentions = gkg.project_csv(_sample_csv())
    berkeley = next(m for m in mentions if m.organization.startswith("University of California"))
    # Le nom garde sa virgule interne ; seul l'offset final ",42" est retiré.
    assert berkeley.organization == "University of California, Berkeley"


def test_project_csv_marks_translated_documents() -> None:
    mentions = gkg.project_csv(_sample_csv())
    havre = next(m for m in mentions if m.organization == "Universite du Havre")
    assert havre.translated is True
    assert havre.document_identifier == "http://lemonde.fr/b"


def test_project_row_ignores_short_rows() -> None:
    # Ligne tronquée (moins de 27 colonnes) → ignorée silencieusement.
    assert gkg.project_row(["only", "three", "cols"]) == []


def test_project_row_ignores_rows_without_org_or_id() -> None:
    cols = [""] * 27
    cols[0] = "rec"
    cols[1] = "20260101120000"
    # Pas d'organisation (colonne 14 vide) → aucune mention.
    assert gkg.project_row(cols) == []


# ── Cohérence ZIP ↔ CSV du fixture ───────────────────────────────────────────


def test_fixture_zip_contains_matching_csv() -> None:
    zip_path = _FIXTURES / "20260101120000.gkg.csv.zip"
    with zipfile.ZipFile(zip_path) as archive:
        name = archive.namelist()[0]
        text = archive.read(name).decode("utf-8")
    # Le ZIP et le .csv décompressé produisent les mêmes mentions (fixture cohérent).
    assert gkg.project_csv(text) == gkg.project_csv(_sample_csv())


# ── Couche native : 27 champs fidèles (ADR 0100) ─────────────────────────────


def test_native_columns_are_27() -> None:
    assert len(gkg.NATIVE_COLUMNS) == 27
    assert gkg.NATIVE_COLUMNS[0] == "gkg_record_id"
    assert gkg.NATIVE_COLUMNS[-1] == "v2_extras_xml"


def test_parse_native_row_keeps_all_27_fields() -> None:
    cols = [f"f{i}" for i in range(27)]
    row = gkg.parse_native_row(cols)
    assert row is not None
    assert len(row) == 27
    assert row["gkg_record_id"] == "f0"
    assert row["v21_date"] == "f1"
    assert row["v2_enhanced_organizations"] == "f14"


def test_parse_native_row_ignores_short_rows() -> None:
    assert gkg.parse_native_row(["only", "three", "cols"]) is None


def test_parse_native_row_ignores_extra_fields() -> None:
    # 28 champs (tabulation résiduelle) → on garde les 27 premiers, jamais moins.
    cols = [f"f{i}" for i in range(28)]
    row = gkg.parse_native_row(cols)
    assert row is not None and len(row) == 27


def test_parse_native_csv_parses_fixture() -> None:
    rows = gkg.parse_native_csv(_sample_csv())
    # Le fixture a 4 lignes GKG ; la native les garde TOUTES (contrairement à la
    # projection qui éclate/filtre par organisation).
    assert len(rows) == 4
    assert all(len(r) == 27 for r in rows)


def test_project_native_dict_matches_positional_projection() -> None:
    # La projection depuis le dict natif DOIT donner exactement les mêmes mentions que
    # la projection positionnelle (source unique de vérité, ADR 0100).
    native_rows = gkg.parse_native_csv(_sample_csv())
    from_native = [m for r in native_rows for m in gkg.project_native_dict(r)]
    from_csv = gkg.project_csv(_sample_csv())
    assert from_native == from_csv


def test_project_native_dict_without_org_yields_nothing() -> None:
    row = dict.fromkeys(gkg.NATIVE_COLUMNS, "")
    row["gkg_record_id"] = "rec"
    row["v21_date"] = "20260101120000"
    assert gkg.project_native_dict(row) == []
