-- Œuvres typées/nettoyées depuis le brut JSONL.gz (vue de session `:memory:`).
-- Projection EXPLICITE (jamais SELECT *) : on neutralise la colonne fantôme
-- `updated_date` (issue du chemin Hive, pas du JSON) et on fige les types.
-- Les ids restent des URLs OpenAlex complètes (https://openalex.org/W…) : la
-- déduplication d'arêtes (curated_edges) se fait sur ces URLs.
select
    id                                      as work_id,
    cast(publication_year as integer)       as publication_year,
    nullif(trim(title), '')                 as title,
    nullif(trim(display_name), '')          as display_name,
    type                                    as work_type,
    doi,
    cast(cited_by_count as bigint)          as cited_by_count,
    cast(referenced_works_count as bigint)  as referenced_works_count,
    cast(fwci as double)                    as fwci,
    coalesce(is_retracted, false)           as is_retracted,
    coalesce(is_paratext, false)            as is_paratext
from {{ source('citation_raw', 'works') }}
order by work_id
