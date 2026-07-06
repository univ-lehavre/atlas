-- Liens œuvre↔auteur : une ligne par (œuvre, auteur). `authorships` est un array de
-- structs (schéma OpenAlex réel du mart) ; UNNEST l'explose, puis accès en notation
-- point (`ash.author.id`). Le mart est déjà filtré au périmètre EUNICoast (ADR 0105) :
-- plus de restriction de scope ici. La source expose déjà `work_id` (renommé en amont).
with exploded as (
    select
        work_id,
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
