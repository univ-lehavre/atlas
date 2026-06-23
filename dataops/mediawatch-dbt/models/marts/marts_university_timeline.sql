-- Mart « servi » : le CHRONOGRAMME (ADR 0064). Agrège les mentions qualifiées
-- université par (université, jour) → nombre d'articles. C'est le signal final
-- consommé par l'application (courbe temporelle pour une université sélectionnée).
--
-- Grain : une ligne par (university_id, event_date). Deux compteurs :
--   - n_articles  : nombre de DOCUMENTS distincts (lignes GKG) mentionnant
--     l'université ce jour-là (= « articles mentionnant l'université », ADR 0064) ;
--   - n_mentions  : nombre total de mentions (un document peut mentionner
--     l'université via plusieurs entrées — ici dédupliqué au document près en amont,
--     donc n_mentions == n_articles ; conservé pour lisibilité du contrat).
--
-- Matérialisé en Parquet external immuable dt=…/run=…/ (macro marts_location).
-- ORDER BY stable → déterminisme (ADR 0057). Son manifest.json (contrat servi) est
-- écrit EN DERNIER par l'asset Dagster timeline_manifest.
{{ config(
    materialized='external',
    location=marts_location('university_timeline'),
    options={'format': 'parquet'}
) }}
select
    university_id,
    university_name,
    event_date,
    count(distinct record_id)  as n_articles,
    count(*)                   as n_mentions
from {{ ref('curated_university_mentions') }}
group by university_id, university_name, event_date
order by university_id, event_date
