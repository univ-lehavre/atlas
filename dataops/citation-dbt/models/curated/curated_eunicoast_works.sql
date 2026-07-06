-- Périmètre EUNICoast : simple PROJECTION de curated_works (ADR 0105). Le mart source est
-- DÉJÀ filtré en amont par l'asset `mart_eunicoast` (works ayant ≥1 auteur affilié EUNICoast
-- ET publiés depuis 2016) : la sélection de périmètre et la borne d'année vivent désormais
-- dans l'asset, plus dans dbt. Ce modèle reste une ANCRE nommée pour l'aval (labels d'uplift
-- `curated_pair_uplift_labels`, profils `marts_author_profiles`) qui le référencent. Porte le
-- FWCI. Matérialisé en Parquet external immuable ; ORDER BY stable (déterminisme, ADR 0057).
{{ config(
    materialized='external',
    location=curated_location('curated_eunicoast_works'),
    options={'format': 'parquet'}
) }}
select
    work_id,
    publication_year,
    fwci,
    title
from {{ ref('curated_works') }}
order by work_id
