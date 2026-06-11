-- Liens œuvre↔auteur canoniques, dédupliqués sur (work_id, author_id).
{{ config(
    materialized='external',
    location=curated_location('curated_authorships'),
    options={'format': 'parquet'}
) }}
select distinct
    work_id,
    author_id,
    author_position,
    is_corresponding
from {{ ref('stg_citation_authorships') }}
order by work_id, author_id
