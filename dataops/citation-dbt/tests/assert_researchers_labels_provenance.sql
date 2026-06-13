-- Invariant de PROVENANCE pour marts_researchers (vrai à TOUTE échelle). Garantit la
-- dé-rivabilité chirurgicale (capacité de purge, ADR 0059 / lot 5) : aucune ligne du
-- mart ne doit être un « label-fantôme » — chaque (author_id, kind, label_id) servi
-- doit être justifié par au moins une publication source AU-DESSUS de son seuil, et
-- ses agrégats doivent être cohérents (weight > 0, freq >= 1).
--
-- Le test échoue s'il renvoie des lignes :
--   1. un (author_id, kind, label_id) du mart sans aucune trace dans la provenance
--      filtrée (label-fantôme) ;
--   2. un weight <= 0 ou un freq < 1 (un label n'existe que s'il a une publication
--      contributrice à score positif).
with source_labels as (
    -- Provenance attendue, filtrée aux mêmes seuils que le modèle.
    select ca.author_id, 'topic' as kind, t.topic_id as label_id
    from {{ ref('curated_work_topics') }} t
    join {{ ref('curated_authorships') }} ca on ca.work_id = t.work_id
    where t.score >= {{ var('topic_score_min') }}
    union
    select ca.author_id, 'keyword' as kind, k.keyword_id as label_id
    from {{ ref('curated_work_keywords') }} k
    join {{ ref('curated_authorships') }} ca on ca.work_id = k.work_id
    where k.score >= {{ var('keyword_score_min') }}
)

select
    m.author_id,
    m.kind,
    m.label_id,
    m.weight,
    m.freq
from {{ ref('marts_researchers') }} m
left join source_labels s
    on s.author_id = m.author_id
   and s.kind = m.kind
   and s.label_id = m.label_id
where s.author_id is null   -- label-fantôme : sortie sans trace dans la provenance
   or m.weight <= 0         -- poids incohérent
   or m.freq < 1            -- pas de publication contributrice
