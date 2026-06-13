-- Provenance topic↔œuvre canonique, dédupliquée sur (work_id, topic_id).
-- GRAIN PUBLICATION : c'est la couche qui rend la purge d'opposition chirurgicale
-- possible (ADR 0059) — on ne pré-agrège JAMAIS par author_id ici. L'agrégat
-- pondéré par author_id (lot 2) se re-dérive depuis cette provenance en excluant
-- les couples opposés. Parquet external immuable, ORDER BY stable (déterminisme,
-- ADR 0057). Provenance complète : aucun filtre de score (le seuil est au lot 2).
{{ config(
    materialized='external',
    location=curated_location('curated_work_topics'),
    options={'format': 'parquet'}
) }}
select distinct
    work_id,
    topic_id,
    topic_display_name,
    score,
    subfield_id,
    subfield_display_name,
    field_id,
    field_display_name,
    domain_id,
    domain_display_name
from {{ ref('stg_citation_topics') }}
order by work_id, topic_id
