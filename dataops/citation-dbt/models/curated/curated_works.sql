-- Œuvres canoniques, dédupliquées par work_id (défensif : le brut peut contenir
-- des doublons inter-partitions). Matérialisé en Parquet external sous un chemin
-- immuable dt=…/run=…/ (cf. macro curated_location). ORDER BY stable (work_id) →
-- même brut, même contenu trié (déterminisme, ADR 0057).
{{ config(
    materialized='external',
    location=curated_location('curated_works'),
    options={'format': 'parquet'}
) }}
select
    work_id,
    publication_year,
    title,
    display_name,
    work_type,
    doi,
    cited_by_count,
    referenced_works_count,
    fwci,
    is_retracted,
    is_paratext
from (
    select
        *,
        row_number() over (partition by work_id order by work_id) as _rn
    from {{ ref('stg_citation_works') }}
)
where _rn = 1
order by work_id
