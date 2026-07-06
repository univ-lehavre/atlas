-- Invariants vrais à TOUTE échelle pour marts_collab_pairs. Le test échoue s'il
-- renvoie des lignes :
--   1. la paire doit être en forme canonique (author_a < author_b) — donc jamais
--      d'auto-paire ni de doublon orienté ;
--   2. co_publications >= 1 (une paire n'existe que si elle a ≥1 co-publication).
select
    author_a,
    author_b,
    co_publications
from {{ ref('marts_collab_pairs') }}
where author_a >= author_b
   or co_publications < 1
