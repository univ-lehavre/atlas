-- Mart « servi » : la TIMELINE MENSUELLE des vues (contrat de sortie, ADR 0029).
-- C'est le signal final consommé par l'asset de prévision Dagster : la fonction
-- pure `forecast_model.forecast(timeline_rows)` attend exactement des lignes
-- `(university_id, month, views)` — d'où les trois colonnes, dans cet ordre et à ce
-- grain (une ligne par (établissement, mois)).
--
-- La série est MENSUELLE (dumps mensuels), saisonnalité ANNUELLE ; les horizons
-- métier de la prévision sont month_1 (1 mois), month_3 (3 mois), year_1 (12 mois).
-- La densification des mois manquants et l'ingénierie de features (mois sin/cos,
-- lags) sont faites côté modèle (forecast_model) ; le mart livre la série OBSERVÉE
-- brute et déterministe.
--
-- Matérialisé en Parquet external immuable dt=…/run=…/ (macro marts_location).
-- ORDER BY stable → déterminisme (ADR 0057). Son manifest.json (contrat servi,
-- validé par sha256/bytes) est écrit EN DERNIER par l'asset Dagster du mart.
{{ config(
    materialized='external',
    location=marts_location('views_timeline'),
    options={'format': 'parquet'}
) }}
select
    university_id,
    view_month  as month,
    views
from {{ ref('curated_views') }}
order by university_id, month
