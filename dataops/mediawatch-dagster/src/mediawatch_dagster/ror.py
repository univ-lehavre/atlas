"""Parsing pur du dump de référentiel d'organisations (schema v2) — sans I/O.

Le référentiel d'universités (ADR 0065) est ingéré depuis un **dump ouvert**
d'organisations de recherche (publié en accès libre, licence domaine public). Ce
module isole la connaissance du **format du dump** (schema v2), pour que l'asset
d'ingestion reste une simple orchestration. « ROR » n'apparaît qu'en prose : les
identifiants internes restent génériques (``ref_universities``, neutralité
ADR 0035) ; le code **permet** de charger un référentiel, il n'en impose aucun.

Faits du schema v2 encodés ici (vérifiés contre la doc du registre) :

- Le dump est un **tableau JSON** d'objets organisation.
- Le **type** est dans ``types[]`` (minuscules) ; une université/établissement du
  supérieur a ``"education"`` dans ce tableau. Tester l'APPARTENANCE (multi-types
  possibles : ``["education", "funder"]``), jamais l'égalité.
- L'**identifiant** est ``id`` (une URL ``https://<registre>/0…``).
- Le **nom d'affichage** est la valeur du ``names[]`` dont ``types`` contient
  ``"ror_display"`` (fallback : premier nom si aucun marqué).
- Le **pays** vient de ``locations[0].geonames_details.country_code`` (peut manquer).

Aucune dépendance Dagster/réseau ici ; ``from __future__ import annotations`` est OK.
"""

from __future__ import annotations

from dataclasses import dataclass

# Valeur du champ types qui dénote un établissement d'enseignement supérieur. NB :
# « education » est plus LARGE que « université » (couvre le supérieur non
# universitaire) ; on le documente et on l'assume (post-filtrer sur le nom serait une
# heuristique linguistique non neutre — la classification fine reste à l'ADR 0065).
EDUCATION_TYPE = "education"
_DISPLAY_NAME_TYPE = "ror_display"


@dataclass(frozen=True)
class University:
    """Une université projetée d'un enregistrement du dump (ligne du référentiel)."""

    university_id: str  # URL d'identifiant du registre
    name: str
    country: str  # code pays ISO (vide si absent)


def _display_name(record: dict) -> str | None:
    """Nom d'affichage : la valeur du ``names[]`` marqué ``ror_display`` (fallback 1er)."""
    names = record.get("names") or []
    for entry in names:
        if _DISPLAY_NAME_TYPE in (entry.get("types") or []):
            value = (entry.get("value") or "").strip()
            if value:
                return value
    for entry in names:
        value = (entry.get("value") or "").strip()
        if value:
            return value
    return None


def _country_code(record: dict) -> str:
    """Code pays de la 1re localisation (``""`` si absent)."""
    locations = record.get("locations") or []
    if not locations:
        return ""
    details = locations[0].get("geonames_details") or {}
    return (details.get("country_code") or "").strip()


def is_university(record: dict) -> bool:
    """``True`` si l'enregistrement est un établissement d'enseignement (type education).

    Tolère une entrée malformée : un champ ``types`` absent, ``None`` ou non
    itérable (scalaire injecté par une source non fiable) rend ``False`` au lieu
    de lever — on ne fait confiance qu'à une **liste** de types (forme réelle ROR).
    """
    types = record.get("types")
    if not isinstance(types, (list, tuple)):
        return False
    return EDUCATION_TYPE in types


def project_record(record: dict) -> University | None:
    """Projette un enregistrement en ``University`` (ou ``None`` si non éligible).

    Éligible = type ``education`` + un ``id`` + un nom d'affichage. Les enregistrements
    non universitaires ou incomplets sont ignorés silencieusement.
    """
    if not is_university(record):
        return None
    university_id = (record.get("id") or "").strip()
    name = _display_name(record)
    if not university_id or not name:
        return None
    return University(university_id=university_id, name=name, country=_country_code(record))


def project_dump(records: list[dict]) -> list[University]:
    """Projette un dump (tableau d'objets) en universités, triées par id (déterminisme)."""
    universities = [u for u in (project_record(r) for r in records) if u is not None]
    return sorted(universities, key=lambda u: u.university_id)
