-- Œuvres typées depuis le MART EUNICoast (Parquet), vue de session `:memory:`.
-- Le mart est DÉJÀ filtré au périmètre (works ayant ≥1 auteur EUNICoast + année ≥ 2016)
-- et projeté en colonnes strictes par l'asset `mart_eunicoast` (ADR 0105) : plus de filtre
-- de scope ici, plus de brut JSONL.gz. La source renomme `id`→`work_id` — on le lit tel quel.
-- Projection EXPLICITE (jamais SELECT *) aux SEULES colonnes présentes dans le mart :
-- work_id, publication_year, title, cited_by_count, fwci. Les champs display_name/doi/
-- type/referenced_works_count/is_retracted/is_paratext ne sont PAS projetés par le mart.
--
-- DÉDUPLICATION par work_id (drift L87) : OpenAlex publie la MÊME œuvre dans plusieurs
-- snapshots Parquet (records fusionnés/mis à jour) → à l'échelle réelle ~8786 work_id
-- apparaissent en double dans le mart. Le test `unique(work_id)` (sévérité error) échouait
-- donc, cassant `dbt build` et TOUT l'aval (embeddings, uplift, index pgvector), alors même
-- que la duplication est un fait connu d'OpenAlex. On garde UNE ligne par work — la plus
-- riche : fwci le plus élevé (métrique cible du modèle uplift), puis cited_by_count. La
-- normalisation vit ici (couche staging = contrat), l'aval ne double-compte plus. Invisible
-- au banc : l'échantillon n'a pas de doublon multi-snapshot.
select
    work_id,
    cast(publication_year as integer)  as publication_year,
    nullif(trim(title), '')            as title,
    cast(cited_by_count as bigint)     as cited_by_count,
    cast(fwci as double)               as fwci
from {{ source('citation_raw', 'works') }}
qualify
    row_number() over (
        partition by work_id
        order by fwci desc nulls last, cited_by_count desc nulls last
    )
    = 1
order by work_id
