-- Vues d'établissements typées/normalisées depuis le brut Parquet (vue de session
-- `:memory:`). Projection EXPLICITE (jamais SELECT *). On dérive :
--   - university_id : l'identifiant d'établissement (trim, non vide) ;
--   - view_month    : le PREMIER JOUR DU MOIS (YYYY-MM-01) de l'observation — la
--     série est MENSUELLE (dumps `pageview_complete` mensuels), saisonnalité
--     ANNUELLE. On tronque au mois dès le staging : c'est l'axe du chronogramme et
--     le grain servi au modèle de prévision ;
--   - views         : le compteur de vues (entier non négatif).
--
-- DÉDUPLICATION (dernier run gagne, ADR 0057) : la source glob `run=*` couvre les
-- multiples re-matérialisations d'une même partition mensuelle. Une même
-- observation (university_id, view_date, page_title) y apparaît plusieurs fois ; le
-- contenu PROJETÉ d'un enregistrement étant déterministe, garder UNE occurrence par
-- (university_id, view_date, page_title) suffit — on évite de compter N fois la même
-- vue. row_number sur la colonne `filename` (chemin du run) départage de façon stable
-- et déterministe.
with deduped as (
    select
        *,
        row_number() over (
            partition by university_id, view_date, page_title
            order by filename desc
        ) as _rn
    from {{ source('pageviews_raw', 'views') }}
    where nullif(trim(university_id), '') is not null
      and view_date is not null
      and coalesce(views, 0) >= 0
)
select
    nullif(trim(university_id), '')                    as university_id,
    view_date,
    -- Troncature au mois : YYYY-MM-01 (axe mensuel, saisonnalité annuelle). Le mart
    -- agrège ensuite par (établissement, mois).
    date_trunc('month', view_date)::date              as view_month,
    coalesce(views, 0)::bigint                         as views,
    nullif(trim(page_title), '')                      as page_title,
    nullif(trim(wiki), '')                            as wiki,
    nullif(trim(source_dump), '')                     as source_dump
from deduped
where _rn = 1
order by university_id, view_date, page_title
