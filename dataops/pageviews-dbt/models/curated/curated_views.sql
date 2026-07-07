-- Vues mensuelles CONSOLIDÉES par établissement (couche curated réutilisable).
-- Matérialisé en Parquet external immuable dt=…/run=…/ (macro curated_location).
--
-- Agrégation : le brut porte une ligne par (établissement, date, page, wiki). Un
-- même établissement peut être adossé à plusieurs pages/wikis (variantes de titre,
-- éditions linguistiques). On SOMME les vues sur le mois pour obtenir le total
-- d'attention par établissement — c'est la série que la prévision consomme. La
-- troncature mensuelle vient du staging (`view_month`), la saisonnalité est annuelle.
--
-- Grain : une ligne par (university_id, view_month). ORDER BY stable → déterminisme
-- (ADR 0057). Deux compteurs :
--   - views       : total des vues du mois (somme sur pages/wikis) ;
--   - n_days       : nombre de jours distincts observés dans le mois (observabilité :
--     un mois partiellement observé le signale, sans fausser le total).
{{ config(
    materialized='external',
    location=curated_location('curated_views'),
    options={'format': 'parquet'}
) }}
select
    university_id,
    view_month,
    sum(views)                    as views,
    count(distinct view_date)     as n_days
from {{ ref('stg_pageviews_views') }}
group by university_id, view_month
order by university_id, view_month
