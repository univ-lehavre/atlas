-- Unicité de la paire (author_a, author_b) dans marts_collab_pairs : le GROUP BY du
-- modèle doit produire exactement une ligne par paire. Le test échoue s'il renvoie
-- une paire comptée plus d'une fois.
select
    author_a,
    author_b,
    count(*) as n
from {{ ref('marts_collab_pairs') }}
group by author_a, author_b
having count(*) > 1
