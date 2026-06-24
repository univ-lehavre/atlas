-- Affiliations institutionnelles par (œuvre, auteur) : une ligne par
-- (work_id, author_id, ror). DOUBLE UNNEST : `authorships` (array de structs) puis
-- `authorships[].institutions` (array de structs imbriqué). Le ROR (`inst.ror`) est
-- l'identifiant ouvert d'établissement, renvoyé par OpenAlex sous forme d'URL complète
-- (`https://ror.org/0…`) — conservé tel quel pour la jointure au référentiel EUNICoast
-- (ADR 0067, lot 1). Auparavant hors périmètre (cf. stg_citation_authorships) ; projeté
-- ici pour le filtre EUNICoast.
with exploded as (
    select
        id                   as work_id,
        unnest(authorships)  as ash
    from {{ source('citation_raw', 'works') }}
),
with_inst as (
    select
        work_id,
        ash.author.id        as author_id,
        unnest(ash.institutions) as inst
    from exploded
    where ash.author.id is not null
)
select distinct
    work_id,
    author_id,
    inst.ror              as ror,
    inst.display_name     as institution_name,
    inst.country_code     as country_code
from with_inst
where inst.ror is not null
order by work_id, author_id, ror
