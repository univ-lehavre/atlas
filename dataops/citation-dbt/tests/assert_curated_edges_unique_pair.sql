-- Invariant d'unicité du couple (citant, cité) dans curated_edges, vrai à toute
-- échelle : la dédup (SELECT DISTINCT) ne doit jamais laisser de doublon d'arête.
-- Le test échoue s'il renvoie des lignes (un couple compté plus d'une fois).
select
    citing_work_id,
    cited_work_id,
    count(*) as n
from {{ ref('curated_edges') }}
group by 1, 2
having count(*) > 1
