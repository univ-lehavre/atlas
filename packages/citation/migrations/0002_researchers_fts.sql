-- Recherche plein-texte lexicale (FTS) par chercheur (étape 4.2).
--
-- Ajoute à `researchers` une colonne `tsvector` indexée (GIN) pour la recherche par
-- mots-clés. Le document FTS d'un chercheur est construit à partir de ses **labels de
-- topics et mots-clés** (issus de `researcher-profiles`, même source que les vecteurs de
-- l'étape 4.3) — recherche lexicale PAR CHERCHEUR (pas par titre d'œuvre : le mart servi
-- ne porte pas de titre ; cf. la note de périmètre de l'étape 4.2).
--
-- Migration idempotente (IF NOT EXISTS / DROP NOT NULL rejouable).

-- Un chercheur peut avoir un profil lexical (fts) sans embedding (et inversement) : on
-- relâche la non-nullité de `embedding` pour permettre les lignes FTS-seules (4.2 avant
-- 4.3) et les lignes vecteur-seules. La clé (researcher_id, dt, run) reste l'identité.
ALTER TABLE researchers ALTER COLUMN embedding DROP NOT NULL;

-- Document FTS : tsvector des labels topics/mots-clés du chercheur.
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS fts tsvector;

-- Index GIN pour la recherche plein-texte (`fts @@ to_tsquery(...)`).
CREATE INDEX IF NOT EXISTS researchers_fts_gin ON researchers USING gin (fts);
