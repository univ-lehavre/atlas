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


def test_select_fresh_bootstrap_takes_oldest_bounded() -> None:
    files = gkg.parse_master_list(
        "1 a http://x/20260101120000.gkg.csv.zip\n"
        "1 b http://x/20260101121500.gkg.csv.zip\n"
        "1 c http://x/20260101123000.gkg.csv.zip\n"
    )
    fresh, truncated = gkg.select_fresh(files, after=None, limit=2)
    assert [f.timestamp for f in fresh] == ["20260101120000", "20260101121500"]
    assert truncated is True


def test_select_fresh_only_after_watermark() -> None:
    files = gkg.parse_master_list(
        "1 a http://x/20260101120000.gkg.csv.zip\n1 b http://x/20260101121500.gkg.csv.zip\n"
    )
    fresh, truncated = gkg.select_fresh(files, after="20260101120000", limit=10)
    assert [f.timestamp for f in fresh] == ["20260101121500"]
    assert truncated is False


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
