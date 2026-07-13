-- Migration versionnée 0001 — schéma de l'index « scholar_profiles » (lot 5, ADR 0103 §2).
--
-- L'asset index_load (scholar_network_dagster.assets.index_load) CONSOMME ce schéma : il
-- y charge, idempotent par partition, le profil sémantique par chercheur (vecteur 384). La
-- CRÉATION du schéma est HORS de son périmètre (frontière capacité/décision) : c'est cette
-- migration, appliquée AU DÉPLOIEMENT contre la base `pgvector` (rôle pgvector), qui la
-- fournit. atlas FOURNIT le .sql ; cluster l'applique en hook PreSync (frontière ADR 0033).
--
-- Idempotente (IF NOT EXISTS) : rejouable sans effet de bord. Le rôle pgvector doit être
-- propriétaire (l'asset écrit via le Secret pg-role-pgvector).
--
-- Dimension = 384 (all-MiniLM-L6-v2, scholar_network_dagster.embedding.EMBEDDING_DIM) : garder
-- en phase avec cette constante si le modèle d'embedding change. Pas de FTS ici (le produit
-- est la SIMILARITÉ vectorielle entre chercheurs, ADR 0103 §2), à la différence de citation.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS scholar_profiles (
    researcher_id text        NOT NULL, -- author_id OpenAlex du chercheur identifié
    embedding     vector(384) NOT NULL, -- profil sémantique (moyenne des articles + L2)
    dt            text        NOT NULL, -- partition (mois logique YYYY-MM)
    run           text        NOT NULL  -- run_id Dagster (immutabilité par rejeu)
);

-- kNN cosinus : HNSW sur l'embedding (recherche de chercheurs similaires, ADR 0103 §2).
CREATE INDEX IF NOT EXISTS scholar_profiles_embedding_hnsw
    ON scholar_profiles USING hnsw (embedding vector_cosine_ops);

-- Filtre de partition (DELETE/relectures WHERE dt = ? AND run = ?).
CREATE INDEX IF NOT EXISTS scholar_profiles_dt_run
    ON scholar_profiles (dt, run);
