-- Arêtes brutes œuvre→référence : une ligne par (œuvre citante, œuvre citée).
-- `referenced_works` est un array de strings (URLs OpenAlex) ; UNNEST l'explose.
-- Non dédupliqué ici (la dédup est faite en curated_edges) ; on filtre seulement
-- les références nulles.
with exploded as (
    select
        id                        as citing_work_id,
        unnest(referenced_works)  as cited_work_id
    from {{ source('citation_raw', 'works') }}
)
select
    citing_work_id,
    cited_work_id
from exploded
where cited_work_id is not null
order by citing_work_id, cited_work_id
