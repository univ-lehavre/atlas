{#
  Clé de rapprochement normalisée d'un nom d'organisation (ADR 0065).

  Appliquée IDENTIQUEMENT au nom extrait du GKG (stg_gkg_mentions) et au nom du
  référentiel (stg_ref_universities) pour que la jointure d'appariement fonctionne
  malgré les variations de casse, d'accents et de ponctuation. Transformations
  déterministes, sans dépendance externe :
    1. minuscule ;
    2. accents retirés (strip_accents) ;
    3. ponctuation retirée (virgules, points… → espace) — « University of
       California, Berkeley » et « University of California Berkeley » deviennent
       identiques ;
    4. espaces compactés et trimés.

  Volontairement simple : on ne fait pas de matching flou (Levenshtein) ici — c'est
  un appariement EXACT sur la forme normalisée. Le rappel résiduel passe par
  l'heuristique de nom (élargir le référentiel), pas par un flou silencieux.
#}
{% macro normalize_org_key(column) %}
trim(
  regexp_replace(
    regexp_replace(
      lower(strip_accents({{ column }})),
      '[^a-z0-9 ]', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  )
)
{% endmacro %}
