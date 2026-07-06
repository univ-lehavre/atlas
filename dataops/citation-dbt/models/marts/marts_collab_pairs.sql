-- Feature CŒUR du pipeline : CO-AUTORAT par PAIRE de chercheurs. Pour une paire
-- (author_a < author_b), `co_publications` = nombre de works que les deux ont
-- CO-SIGNÉS (count distinct work_id où a ET b sont tous deux auteurs). 100 % de code
-- métier — le signal de collaboration est désormais le co-autorat direct (plus les
-- citations croisées : le mart EUNICoast ne porte plus referenced_works, ADR 0105).
--
-- Construction :
--   1. self-join de `curated_authorships` sur `work_id` (deux auteurs distincts d'un
--      même work) → couples d'auteurs co-signataires par publication ;
--   2. canonicalisation de la paire en (author_a, author_b) avec author_a < author_b
--      (ordre lexical des ids) pour que (Alice,Bob) et (Bob,Alice) fusionnent ;
--   3. co_publications = count(distinct work_id) par paire canonique.
--
-- Déterminisme strict (ADR 0057) : agrégat + ORDER BY stable (author_a, author_b).
-- Golden (fixtures) : (Alice, Bob) → 3 ; (Alice, Carol) → 2 ; (Bob, Carol) → 1.
{{ config(
    materialized='external',
    location=marts_location('collab'),
    options={'format': 'parquet'}
) }}

with pairs as (
    -- Couples d'auteurs co-signataires d'un même work, forme canonique (a < b).
    select
        ca_a.author_id as author_a,
        ca_b.author_id as author_b,
        ca_a.work_id
    from {{ ref('curated_authorships') }} ca_a
    join {{ ref('curated_authorships') }} ca_b
        on ca_a.work_id = ca_b.work_id
        and ca_a.author_id < ca_b.author_id
)

select
    author_a,
    author_b,
    count(distinct work_id) as co_publications
from pairs
group by author_a, author_b
order by author_a, author_b
