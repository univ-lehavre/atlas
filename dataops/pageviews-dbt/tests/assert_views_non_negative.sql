-- Invariant métier du signal servi : un compteur de vues ne peut JAMAIS être
-- négatif. Une valeur négative trahirait un défaut d'agrégation (soustraction
-- fortuite) ou un brut corrompu et empoisonnerait le modèle de prévision. Ce test
-- échoue s'il existe une ligne de la timeline mensuelle dont `views` est négatif.
select university_id, month, views
from {{ ref('marts_views_timeline') }}
where views < 0
