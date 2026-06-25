"""Tests basés sur les propriétés du parsing GKG 2.1 (PBT, ADR 0072).

Complètent (ne remplacent pas) les tests par l'exemple de ``test_gkg.py`` :
là où ceux-ci vérifient le fixture figé ``gkg-sample``, ceux-ci énoncent des
**invariants vrais pour toute entrée** et laissent Hypothesis générer des
centaines d'entrées pour tenter de les falsifier. Cible : les fonctions PURES à
entrée non fiable de ``gkg.py`` (``parse_master_list``, ``project_csv``,
``_split_enhanced_organizations``). Hermétiques (génération en mémoire, sans
réseau ni horloge — ADR 0057).
"""

from hypothesis import given
from hypothesis import strategies as st

from mediawatch_dagster import gkg

# ── parse_master_list : robustesse sur texte arbitraire ──────────────────────


@given(st.text())
def test_parse_master_list_never_raises_on_arbitrary_text(text: str) -> None:
    """Sur n'importe quel texte, ``parse_master_list`` renvoie une liste — jamais
    d'exception (la robustesse affirmée devient prouvée)."""
    result = gkg.parse_master_list(text)
    assert isinstance(result, list)
    assert all(isinstance(f, gkg.GkgFile) for f in result)


@given(st.text())
def test_parse_master_list_output_sorted_and_well_formed(text: str) -> None:
    """Tout fichier retenu a un timestamp de 14 chiffres, et la liste est triée
    par timestamp croissant (= ordre chronologique)."""
    files = gkg.parse_master_list(text)
    timestamps = [f.timestamp for f in files]
    assert all(len(ts) == 14 and ts.isdigit() for ts in timestamps)
    assert timestamps == sorted(timestamps)


# Lignes "<taille> <md5> <url>" bien typées : nombres + URL .gkg.csv.zip à timestamp.
_TS = st.text(alphabet="0123456789", min_size=14, max_size=14)
_VALID_LINE = st.builds(
    lambda size, md5, ts: f"{size} {md5} http://x/gdeltv2/{ts}.gkg.csv.zip",
    st.integers(min_value=0, max_value=10**9),
    st.text(alphabet="0123456789abcdef", min_size=1, max_size=32),
    _TS,
)


@given(st.lists(_VALID_LINE))
def test_parse_master_list_extracts_every_valid_line(lines: list[str]) -> None:
    """Toute ligne bien formée pointant un ``.gkg.csv.zip`` est extraite : le nombre
    de fichiers retenus égale le nombre de timestamps DISTINCTS fournis (le tri ne
    déduplique pas, mais chaque ligne valide produit exactement une entrée)."""
    text = "\n".join(lines)
    files = gkg.parse_master_list(text)
    assert len(files) == len(lines)


# ── project_csv / project_row : robustesse sur contenu arbitraire ────────────


@given(st.text())
def test_project_csv_never_raises_on_arbitrary_text(text: str) -> None:
    """Sur n'importe quel texte (CSV malformé, vide, binaire-ish), ``project_csv``
    renvoie une liste de mentions, jamais une exception."""
    mentions = gkg.project_csv(text)
    assert isinstance(mentions, list)
    assert all(isinstance(m, gkg.OrgMention) for m in mentions)


# Cellule de champ GKG : du texte SANS tabulation ni saut de ligne (le séparateur
# de colonnes est la TAB, celui de lignes le \n — on génère des cellules valides).
_CELL = st.text(
    alphabet=st.characters(blacklist_characters="\t\r\n", blacklist_categories=("Cs",)),
    max_size=20,
)


@given(st.lists(_CELL, min_size=0, max_size=40))
def test_project_row_never_raises_on_arbitrary_fields(fields: list[str]) -> None:
    """Sur une ligne de N colonnes arbitraires (tronquée, surnuméraire), ``project_row``
    renvoie une liste, jamais une exception ; et n'émet rien sous 27 colonnes."""
    mentions = gkg.project_row(fields)
    assert isinstance(mentions, list)
    if len(fields) < 27:
        assert mentions == []


# ── _split_enhanced_organizations : virgules internes, déduplication ─────────

# Nom d'organisation arbitraire POUVANT contenir des virgules (le cas dur du format),
# mais ni ';' (séparateur d'entrées) ni espaces de bord parasites.
_ORG_NAME = st.text(
    alphabet=st.characters(blacklist_characters=";\t\r\n", blacklist_categories=("Cs",)),
    min_size=1,
    max_size=15,
)


@given(st.text())
def test_split_enhanced_orgs_never_raises_and_dedupes(field: str) -> None:
    """Sur un champ V2ENHANCEDORGANIZATIONS arbitraire : renvoie une liste de noms,
    jamais d'exception, et le résultat est dédupliqué en préservant l'ordre."""
    names = gkg._split_enhanced_organizations(field)
    assert isinstance(names, list)
    # Déduplication : aucun doublon, ordre de 1re apparition préservé.
    assert len(names) == len(set(names))
    assert names == list(dict.fromkeys(names))


@given(_ORG_NAME, st.integers(min_value=0, max_value=10**6))
def test_split_strips_only_trailing_offset_keeps_internal_comma(name: str, offset: int) -> None:
    """L'offset final ``,<digits>`` est retiré sans amputer un nom à virgules internes.

    On construit ``<nom>,<offset>`` : le parser doit retrouver exactement ``<nom>``
    (rstrip de l'espace de bord près) — la virgule INTERNE du nom ne doit pas être
    confondue avec le séparateur d'offset (seul le DERNIER segment numérique l'est).
    """
    entry = f"{name},{offset}"
    names = gkg._split_enhanced_organizations(entry)
    expected = name.strip()
    if expected:
        assert names == [expected]
    else:
        # Un nom vide après strip n'émet rien (entrée ignorée par robustesse).
        assert names == []
