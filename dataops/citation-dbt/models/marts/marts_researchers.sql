-- Mart lexical SERVI par chercheur (étape 4, lot 2) : un sac de labels pondérés
-- par `author_id`, agrégé depuis la provenance grain-publication du lot 1.
--
-- Grain de sortie : une ligne par (author_id, kind, label_id), kind ∈ {topic, keyword}.
-- Le long format (chercheur, terme, poids) est ce qu'un index inversé FTS consomme —
-- pas un array de labels par auteur (cf. ADR 0059, issue #379).
--
-- Poids = SUM(score) des publications du chercheur portant le label : chaque
-- apparition ajoute son score, donc « fréquence × score » au sens du tf brut de
-- l'algo de référence (packages/researcher-profiles/.../tfidf-profile.ts:46-48).
-- On NE calcule PAS l'IDF ni la normalisation L2 de la référence : tous deux sont
-- relatifs au corpus (IDF = f(N chercheurs)), ce qui casserait la localité de
-- partition et le déterminisme par partition d'un mart servi (ADR 0057). `freq`
-- (nombre de publications contributrices) est porté en colonne pour la transparence.
--
-- Filtre de score DIFFÉRENCIÉ par type (vars topic_score_min / keyword_score_min),
-- appliqué au grain (work_id, label) AVANT agrégation : un score sous le seuil
-- n'entre pas dans la somme. Diverge du seuil unique 0,3 du plan/ADR 0059/issue #379
-- (assumé : distributions topics vs keywords très différentes — cf. dbt_project.yml).
--
-- Provenance re-dérivable (capacité de purge chirurgicale, lot 5) : chaque ligne de
-- sortie mappe 1-pour-1 vers ses (author_id, work_id, label) sources. Le filtre
-- d'opposition (author_id, work_id) du lot 5 s'injectera dans les CTE sans toucher
-- le SELECT final. Déterminisme strict (ADR 0057) : agrégat + ORDER BY stable.
--
-- Le produit (auteurs d'un work × labels d'un work) est VOULU : chaque co-auteur
-- hérite des labels de la publication. `freq = count(distinct work_id)` (et non
-- count(*)) reste juste car curated_authorships et curated_work_* sont déjà DISTINCT
-- à leur grain.
{{ config(
    materialized='external',
    location=marts_location('researchers'),
    options={'format': 'parquet'}
) }}

with topics_per_author as (
    select
        ca.author_id,
        'topic'              as kind,
        t.topic_id           as label_id,
        t.topic_display_name as label,
        t.work_id,
        t.score
    from {{ ref('curated_work_topics') }} t
    join {{ ref('curated_authorships') }} ca
        on ca.work_id = t.work_id
    where t.score >= {{ var('topic_score_min') }}
),

keywords_per_author as (
    select
        ca.author_id,
        'keyword'              as kind,
        k.keyword_id           as label_id,
        k.keyword_display_name as label,
        k.work_id,
        k.score
    from {{ ref('curated_work_keywords') }} k
    join {{ ref('curated_authorships') }} ca
        on ca.work_id = k.work_id
    where k.score >= {{ var('keyword_score_min') }}
),

labels_per_author as (
    select * from topics_per_author
    union all
    select * from keywords_per_author
)

select
    author_id,
    kind,
    label_id,
    any_value(label)           as label,
    sum(score)                 as weight,
    count(distinct work_id)    as freq
from labels_per_author
group by author_id, kind, label_id
order by author_id, kind, label_id
