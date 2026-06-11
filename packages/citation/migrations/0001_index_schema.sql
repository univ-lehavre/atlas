-- Index d'exploration PostgreSQL/pgvector (étape 4.1).
--
-- L'index est DÉRIVÉ du mart servi (contrat Parquet + manifest, ADR 0029) : il sert
-- l'exploration et la recherche, jamais l'autorité du contrat. Il est régénérable et
-- chargé PAR PARTITION (dt, run) — un rechargement remplace la partition (idempotent).
--
-- Périmètre 4.1 : les deux tables qui ont une source réelle aujourd'hui —
--   - `pairs`        : depuis le mart servi `marts/collab/` (marts_collab_pairs) ;
--   - `researchers`  : vecteurs 384 depuis les EmbeddingProfile (researcher-profiles).
-- `works`/`authorships` n'ont pas encore de mart SERVI (hors contrat) : non créés ici.
--
-- Migrations idempotentes (IF NOT EXISTS) : rejouables sans état. Le nom SQL de
-- l'extension pgvector est `vector` (PAS `pgvector`) — cf. contrat cluster (ADR 0024).

CREATE EXTENSION IF NOT EXISTS vector;

-- Paires de chercheurs + signal de citations croisées (depuis le mart servi).
-- (dt, run) = coordonnées de partition immuable ; clé naturelle = (author_a, author_b, dt, run).
CREATE TABLE IF NOT EXISTS pairs (
    author_a        text   NOT NULL,
    author_b        text   NOT NULL,
    cross_citations bigint NOT NULL,
    a_to_b          bigint NOT NULL,
    b_to_a          bigint NOT NULL,
    dt              text   NOT NULL,  -- période de partition, YYYY-MM
    run             text   NOT NULL,  -- identifiant de run immuable
    PRIMARY KEY (author_a, author_b, dt, run)
);

-- Filtrage structuré par partition (chargement/purge par (dt, run)).
CREATE INDEX IF NOT EXISTS pairs_partition_idx ON pairs (dt, run);
-- Recherche des paires d'un chercheur donné.
CREATE INDEX IF NOT EXISTS pairs_author_a_idx ON pairs (author_a);
CREATE INDEX IF NOT EXISTS pairs_author_b_idx ON pairs (author_b);

-- Chercheurs + embedding sémantique (un vecteur PAR chercheur, all-MiniLM-L6-v2, 384).
-- Les vecteurs sont L2-normalisés en amont → distance cosinus ≡ produit interne.
CREATE TABLE IF NOT EXISTS researchers (
    researcher_id text        NOT NULL,
    embedding     vector(384) NOT NULL,
    dt            text        NOT NULL,
    run           text        NOT NULL,
    PRIMARY KEY (researcher_id, dt, run)
);

CREATE INDEX IF NOT EXISTS researchers_partition_idx ON researchers (dt, run);

-- Index pgvector pour la recherche sémantique kNN (HNSW, opclass cosinus).
CREATE INDEX IF NOT EXISTS researchers_embedding_hnsw_idx
    ON researchers USING hnsw (embedding vector_cosine_ops);
