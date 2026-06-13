-- Liens œuvre↔mot-clé : une ligne par (œuvre, mot-clé). `keywords` est un array
-- de structs plats ; UNNEST l'explose, puis accès en notation point (`k.id`).
-- Aucun filtre de score ici : la provenance conserve même les scores faibles
-- (le seuil ≥ 0,3 s'applique au mart par author_id — lot 2, cf. ADR 0059).
with exploded as (
    select
        id               as work_id,
        unnest(keywords) as k
    from {{ source('citation_raw', 'works') }}
)
select
    work_id,
    k.id                     as keyword_id,
    k.display_name           as keyword_display_name,
    cast(k.score as double)  as score
from exploded
where k.id is not null
order by work_id, keyword_id
