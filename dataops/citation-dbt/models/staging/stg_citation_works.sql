-- Œuvres typées depuis le MART EUNICoast (Parquet), vue de session `:memory:`.
-- Le mart est DÉJÀ filtré au périmètre (works ayant ≥1 auteur EUNICoast + année ≥ 2016)
-- et projeté en colonnes strictes par l'asset `mart_eunicoast` (ADR 0105) : plus de filtre
-- de scope ici, plus de brut JSONL.gz. La source renomme `id`→`work_id` — on le lit tel quel.
-- Projection EXPLICITE (jamais SELECT *) aux SEULES colonnes présentes dans le mart :
-- work_id, publication_year, title, cited_by_count, fwci. Les champs display_name/doi/
-- type/referenced_works_count/is_retracted/is_paratext ne sont PAS projetés par le mart.
--
-- DÉDUPLICATION : plus faite ici (ADR 0099). OpenAlex réédite un même `work_id` (FWCI
-- recalculé, affiliation modifiée) et le filigrane d'ingestion, additif, en accumule les
-- versions ; la déduplication est désormais faite EN AMONT par l'asset `mart_eunicoast`,
-- par RÉCENCE (`updated_date` décroissante — la version à jour fait autorité, pas le FWCI
-- le plus élevé qui pouvait figer une version périmée). Le mart arrive donc unique par
-- `work_id` ; le test `unique(work_id)` reste comme garde-fou de cet invariant.
select
    work_id,
    cast(publication_year as integer)  as publication_year,
    nullif(trim(title), '')            as title,
    cast(cited_by_count as bigint)     as cited_by_count,
    cast(fwci as double)               as fwci
from {{ source('citation_raw', 'works') }}
order by work_id
