-- Œuvres canoniques, dédupliquées par work_id (défensif : le mart peut contenir des
-- fragments recouvrants inter-lots). Matérialisé en Parquet external sous un chemin
-- immuable dt=…/run=…/ (cf. macro curated_location). ORDER BY stable (work_id) →
-- même source, même contenu trié (déterminisme, ADR 0057). Colonnes RÉELLEMENT présentes
-- dans le mart EUNICoast (ADR 0105) : work_id, publication_year, title, cited_by_count, fwci.
{{ config(
    materialized='external',
    location=curated_location('curated_works'),
    options={'format': 'parquet'}
) }}
select
    work_id,
    publication_year,
    title,
    cited_by_count,
    fwci
from (
    select
        *,
        row_number() over (partition by work_id order by work_id) as _rn
    from {{ ref('stg_citation_works') }}
)
where _rn = 1
order by work_id
