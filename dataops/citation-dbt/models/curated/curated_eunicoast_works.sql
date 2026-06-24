-- Périmètre EUNICoast (ADR 0067, lot 1) : les works ayant AU MOINS UN auteur affilié
-- à un établissement EUNICoast (jointure des affiliations au seed sur le ROR) ET datant
-- de MOINS DE 10 ANS (`publication_year >= année courante − 10`). Porte le FWCI pour
-- l'aval (labels d'uplift, lot 3). Matérialisé en Parquet external immuable.
--
-- Grain : work_id (un work retenu une fois, quel que soit le nombre d'auteurs EUNICoast).
-- `min_year` est une var (défaut dérivé de 10 ans glissants) ; surchargeable au run et
-- en test pour figer la fenêtre (déterminisme, ADR 0057).
{{ config(
    materialized='external',
    location=curated_location('curated_eunicoast_works'),
    options={'format': 'parquet'}
) }}
with eunicoast_works as (
    -- work_id ayant ≥1 auteur affilié EUNICoast.
    select distinct ai.work_id
    from {{ ref('stg_citation_author_institutions') }} ai
    join {{ ref('ref_eunicoast') }} ref
        on ai.ror = ref.ror
),
min_year as (
    -- Borne « moins de 10 ans » : var explicite si fournie, sinon (année courante − 10).
    select coalesce(
        try_cast('{{ var("eunicoast_min_year", "") }}' as integer),
        cast(extract(year from current_date) as integer) - 10
    ) as y
)
select
    w.work_id,
    w.publication_year,
    w.fwci,
    w.title,
    w.work_type
from {{ ref('stg_citation_works') }} w
join eunicoast_works ew on ew.work_id = w.work_id
cross join min_year my
where w.publication_year >= my.y
order by w.work_id
