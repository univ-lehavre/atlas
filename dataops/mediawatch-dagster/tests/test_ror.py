"""Tests du parsing pur du dump référentiel (schema v2, sans I/O)."""

from mediawatch_dagster import ror

# Échantillon schema v2 : une université, une org non-éducation, une université
# multi-types, une éducation sans ror_display (fallback), une sans id.
_DUMP = [
    {
        "id": "https://ror.org/03vek6s52",
        "types": ["education"],
        "names": [
            {"value": "Harvard University", "types": ["ror_display", "label"]},
            {"value": "Harvard", "types": ["alias"]},
        ],
        "locations": [
            {"geonames_details": {"country_code": "US", "country_name": "United States"}}
        ],
    },
    {
        "id": "https://ror.org/01abc1234",
        "types": ["company"],  # pas une université
        "names": [{"value": "Acme Corp", "types": ["ror_display"]}],
        "locations": [],
    },
    {
        "id": "https://ror.org/02jx3x895",
        "types": ["education", "funder"],  # multi-types : reste une université
        "names": [{"value": "University College London", "types": ["ror_display"]}],
        "locations": [{"geonames_details": {"country_code": "GB"}}],
    },
    {
        "id": "https://ror.org/04nofallback",
        "types": ["education"],
        "names": [{"value": "Fallback University", "types": ["label"]}],  # pas de ror_display
        "locations": [],
    },
    {
        "id": "",  # id manquant → ignoré
        "types": ["education"],
        "names": [{"value": "No Id University", "types": ["ror_display"]}],
    },
]


def test_is_university_tests_membership_not_equality() -> None:
    assert ror.is_university({"types": ["education", "funder"]}) is True
    assert ror.is_university({"types": ["company"]}) is False
    assert ror.is_university({}) is False


def test_project_dump_keeps_only_education_sorted() -> None:
    unis = ror.project_dump(_DUMP)
    ids = [u.university_id for u in unis]
    # 3 universités valides (Harvard, UCL, Fallback) ; Acme (company) et l'id vide exclus.
    assert ids == [
        "https://ror.org/02jx3x895",
        "https://ror.org/03vek6s52",
        "https://ror.org/04nofallback",
    ]


def test_project_record_uses_ror_display_name() -> None:
    harvard = ror.project_record(_DUMP[0])
    assert harvard.name == "Harvard University"
    assert harvard.country == "US"


def test_project_record_falls_back_to_first_name() -> None:
    fallback = ror.project_record(_DUMP[3])
    assert fallback.name == "Fallback University"
    assert fallback.country == ""  # pas de localisation


def test_project_record_returns_none_for_non_university() -> None:
    assert ror.project_record(_DUMP[1]) is None


def test_project_record_returns_none_without_id() -> None:
    assert ror.project_record(_DUMP[4]) is None
