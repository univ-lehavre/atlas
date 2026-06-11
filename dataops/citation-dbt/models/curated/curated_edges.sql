-- Arêtes article→référence DÉDUPLIQUÉES : une ligne par couple (œuvre citante,
-- œuvre citée). Cœur de 3.2 — alimente la feature citations croisées (3.3).
-- Dédup déterministe (SELECT DISTINCT + ORDER BY stable) ; auto-citations exclues.
-- Golden attendu sur les fixtures : 3 arêtes (W101→W201, W102→W201, W202→W101).
{{ config(
    materialized='external',
    location=curated_location('curated_edges'),
    options={'format': 'parquet'}
) }}
select distinct
    citing_work_id,
    cited_work_id
from {{ ref('stg_citation_referenced_works') }}
where citing_work_id <> cited_work_id
order by citing_work_id, cited_work_id
