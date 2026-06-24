-- Labels d'UPLIFT observé par paire de co-auteurs (ADR 0067, lot 3) : la CIBLE
-- d'entraînement du modèle. Pour une paire (author_a < author_b) ayant co-publié dans
-- le périmètre EUNICoast, l'uplift = FWCI obtenu ENSEMBLE moins la moyenne de leurs
-- FWCI SOLO de référence.
--
-- ANTI-FUITE TEMPORELLE (garde-fou ADR 0067, le point méthodologique critique) : la
-- baseline solo d'un auteur pour une co-publication d'année Y se calcule UNIQUEMENT sur
-- ses publications ANTÉRIEURES (année < Y) du périmètre — jamais le futur. On ne prédit
-- pas le passé avec le futur. Concrètement :
--   1. co-publications de la paire = works EUNICoast où a ET b sont co-auteurs, avec
--      leur année et leur fwci ;
--   2. pour chaque co-publication d'année Y, baseline solo de a (resp. b) = moyenne du
--      fwci de ses works d'année < Y où il n'est PAS co-auteur avec b (resp. a) ;
--   3. uplift de la co-publication = copub_fwci − avg(solo_a, solo_b) ;
--   4. label de la paire = moyenne des uplifts de ses co-publications (≥ 2 requises,
--      avec fwci et baseline des deux côtés).
--
-- Déterminisme strict (ADR 0057) : agrégats + ORDER BY stable. Matérialisé external.
{{ config(
    materialized='external',
    location=curated_location('curated_pair_uplift_labels'),
    options={'format': 'parquet'}
) }}

with eunicoast as (
    -- Publications du périmètre avec année + fwci (lot 1). On ne garde que celles
    -- portant un fwci (la cible repose dessus).
    select work_id, publication_year, fwci
    from {{ ref('curated_eunicoast_works') }}
    where fwci is not null
),

author_work as (
    -- (author_id, work_id, year, fwci) sur le périmètre.
    select
        ca.author_id,
        e.work_id,
        e.publication_year as year,
        e.fwci
    from {{ ref('curated_authorships') }} ca
    join eunicoast e on e.work_id = ca.work_id
),

copubs as (
    -- Co-publications d'une paire (a < b) : même work, deux auteurs distincts.
    select
        x.author_id as author_a,
        y.author_id as author_b,
        x.work_id,
        x.year,
        x.fwci as copub_fwci
    from author_work x
    join author_work y
        on x.work_id = y.work_id and x.author_id < y.author_id
),

-- Baseline solo ANTÉRIEURE : pour une co-publication (paire, work, year), moyenne du
-- fwci des works de l'auteur d'année < year où il n'est PAS avec le partenaire.
solo_a as (
    select
        c.author_a, c.author_b, c.work_id,
        avg(aw.fwci) as solo_fwci_a
    from copubs c
    join author_work aw
        on aw.author_id = c.author_a and aw.year < c.year
    -- exclure les works partagés avec author_b (ce ne serait pas du "solo")
    where not exists (
        select 1 from author_work bw
        where bw.work_id = aw.work_id and bw.author_id = c.author_b
    )
    group by c.author_a, c.author_b, c.work_id
),

solo_b as (
    select
        c.author_a, c.author_b, c.work_id,
        avg(bw.fwci) as solo_fwci_b
    from copubs c
    join author_work bw
        on bw.author_id = c.author_b and bw.year < c.year
    where not exists (
        select 1 from author_work aw
        where aw.work_id = bw.work_id and aw.author_id = c.author_a
    )
    group by c.author_a, c.author_b, c.work_id
),

copub_uplift as (
    -- Uplift par co-publication : exige une baseline DES DEUX côtés (anti-fuite).
    select
        c.author_a,
        c.author_b,
        c.copub_fwci - (sa.solo_fwci_a + sb.solo_fwci_b) / 2.0 as uplift
    from copubs c
    join solo_a sa on sa.author_a = c.author_a and sa.author_b = c.author_b and sa.work_id = c.work_id
    join solo_b sb on sb.author_a = c.author_a and sb.author_b = c.author_b and sb.work_id = c.work_id
)

select
    author_a,
    author_b,
    avg(uplift)   as uplift,
    count(*)      as n_copubs
from copub_uplift
group by author_a, author_b
having count(*) >= 2
order by author_a, author_b
