-- Auteurs canoniques, dédupliqués par author_id. orcid conservé nullable.
{{ config(
    materialized='external',
    location=curated_location('curated_authors'),
    options={'format': 'parquet'}
) }}
select
    author_id,
    orcid,
    display_name,
    works_count,
    cited_by_count
from (
    select
        *,
        row_number() over (partition by author_id order by author_id) as _rn
    from {{ ref('stg_citation_authors') }}
)
where _rn = 1
order by author_id
