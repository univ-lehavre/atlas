-- Unicité de la clé (author_id, subfield_id) dans marts_author_profiles : le GROUP BY
-- du modèle doit produire exactement une ligne par clé (ADR 0067, lot 2). Le test
-- échoue s'il renvoie une clé comptée plus d'une fois.
select
    author_id,
    subfield_id,
    count(*) as n
from {{ ref('marts_author_profiles') }}
group by author_id, subfield_id
having count(*) > 1
