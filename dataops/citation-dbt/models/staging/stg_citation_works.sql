-- Œuvres typées depuis le MART EUNICoast (Parquet), vue de session `:memory:`.
-- Le mart est DÉJÀ filtré au périmètre (works ayant ≥1 auteur EUNICoast + année ≥ 2016)
-- et projeté en colonnes strictes par l'asset `mart_eunicoast` (ADR 0105) : plus de filtre
-- de scope ici, plus de brut JSONL.gz. La source renomme `id`→`work_id` — on le lit tel quel.
-- Projection EXPLICITE (jamais SELECT *) aux SEULES colonnes présentes dans le mart :
-- work_id, publication_year, title, cited_by_count, fwci. Les champs display_name/doi/
-- type/referenced_works_count/is_retracted/is_paratext ne sont PAS projetés par le mart.
select
    work_id,
    cast(publication_year as integer)  as publication_year,
    nullif(trim(title), '')            as title,
    cast(cited_by_count as bigint)     as cited_by_count,
    cast(fwci as double)               as fwci
from {{ source('citation_raw', 'works') }}
order by work_id
