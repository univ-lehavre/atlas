-- Provenance mot-clé↔œuvre canonique, dédupliquée sur (work_id, keyword_id).
-- GRAIN PUBLICATION (ADR 0059) : socle de la purge chirurgicale, jamais agrégé
-- par author_id ici. Parquet external immuable, ORDER BY stable (déterminisme,
-- ADR 0057). Provenance complète : aucun filtre de score (le seuil ≥ 0,3 est
-- appliqué à l'agrégat par author_id du lot 2).
{{ config(
    materialized='external',
    location=curated_location('curated_work_keywords'),
    options={'format': 'parquet'}
) }}
select distinct
    work_id,
    keyword_id,
    keyword_display_name,
    score
from {{ ref('stg_citation_keywords') }}
order by work_id, keyword_id
