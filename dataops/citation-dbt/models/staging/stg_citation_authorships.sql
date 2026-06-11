-- Liens œuvre↔auteur : une ligne par (œuvre, auteur).
-- `authorships` est un array de structs ; UNNEST l'explose, puis accès en notation
-- point (`ash.author.id`). Les institutions (double imbrication) sont HORS périmètre
-- 3.2 (le plan ne livre que works/authors/authorships/edges).
with exploded as (
    select
        id                   as work_id,
        unnest(authorships)  as ash
    from {{ source('citation_raw', 'works') }}
)
select
    work_id,
    ash.author.id                          as author_id,
    ash.author_position                    as author_position,
    coalesce(ash.is_corresponding, false)  as is_corresponding
from exploded
where ash.author.id is not null
order by work_id, author_id
