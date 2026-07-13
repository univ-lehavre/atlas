"""Brut pré-filtré — asset ``prefiltered_raw`` (ADR 0103 §1.1, lot 2).

Premier étage du pipeline. Filtre le snapshot Parquet OpenAlex au **prédicat commun aux
deux passes** — ``publication_year >= 2016 ∧ type = 'article'`` — en **projection stricte**
(seules les colonnes utiles à l'aval, jamais ``abstract_inverted_index`` ni
``referenced_works``, lourds). Le résultat est le brut pré-filtré : l'intermédiaire dont la
reconstruction coûte un balayage complet du lac, et que ``persistence.mode`` met en cache
(``cache.py`` : ``full`` le garde entre runs, ``bounded`` le temps du run, ``ephemeral``
jamais).

La construction du SQL (``prefilter_sql``) est une fonction **PURE** (aucune I/O), donc
testable sans réseau ni DuckDB. L'exécution (lecture source → COPY vers le cache) dépend du
mode et vit dans l'asset.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

# Prédicat métier du brut pré-filtré (ADR 0103 §1.1). Année plancher FIXE (pas « année −
# N ») : périmètre déterministe et reproductible (ADR 0057). ``type`` STRICT = le champ
# ``work.type`` d'OpenAlex ; ``'article'`` exclut datasets, preprints, book-chapters…
MIN_YEAR = 2016
WORK_TYPE = "article"

# Projection STRICTE : les colonnes utiles aux deux passes + au profilage (lot 5).
#   - ``id``               : clé du work ;
#   - ``publication_year`` : borne temporelle (déjà filtrée, portée pour l'aval/audit) ;
#   - ``type``             : critère (porté pour vérification/audit) ;
#   - ``title``            : affichage aval ;
#   - ``authorships``      : co-auteurs + affiliations (ROR passe 1, author.id passe 2) ;
#   - ``topics``/``keywords`` : texte thématique de l'embedding (lot 5) ;
#   - ``updated_date``     : dédup par récence (ADR 0099).
# JAMAIS ``abstract_inverted_index`` / ``referenced_works`` (lourds, hors périmètre).
PROJECTED_COLUMNS = (
    "id",
    "publication_year",
    "type",
    "title",
    "authorships",
    "topics",
    "keywords",
    "updated_date",
)


def prefilter_sql(source_glob: str, min_year: int = MIN_YEAR, work_type: str = WORK_TYPE) -> str:
    """SQL DuckDB : projection stricte + filtre ``≥ min_year ∧ type = work_type`` (PURE).

    ``source_glob`` : chemin lisible par ``read_parquet`` (ex. ``s3://openalex/…/*.parquet``
    pour l'exécution réelle, ou ``file://…`` / un chemin local pour les tests). Le résultat
    ne porte QUE ``PROJECTED_COLUMNS`` — la projection est appliquée AVANT tout scan de
    données (DuckDB lit par colonne depuis le footer). Le prédicat est le même quel que soit
    le mode de cache : la correction ne dépend jamais du mode (ADR 0103 §3).
    """
    projection = ", ".join(PROJECTED_COLUMNS)
    # work_type est un littéral métier fixe (jamais une entrée utilisateur) : on l'échappe
    # tout de même par doublement des quotes, par principe (SQL DuckDB).
    safe_type = work_type.replace("'", "''")
    return f"""
        SELECT {projection}
        FROM read_parquet('{source_glob}')
        WHERE publication_year >= {int(min_year)}
          AND type = '{safe_type}'
    """
