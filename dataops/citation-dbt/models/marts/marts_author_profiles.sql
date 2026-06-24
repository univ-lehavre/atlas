-- Profil thématique par auteur SERVI (ADR 0067, lot 2) : la distribution pondérée
-- d'un auteur sur les SUBFIELDS OpenAlex, restreinte au périmètre EUNICoast.
--
-- Grain de sortie : une ligne par (author_id, subfield_id). Long format (auteur,
-- subfield, poids) — cohérent avec marts_researchers ; un consommateur reconstruit le
-- vecteur subfields par pivot. C'est l'une des deux représentations thématiques de
-- l'auteur (l'autre, l'embedding 384, vient de l'asset researcher_embeddings).
-- INVARIANT ADR 0067 : aucune identité ici n'est une FEATURE du modèle — author_id
-- est la CLÉ de jointure du profil, jamais une variable d'entrée.
--
-- Poids = SUM(score) des publications EUNICoast du chercheur portant le subfield (tf
-- brut, comme marts_researchers ; pas d'IDF/L2 — déterminisme par partition, ADR 0057).
-- freq = nombre de publications contributrices (transparence).
--
-- Périmètre : seules les publications de curated_eunicoast_works (≥1 auteur EUNICoast
-- ∩ <10 ans, lot 1) entrent dans le profil. Les co-auteurs externes sont profilés AUSSI
-- (cible de recommandation légitime, ADR 0067) — leur profil ne reflète que leurs works
-- du périmètre, ce qui est l'intention (recommander sur le réseau).
--
-- Purge chirurgicale RGPD (réutilise le mécanisme de marts_researchers) : ANTI-JOIN des
-- couples (author_id, work_id) opposés AVANT agrégation. Vide par défaut → no-op.
-- Déterminisme strict : agrégat + ORDER BY stable.
{{ config(
    materialized='external',
    location=marts_location('author_profiles'),
    options={'format': 'parquet'}
) }}

with opposed as (
    {{ opposition_pairs_cte() }}
),

eunicoast_topics as (
    -- Topics des publications du périmètre EUNICoast, avec leur subfield et score.
    select
        t.work_id,
        t.subfield_id,
        t.subfield_display_name,
        t.score
    from {{ ref('stg_citation_topics') }} t
    join {{ ref('curated_eunicoast_works') }} ew on ew.work_id = t.work_id
    where t.subfield_id is not null
),

author_subfield as (
    select
        ca.author_id,
        et.subfield_id,
        et.subfield_display_name,
        et.score,
        et.work_id
    from {{ ref('curated_authorships') }} ca
    join eunicoast_topics et on et.work_id = ca.work_id
    -- Purge RGPD : retire les couples (author_id, work_id) opposés avant agrégation.
    left join opposed o
        on o.author_id = ca.author_id and o.work_id = ca.work_id
    where o.author_id is null
)

select
    author_id,
    subfield_id,
    any_value(subfield_display_name)  as subfield,
    sum(score)                        as weight,
    count(distinct work_id)           as freq
from author_subfield
group by author_id, subfield_id
order by author_id, subfield_id
