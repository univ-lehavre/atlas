-- Organisations « universitaires d'aspect » ABSENTES du référentiel (ADR 0065) :
-- le canal d'ENRICHISSEMENT. L'heuristique de nom (regex multilingue) repère des
-- organisations vraisemblablement universitaires que le référentiel ne connaît pas
-- encore (jeunes établissements, variantes, translittérations). Elles ne sont PAS
-- comptées dans le chronogramme (le référentiel fait foi) ; elles sont listées ici
-- pour arbitrage humain → enrichir le seed ref_universities.
--
-- Matérialisé en Parquet external immuable. Grain : une ligne par nom d'organisation
-- candidat (dédupliqué), avec le nombre de mentions (pour prioriser l'arbitrage).
{{ config(
    materialized='external',
    location=curated_location('curated_university_candidates'),
    options={'format': 'parquet'}
) }}
with looks_university as (
    select m.*
    from {{ ref('stg_gkg_mentions') }} m
    where regexp_matches(m.org_name, '{{ var("university_name_regex") }}')
),
not_in_referential as (
    select l.*
    from looks_university l
    left join {{ ref('stg_ref_universities') }} r
        on l.org_key = r.org_key
    where r.university_id is null
)
select
    org_name,
    org_key,
    count(*)                          as mention_count,
    bool_or(translated)               as seen_translated
from not_in_referential
group by org_name, org_key
order by mention_count desc, org_name
