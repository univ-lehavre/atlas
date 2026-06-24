"""Tests basés sur les propriétés du parsing du dump référentiel (PBT, ADR 0072).

Complètent ``test_ror.py`` (par l'exemple, schema v2 figé) en éprouvant que
``project_record`` **tolère le bruit structurel** d'un dump réel : clés absentes,
``types`` à ``None``, ``locations`` malformé, valeurs d'un type inattendu. Cible :
la fonction PURE ``project_record`` (et son chemin ``project_dump``). Hermétiques
(génération en mémoire — ADR 0057).
"""

from hypothesis import given
from hypothesis import strategies as st

from mediawatch_dagster import ror

# Valeurs JSON arbitraires (récursives, bornées) : ce qu'un dump non fiable peut
# contenir à n'importe quelle clé — None, scalaire, liste, sous-objet.
_JSON = st.recursive(
    st.none() | st.booleans() | st.integers() | st.floats(allow_nan=False) | st.text(max_size=10),
    lambda children: (
        st.lists(children, max_size=4) | st.dictionaries(st.text(max_size=8), children, max_size=4)
    ),
    max_leaves=10,
)

# Enregistrement-like : un dict dont les clés connues du schema v2 (id, types, names,
# locations) reçoivent une valeur arbitraire — y compris d'un type inattendu.
_RECORD = st.fixed_dictionaries(
    {},
    optional={
        "id": _JSON,
        "types": _JSON,
        "names": _JSON,
        "locations": _JSON,
    },
)


@given(_RECORD)
def test_project_record_tolerates_structural_noise(record: dict) -> None:
    """Sur un enregistrement arbitraire (clés manquantes, types inattendus),
    ``project_record`` renvoie une ``University`` valide OU ``None`` — jamais une
    ``KeyError``/``TypeError``/``AttributeError``."""
    result = ror.project_record(record)
    assert result is None or isinstance(result, ror.University)
    if isinstance(result, ror.University):
        # Une University émise est bien formée : id et nom non vides, pays = chaîne.
        assert result.university_id and result.name
        assert isinstance(result.country, str)


@given(st.lists(_RECORD, max_size=8))
def test_project_dump_tolerates_noise_and_sorts(records: list[dict]) -> None:
    """``project_dump`` survit à une liste d'enregistrements bruités, renvoie des
    ``University`` valides triées par id (déterminisme)."""
    unis = ror.project_dump(records)
    assert all(isinstance(u, ror.University) for u in unis)
    ids = [u.university_id for u in unis]
    assert ids == sorted(ids)


@given(_JSON)
def test_is_university_never_raises(types_value: object) -> None:
    """``is_university`` accepte un ``types`` de n'importe quel type sans lever, et
    renvoie un booléen."""
    assert isinstance(ror.is_university({"types": types_value}), bool)


# Cas dur ciblé : un enregistrement éducation bien formé sauf le champ piège.
@given(
    uid=st.text(min_size=1, max_size=12).filter(lambda s: s.strip() != ""),
    display=st.text(min_size=1, max_size=12).filter(lambda s: s.strip() != ""),
)
def test_project_record_education_with_missing_locations(uid: str, display: str) -> None:
    """Une éducation valide SANS ``locations`` (clé absente) reste projetée, pays vide —
    pas d'``IndexError`` sur ``locations[0]``."""
    record = {
        "id": uid,
        "types": ["education"],
        "names": [{"value": display, "types": ["ror_display"]}],
        # pas de clé "locations" du tout
    }
    result = ror.project_record(record)
    assert result is not None
    assert result.university_id == uid.strip()
    assert result.name == display.strip()
    assert result.country == ""
