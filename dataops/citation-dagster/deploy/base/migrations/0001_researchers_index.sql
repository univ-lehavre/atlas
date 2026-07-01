-- Migration versionnée 0001 — schéma de l'index « researchers » (étape 4.1/4.2).
--
-- L'asset index_load (citation_dagster.assets.index_load) CONSOMME ce schéma : il
-- y charge, idempotent par partition, le mart servi researchers (FTS lexical +
-- vecteur kNN). La CRÉATION du schéma est HORS de son périmètre (frontière
-- capacité/décision, cf. docstring index_load + ADR 0058 §4.1 « migrations
-- versionnées ») : c'est cette migration, appliquée AU DÉPLOIEMENT contre la base
-- `pgvector` (rôle pgvector), qui la fournit.
--
-- Idempotente (IF NOT EXISTS) : rejouable sans effet de bord. Le rôle pgvector doit
-- être propriétaire (l'asset écrit via le Secret pg-role-pgvector).
--
-- Dimension du vecteur = 384 (all-MiniLM-L6-v2, citation_dagster.embedding.EMBEDDING_DIM) :
-- garder en phase avec ce constant si le modèle d'embedding change.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS researchers (
    researcher_id text        NOT NULL,
    embedding     vector(384),          -- kNN sémantique (NULL si pas de vecteur)
    fts           tsvector,             -- recherche plein-texte lexicale
    dt            text        NOT NULL, -- partition (mois logique YYYY-MM)
    run           text        NOT NULL  -- run_id Dagster (immutabilité par rejeu)
);

-- kNN cosinus (ADR 0058 §4.1) : HNSW sur l'embedding.
CREATE INDEX IF NOT EXISTS researchers_embedding_hnsw
    ON researchers USING hnsw (embedding vector_cosine_ops);

-- FTS lexical (ADR 0058 §4.2) : GIN sur le tsvector.
CREATE INDEX IF NOT EXISTS researchers_fts_gin
    ON researchers USING gin (fts);

-- Filtre de partition (DELETE/relectures WHERE dt = ? AND run = ?).
CREATE INDEX IF NOT EXISTS researchers_dt_run
    ON researchers (dt, run);
