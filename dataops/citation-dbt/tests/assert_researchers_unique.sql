-- Unicité de la clé (author_id, kind, label_id) dans marts_researchers : le GROUP BY
-- du modèle doit produire exactement une ligne par clé. Le test échoue s'il renvoie
-- une clé comptée plus d'une fois.
select
    author_id,
    kind,
    label_id,
    count(*) as n
from {{ ref('marts_researchers') }}
group by author_id, kind, label_id
having count(*) > 1
