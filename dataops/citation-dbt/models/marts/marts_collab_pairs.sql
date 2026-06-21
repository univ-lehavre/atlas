-- Feature CŒUR du pipeline (étape 3.3) : citations croisées article↔article par
-- PAIRE de chercheurs. Pour une paire (A, B), `cross_citations` = nombre d'arêtes
-- entre un article de A et un article de B, quel que soit le sens. 100 % de
-- nouveau code métier.
--
-- Construction :
--   1. chaque arête (curated_edges : œuvre citante → œuvre citée) est jointe aux
--      auteurs des deux œuvres (curated_authorships) → arêtes AUTEUR→AUTEUR
--      orientées (un auteur citant, un auteur cité) ;
--   2. on écarte les auto-citations (même auteur des deux côtés : pas un signal de
--      collaboration ENTRE chercheurs) ;
--   3. on canonicalise la paire en (author_a, author_b) avec author_a < author_b
--      (ordre lexical des ids) pour que (Alice,Bob) et (Bob,Alice) fusionnent ;
--   4. on compte par sens : `a_to_b` = arêtes où l'auteur citant est author_a,
--      `b_to_a` = où il est author_b ; `cross_citations` = a_to_b + b_to_a.
--
-- Une arête œuvre→œuvre génère une ligne auteur→auteur par couple d'auteurs (œuvres
-- co-écrites incluses) : c'est voulu (la citation lie tous les co-auteurs). On
-- DISTINCT sur (citing_work, cited_work, citing_author, cited_author) pour ne pas
-- compter deux fois une même citation dupliquée en amont.
--
-- Déterminisme strict (ADR 0057) : agrégats + ORDER BY stable (author_a, author_b).
-- Golden (fixtures) : paire (A1000000001, A1000000002) → cross_citations=3, a_to_b=2,
-- b_to_a=1.
{{ config(
    materialized='external',
    location=marts_location('collab'),
    options={'format': 'parquet'}
) }}

with directed_author_edges as (
    -- Arêtes auteur→auteur orientées (une par couple d'auteurs des deux œuvres),
    -- dédupliquées sur le tuple complet pour neutraliser d'éventuels doublons amont.
    select distinct
        e.citing_work_id,
        e.cited_work_id,
        ca_from.author_id as citing_author_id,
        ca_to.author_id   as cited_author_id
    from {{ ref('curated_edges') }} e
    join {{ ref('curated_authorships') }} ca_from
        on ca_from.work_id = e.citing_work_id
    join {{ ref('curated_authorships') }} ca_to
        on ca_to.work_id = e.cited_work_id
    where ca_from.author_id <> ca_to.author_id  -- pas d'auto-citation entre chercheurs
),

canonical as (
    -- Paire non orientée canonique + sens d'origine de la citation.
    select
        least(citing_author_id, cited_author_id)    as author_a,
        greatest(citing_author_id, cited_author_id) as author_b,
        case
            when citing_author_id = least(citing_author_id, cited_author_id)
                then 'a_to_b'
            else 'b_to_a'
        end as direction
    from directed_author_edges
)

select
    author_a,
    author_b,
    count(*)                                          as cross_citations,
    count(*) filter (where direction = 'a_to_b')      as a_to_b,
    count(*) filter (where direction = 'b_to_a')      as b_to_a
from canonical
-- Garde-fou de contrat : ne jamais émettre de paire à clé nulle. Sur un jeu sans
-- arête auteur→auteur (échantillon où les œuvres citées n'ont pas d'auteur
-- co-ingéré → canonical vide), la matérialisation externe DuckDB peut écrire une
-- ligne fantôme author_a/author_b NULL qui viole le contrat not_null du mart et
-- fait échouer le check GE bloquant ge_marts_collab. Ce filtre garantit un mart
-- soit vide, soit à clés non nulles — sans retirer aucune paire réelle (author_a/
-- author_b sont non nuls par construction : least()/greatest() sur des author_id
-- non nuls, l'auto-citation étant déjà écartée en amont).
where author_a is not null and author_b is not null
group by author_a, author_b
order by author_a, author_b
