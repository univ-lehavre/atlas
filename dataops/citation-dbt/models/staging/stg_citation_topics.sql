-- Liens œuvre↔topic : une ligne par (œuvre, topic). `topics` est un array de structs
-- (schéma OpenAlex réel du mart) ; UNNEST l'explose, puis accès en notation point
-- (`t.id`, `t.subfield.id`). On projette la hiérarchie complète (subfield/field/domain,
-- chacun {id, display_name}) telle quelle : aucun filtre de score ici (provenance
-- complète, le seuil est une décision d'agrégation du mart par author_id — lot 2).
-- Le mart est déjà filtré au périmètre EUNICoast (ADR 0105) : plus de scope ici.
with exploded as (
    select
        work_id,
        unnest(topics) as t
    from {{ source('citation_raw', 'works') }}
)
select
    work_id,
    t.id                          as topic_id,
    t.display_name                as topic_display_name,
    cast(t.score as double)       as score,
    t.subfield.id                 as subfield_id,
    t.subfield.display_name       as subfield_display_name,
    t.field.id                    as field_id,
    t.field.display_name          as field_display_name,
    t.domain.id                   as domain_id,
    t.domain.display_name         as domain_display_name
from exploded
where t.id is not null
order by work_id, topic_id
