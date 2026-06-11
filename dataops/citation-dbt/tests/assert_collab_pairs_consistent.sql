-- Invariants vrais à TOUTE échelle pour marts_collab_pairs. Le test échoue s'il
-- renvoie des lignes :
--   1. cross_citations doit être la somme des deux sens (a_to_b + b_to_a) ;
--   2. la paire doit être en forme canonique (author_a < author_b) — donc jamais
--      d'auto-paire ni de doublon orienté ;
--   3. cross_citations >= 1 (une paire n'existe que si elle a au moins une arête).
select
    author_a,
    author_b,
    cross_citations,
    a_to_b,
    b_to_a
from {{ ref('marts_collab_pairs') }}
where cross_citations <> a_to_b + b_to_a
   or author_a >= author_b
   or cross_citations < 1
