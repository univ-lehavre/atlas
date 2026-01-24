# Analyse des bases de données pour Atlas Verify

Ce document analyse les bases de données open source adaptées au stockage, requêtage et mise à jour des données de fiabilisation bibliographique sur Kubernetes.

> **Voir aussi :**
> - [Fiabilisation auteur](./author-verification.md) - Modèle de données et workflows de vérification
> - [Bases avancées & Recherche](./advanced-databases.md) - ArangoDB, vector search, recherche multi-bases

## Exigences

### Caractéristiques des données

| Aspect | Exigence |
|--------|----------|
| **Volume** | ~10M raw records, ~1M profils, ~100M candidats potentiels |
| **Vélocité** | Import batch initial, puis ~10k updates/jour |
| **Variété** | JSONB (données brutes hétérogènes) + relationnel (liens vérifiés) |
| **Véracité** | Audit trail complet, immutabilité des décisions |

### Patterns d'accès

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PATTERNS D'ACCÈS PRINCIPAUX                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LECTURES (80%)                                                              │
│  ─────────────                                                               │
│  1. Candidats pendants par profil (paginated, filtré, trié)                 │
│  2. Publications vérifiées par profil (paginated, recherche full-text)      │
│  3. Détail d'un candidat avec sources brutes jointes                        │
│  4. Statistiques agrégées par profil                                        │
│  5. Recherche full-text sur titres et auteurs                               │
│                                                                              │
│  ÉCRITURES (20%)                                                             │
│  ──────────────                                                              │
│  1. Import batch de raw records (INSERT bulk)                               │
│  2. Création de candidats (INSERT bulk après matching)                      │
│  3. Décisions de vérification (INSERT + UPDATE status)                      │
│  4. Mise à jour profil utilisateur (UPDATE ponctuel)                        │
│                                                                              │
│  PATTERNS SPÉCIAUX                                                           │
│  ─────────────────                                                           │
│  1. Déduplication par checksum (UPSERT)                                     │
│  2. Requêtes JSONB (extraction champs, GIN indexes)                         │
│  3. Time-series pour audit trail (append-only)                              │
│  4. Full-text search multilingue                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exigences Kubernetes

| Aspect | Exigence |
|--------|----------|
| **Haute disponibilité** | Réplication synchrone, failover automatique |
| **Scalabilité** | Scale horizontale pour les lectures |
| **Backup** | Point-in-time recovery, backups S3 |
| **Observabilité** | Métriques Prometheus, logs structurés |
| **Opérations** | Helm charts matures, operators Kubernetes |

---

## Analyse des solutions

### 1. PostgreSQL

#### Présentation

PostgreSQL est la base relationnelle open source la plus complète, avec un excellent support JSONB et des extensions puissantes.

#### Points forts pour Atlas Verify

| Aspect | Évaluation |
|--------|------------|
| **JSONB** | ⭐⭐⭐⭐⭐ Excellent - GIN indexes, opérateurs, fonctions |
| **Relationnel** | ⭐⭐⭐⭐⭐ ACID complet, FK, triggers |
| **Full-text** | ⭐⭐⭐⭐ Bon - tsvector, multilangue |
| **Scalabilité** | ⭐⭐⭐ Moyen - réplication read, pas de sharding natif |
| **Kubernetes** | ⭐⭐⭐⭐⭐ Operators matures (CloudNativePG, Zalando, CrunchyData) |

#### Operators Kubernetes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL OPERATORS KUBERNETES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLOUDNATIVEPG                                                               │
│  ─────────────                                                               │
│  Maintenu par : EDB (EnterpriseDB)                                          │
│  Maturité     : ⭐⭐⭐⭐⭐ Production-ready, CNCF Sandbox                    │
│  Features     : HA, backups S3, PITR, rolling updates, connection pooling   │
│  Helm         : cloudnative-pg/cloudnative-pg                               │
│  Docs         : https://cloudnative-pg.io                                   │
│                                                                              │
│  ZALANDO POSTGRES OPERATOR                                                   │
│  ────────────────────────                                                    │
│  Maintenu par : Zalando                                                     │
│  Maturité     : ⭐⭐⭐⭐⭐ Production-ready, utilisé en interne             │
│  Features     : HA (Patroni), backups WAL-G, connection pooling (PgBouncer) │
│  Helm         : postgres-operator-charts/postgres-operator                  │
│  Docs         : https://github.com/zalando/postgres-operator                │
│                                                                              │
│  CRUNCHYDATA PGO                                                             │
│  ───────────────                                                             │
│  Maintenu par : Crunchy Data                                                │
│  Maturité     : ⭐⭐⭐⭐⭐ Enterprise-grade                                  │
│  Features     : HA, pgBackRest, monitoring intégré, pgBouncer               │
│  Helm         : Propriétaire (kubectl apply)                                │
│  Docs         : https://access.crunchydata.com/documentation/postgres-operator│
│                                                                              │
│  RECOMMANDATION : CloudNativePG                                              │
│  - Conception cloud-native (pas de portage)                                 │
│  - Meilleure intégration Kubernetes (CRDs propres)                          │
│  - Communauté active, CNCF backing                                          │
│  - Documentation excellente                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Schéma optimisé

```sql
-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Similarité texte
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- Index composites

-- ═══════════════════════════════════════════════════════════════════════════
-- RAW RECORDS (données immutables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE raw_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL,

  -- Contrainte d'unicité pour déduplication
  CONSTRAINT raw_records_source_unique UNIQUE (source, source_id, checksum)
);

-- Index GIN pour requêtes JSONB
CREATE INDEX idx_raw_records_data ON raw_records USING GIN (data);

-- Index pour recherche par source
CREATE INDEX idx_raw_records_source ON raw_records (source, fetched_at DESC);

-- Partitionnement par date (optionnel pour gros volumes)
-- CREATE TABLE raw_records (...) PARTITION BY RANGE (fetched_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTHOR PROFILES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE author_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  primary_orcid TEXT UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT,
  institution_id UUID,
  avatar_url TEXT,
  bio TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_email ON author_profiles (email);
CREATE INDEX idx_profiles_name_trgm ON author_profiles
  USING GIN (display_name gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILE IDENTITIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE profile_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  profile_id UUID NOT NULL REFERENCES author_profiles(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verification_method TEXT,

  CONSTRAINT identity_unique UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX idx_identities_profile ON profile_identities (profile_id);
CREATE INDEX idx_identities_lookup ON profile_identities (identifier_type, identifier_value);

-- ═══════════════════════════════════════════════════════════════════════════
-- CANDIDATE MATCHES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE candidate_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  raw_record_id UUID NOT NULL REFERENCES raw_records(id),
  profile_id UUID NOT NULL REFERENCES author_profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  match_score NUMERIC(4,3) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
  match_reasons JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT candidate_unique UNIQUE (raw_record_id, profile_id)
);

-- Index principal pour la queue de vérification
CREATE INDEX idx_candidates_queue ON candidate_matches (profile_id, status, match_score DESC)
  WHERE status IN ('pending', 'uncertain');

-- Index pour les statistiques
CREATE INDEX idx_candidates_stats ON candidate_matches (profile_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION ACTS (audit trail immutable)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE verification_acts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  candidate_match_id UUID NOT NULL REFERENCES candidate_matches(id),
  profile_id UUID NOT NULL REFERENCES author_profiles(id),
  decision TEXT NOT NULL,
  confidence TEXT,
  notes TEXT,
  evidence JSONB NOT NULL DEFAULT '[]',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by TEXT NOT NULL,
  decided_via TEXT NOT NULL,
  client_info JSONB
);

-- Index pour l'historique par profil
CREATE INDEX idx_verifications_profile ON verification_acts (profile_id, decided_at DESC);

-- Index pour audit par candidat
CREATE INDEX idx_verifications_candidate ON verification_acts (candidate_match_id, decided_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- CANONICAL WORKS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE canonical_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  primary_doi TEXT UNIQUE,
  title TEXT NOT NULL,
  publication_date DATE,
  type TEXT,
  venue_id UUID,
  merged_from JSONB NOT NULL DEFAULT '[]',
  merge_status TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search sur les titres
CREATE INDEX idx_works_title_fts ON canonical_works
  USING GIN (to_tsvector('english', title));

CREATE INDEX idx_works_date ON canonical_works (publication_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- WORK AUTHORSHIPS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE work_authorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  work_id UUID NOT NULL REFERENCES canonical_works(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES author_profiles(id) ON DELETE CASCADE,
  position INTEGER,
  is_corresponding BOOLEAN DEFAULT FALSE,
  affiliation_at_time TEXT,
  verification_act_id UUID REFERENCES verification_acts(id),
  raw_contributions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT authorship_unique UNIQUE (work_id, profile_id)
);

CREATE INDEX idx_authorships_profile ON work_authorships (profile_id);
CREATE INDEX idx_authorships_work ON work_authorships (work_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  profile_id UUID NOT NULL REFERENCES author_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  resource_type TEXT,
  resource_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications (profile_id, created_at DESC)
  WHERE read = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- VUES MATÉRIALISÉES POUR STATISTIQUES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW profile_stats AS
SELECT
  p.id AS profile_id,
  COUNT(DISTINCT wa.work_id) AS works_count,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.status = 'pending') AS pending_count,
  COUNT(DISTINCT cm.id) FILTER (WHERE cm.status IN ('confirmed', 'auto_confirmed')) AS confirmed_count,
  COALESCE(
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.status IN ('confirmed', 'auto_confirmed', 'rejected'))::NUMERIC /
    NULLIF(COUNT(DISTINCT cm.id), 0),
    0
  ) AS verification_rate
FROM author_profiles p
LEFT JOIN candidate_matches cm ON cm.profile_id = p.id
LEFT JOIN work_authorships wa ON wa.profile_id = p.id
GROUP BY p.id;

CREATE UNIQUE INDEX idx_profile_stats ON profile_stats (profile_id);

-- Refresh automatique via pg_cron ou job applicatif
-- SELECT cron.schedule('refresh-stats', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY profile_stats');
```

#### Manifest CloudNativePG

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: atlas-verify-db
  namespace: atlas-verify
spec:
  instances: 3

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      work_mem: "16MB"
      maintenance_work_mem: "128MB"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      # JSONB optimizations
      default_statistics_target: "100"

  storage:
    size: 50Gi
    storageClass: local-path  # ou ceph-block, longhorn, etc.

  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "2"

  backup:
    barmanObjectStore:
      destinationPath: "s3://atlas-backups/postgres"
      endpointURL: "http://minio.minio:9000"
      s3Credentials:
        accessKeyId:
          name: s3-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-creds
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
      data:
        compression: gzip
    retentionPolicy: "30d"

  monitoring:
    enablePodMonitor: true
```

---

### 2. CockroachDB

#### Présentation

CockroachDB est une base distribuée compatible PostgreSQL avec sharding automatique et réplication multi-région.

#### Points forts

| Aspect | Évaluation |
|--------|------------|
| **JSONB** | ⭐⭐⭐⭐ Bon - compatible PostgreSQL |
| **Relationnel** | ⭐⭐⭐⭐ Bon - SQL standard, quelques limitations |
| **Full-text** | ⭐⭐⭐ Moyen - basique, pas de tsvector |
| **Scalabilité** | ⭐⭐⭐⭐⭐ Excellent - sharding auto, scale horizontal |
| **Kubernetes** | ⭐⭐⭐⭐ Bon - Operator officiel |

#### Quand choisir CockroachDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COCKROACHDB - CAS D'USAGE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RECOMMANDÉ SI :                                                             │
│  ─────────────                                                               │
│  ✓ Volume > 100M records avec croissance rapide                             │
│  ✓ Multi-région (Europe, US, Asie)                                          │
│  ✓ Scale horizontal impératif                                               │
│  ✓ Équipe familière avec PostgreSQL                                         │
│                                                                              │
│  À ÉVITER SI :                                                               │
│  ────────────                                                                │
│  ✗ Full-text search avancé requis                                           │
│  ✗ Extensions PostgreSQL spécifiques (pg_trgm, etc.)                        │
│  ✗ Contraintes de coûts (plus complexe à opérer)                            │
│  ✗ Volume < 10M records (over-engineering)                                  │
│                                                                              │
│  POUR ATLAS VERIFY :                                                         │
│  ──────────────────                                                          │
│  Volume estimé : 10M records → PostgreSQL suffisant                         │
│  Full-text : important → PostgreSQL préférable                              │
│  Régions : mono-région probable → PostgreSQL suffisant                      │
│                                                                              │
│  VERDICT : Non recommandé pour la v1, à reconsidérer si scale massif       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. MongoDB

#### Présentation

MongoDB est la base documentaire la plus populaire, avec un modèle flexible et une excellente scalabilité horizontale.

#### Points forts

| Aspect | Évaluation |
|--------|------------|
| **Documents** | ⭐⭐⭐⭐⭐ Excellent - modèle natif, schemaless |
| **Relationnel** | ⭐⭐ Faible - pas de FK, joins limités |
| **Full-text** | ⭐⭐⭐⭐ Bon - Atlas Search / lucene-based |
| **Scalabilité** | ⭐⭐⭐⭐⭐ Excellent - sharding natif |
| **Kubernetes** | ⭐⭐⭐⭐ Bon - Community Operator, MongoDB Ops Manager |

#### Modèle documentaire pour Atlas Verify

```javascript
// Collection: raw_records
{
  _id: ObjectId("..."),
  source: "openalex",
  sourceId: "W2741809807",
  entityType: "work",
  data: {
    // Données brutes complètes de la source
  },
  fetchedAt: ISODate("2025-01-24T10:00:00Z"),
  checksum: "sha256:..."
}

// Collection: author_profiles
{
  _id: ObjectId("..."),
  primaryOrcid: "0000-0002-1825-0097",
  displayName: "Marie Curie",
  email: "marie.curie@univ.fr",
  identities: [
    { type: "orcid", value: "0000-0002-1825-0097", isPrimary: true },
    { type: "hal_author", value: "marie-curie" }
  ],
  settings: {
    autoConfirmThreshold: 0.95
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// Collection: candidate_matches
{
  _id: ObjectId("..."),
  rawRecordId: ObjectId("..."),
  profileId: ObjectId("..."),
  matchScore: 0.92,
  matchReasons: [
    { type: "orcid_claimed", weight: 0.95 },
    { type: "affiliation_match", weight: 0.4 }
  ],
  status: "pending",
  // Dénormalisation pour éviter les lookups
  rawRecordSummary: {
    title: "Attention Is All You Need",
    source: "openalex",
    doi: "10.48550/arXiv.1706.03762"
  },
  createdAt: ISODate("...")
}

// Collection: verification_acts (append-only)
{
  _id: ObjectId("..."),
  candidateMatchId: ObjectId("..."),
  profileId: ObjectId("..."),
  decision: "confirm",
  confidence: "certain",
  notes: "C'est bien mon article",
  evidence: [],
  decidedAt: ISODate("..."),
  decidedBy: "user:123",
  decidedVia: "web"
}
```

#### Analyse

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MONGODB - ANALYSE ATLAS VERIFY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AVANTAGES :                                                                 │
│  ──────────                                                                  │
│  ✓ Modèle naturel pour raw_records (documents hétérogènes)                  │
│  ✓ Dénormalisation performante (embarquer les résumés)                      │
│  ✓ Change streams pour temps réel                                           │
│  ✓ Atlas Search excellent pour full-text                                    │
│                                                                              │
│  INCONVÉNIENTS :                                                             │
│  ───────────────                                                             │
│  ✗ Pas de vraies transactions multi-documents (v4.0+ limité)                │
│  ✗ Intégrité référentielle manuelle                                         │
│  ✗ Opérateur Kubernetes moins mature que PostgreSQL                         │
│  ✗ Coût licence pour fonctionnalités avancées (Atlas)                       │
│  ✗ Audit trail plus complexe à garantir                                     │
│                                                                              │
│  VERDICT :                                                                   │
│  ────────                                                                    │
│  MongoDB serait adapté pour le stockage des raw_records uniquement,         │
│  mais le besoin d'intégrité forte pour les décisions de vérification        │
│  favorise PostgreSQL.                                                        │
│                                                                              │
│  OPTION HYBRIDE POSSIBLE :                                                   │
│  - MongoDB pour raw_records (volume, flexibilité)                           │
│  - PostgreSQL pour profils, candidats, vérifications (intégrité)            │
│  → Complexité opérationnelle accrue, à éviter sauf besoin prouvé            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. ScyllaDB

#### Présentation

ScyllaDB est une réécriture C++ de Cassandra, optimisée pour les performances et la scalabilité massive.

#### Points forts

| Aspect | Évaluation |
|--------|------------|
| **Colonnes larges** | ⭐⭐⭐⭐⭐ Excellent - modèle Cassandra |
| **Scalabilité** | ⭐⭐⭐⭐⭐ Excellent - scale linéaire |
| **Performances** | ⭐⭐⭐⭐⭐ Excellent - très faible latence |
| **Flexibilité** | ⭐⭐ Faible - modèle de requêtes rigide |
| **Kubernetes** | ⭐⭐⭐⭐ Bon - Scylla Operator |

#### Analyse

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCYLLADB - ANALYSE ATLAS VERIFY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CAS D'USAGE IDÉAL :                                                         │
│  ──────────────────                                                          │
│  - Time-series à très haut débit                                            │
│  - Logs / événements                                                         │
│  - Cache distribué persistant                                               │
│                                                                              │
│  POUR ATLAS VERIFY :                                                         │
│  ──────────────────                                                          │
│  ✗ Modèle de requêtes trop rigide pour notre cas                            │
│  ✗ Pas adapté aux requêtes ad-hoc (filtres dynamiques)                      │
│  ✗ Joins impossibles                                                         │
│  ✗ Over-engineering pour le volume attendu                                  │
│                                                                              │
│  ÉVENTUELLEMENT UTILE POUR :                                                 │
│  ──────────────────────────                                                  │
│  - Stockage des métriques (si volume énorme)                                │
│  - Audit logs (si rétention très longue)                                    │
│                                                                              │
│  VERDICT : Non recommandé                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Solutions de recherche

#### Meilisearch vs Elasticsearch vs Typesense

Pour le full-text search sur les titres et noms d'auteurs, une solution dédiée peut compléter PostgreSQL.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MOTEURS DE RECHERCHE COMPARÉS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                   │ Meilisearch │ Elasticsearch │ Typesense │               │
│  ─────────────────┼─────────────┼───────────────┼───────────┤               │
│  Facilité         │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐         │ ⭐⭐⭐⭐    │               │
│  Performance      │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐       │ ⭐⭐⭐⭐⭐  │               │
│  Features         │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐⭐    │               │
│  Kubernetes       │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐      │               │
│  Ressources       │ ⭐⭐⭐⭐⭐    │ ⭐⭐          │ ⭐⭐⭐⭐    │               │
│  Typo-tolerance   │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐        │ ⭐⭐⭐⭐⭐  │               │
│  Multi-tenant     │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐⭐    │               │
│  Licence          │ MIT          │ Dual (SSPL)   │ GPL-3      │               │
│  ─────────────────┴─────────────┴───────────────┴───────────┘               │
│                                                                              │
│  RECOMMANDATION : Meilisearch                                                │
│  ─────────────────────────────                                               │
│  - Très facile à configurer et opérer                                       │
│  - Excellent pour la recherche de titres/noms                               │
│  - Faible empreinte mémoire                                                  │
│  - Typo-tolerance native (important pour noms d'auteurs)                    │
│  - Helm chart officiel disponible                                            │
│                                                                              │
│  ALTERNATIVE : PostgreSQL full-text suffisant pour v1                       │
│  - pg_trgm + tsvector couvrent 80% des besoins                              │
│  - Ajouter Meilisearch si UX recherche insuffisante                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Manifest Meilisearch

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: meilisearch
  namespace: atlas-verify
spec:
  serviceName: meilisearch
  replicas: 1
  selector:
    matchLabels:
      app: meilisearch
  template:
    metadata:
      labels:
        app: meilisearch
    spec:
      containers:
        - name: meilisearch
          image: getmeili/meilisearch:v1.6
          ports:
            - containerPort: 7700
          env:
            - name: MEILI_ENV
              value: "production"
            - name: MEILI_MASTER_KEY
              valueFrom:
                secretKeyRef:
                  name: meilisearch-secrets
                  key: master-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "1Gi"
              cpu: "1"
          volumeMounts:
            - name: data
              mountPath: /meili_data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: meilisearch
  namespace: atlas-verify
spec:
  selector:
    app: meilisearch
  ports:
    - port: 7700
      targetPort: 7700
```

---

### 6. Redis

Redis est essentiel comme cache et queue de jobs, pas comme base principale.

#### Usages dans Atlas Verify

| Usage | Justification |
|-------|---------------|
| **Sessions** | Stockage JWT/cookies de session |
| **Cache** | Résultats de matching, profils fréquents |
| **Rate limiting** | Compteurs par utilisateur/source |
| **Job queue** | BullMQ pour imports et notifications |
| **Pub/Sub** | Notifications temps réel (SSE backend) |

#### Manifest Redis (Bitnami)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-verify

---
# Via Helm: bitnami/redis
# helm install redis bitnami/redis -n atlas-verify -f values.yaml

# values.yaml
architecture: standalone  # ou 'replication' pour HA

auth:
  enabled: true
  existingSecret: redis-secrets
  existingSecretPasswordKey: password

master:
  persistence:
    enabled: true
    size: 8Gi

  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

---

## Recommandation finale

### Architecture recommandée pour Atlas Verify v1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  ARCHITECTURE DONNÉES RECOMMANDÉE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        KUBERNETES CLUSTER                            │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐     ┌─────────────────┐                        │   │
│  │  │  PostgreSQL 16  │     │     Redis 7     │                        │   │
│  │  │  (CloudNativePG)│     │   (Bitnami)     │                        │   │
│  │  │                 │     │                 │                        │   │
│  │  │  • raw_records  │     │  • Sessions     │                        │   │
│  │  │  • profiles     │     │  • Cache        │                        │   │
│  │  │  • candidates   │     │  • Rate limits  │                        │   │
│  │  │  • verifications│     │  • BullMQ jobs  │                        │   │
│  │  │  • works        │     │                 │                        │   │
│  │  │                 │     │                 │                        │   │
│  │  │  3 instances HA │     │  1-3 instances  │                        │   │
│  │  │  50 Gi storage  │     │  8 Gi storage   │                        │   │
│  │  └────────┬────────┘     └────────┬────────┘                        │   │
│  │           │                       │                                  │   │
│  │           │    ┌──────────────────┘                                  │   │
│  │           │    │                                                     │   │
│  │           ▼    ▼                                                     │   │
│  │  ┌─────────────────┐     ┌─────────────────┐                        │   │
│  │  │   API Backend   │     │     Worker      │                        │   │
│  │  │     (Hono)      │     │   (BullMQ)      │                        │   │
│  │  │                 │     │                 │                        │   │
│  │  │  • REST API     │     │  • Imports      │                        │   │
│  │  │  • Auth ORCID   │     │  • Matching     │                        │   │
│  │  │  • SSE notifs   │     │  • Emails       │                        │   │
│  │  └─────────────────┘     └─────────────────┘                        │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐     ┌─────────────────┐                        │   │
│  │  │    Frontend     │     │     MinIO       │                        │   │
│  │  │  (SvelteKit)    │     │   (Backups)     │                        │   │
│  │  └─────────────────┘     └─────────────────┘                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  COMPOSANTS OPTIONNELS (v2+) :                                              │
│  ─────────────────────────────                                               │
│  • Meilisearch : si recherche full-text PostgreSQL insuffisante            │
│  • TimescaleDB : si métriques temps-series importantes                     │
│  • Kafka/NATS : si event-driven architecture nécessaire                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Justification

| Choix | Raison |
|-------|--------|
| **PostgreSQL** | JSONB + relationnel + full-text dans une seule base, operators matures |
| **CloudNativePG** | Operator cloud-native, excellente documentation, CNCF backing |
| **Redis** | Standard pour cache/sessions, BullMQ mature |
| **Pas MongoDB** | Intégrité transactionnelle importante, PostgreSQL JSONB suffisant |
| **Pas CockroachDB** | Volume trop faible pour justifier la complexité |
| **Pas Meilisearch v1** | PostgreSQL pg_trgm + tsvector suffisent initialement |

### Estimation des ressources

| Composant | Instances | CPU | Mémoire | Stockage |
|-----------|-----------|-----|---------|----------|
| PostgreSQL | 3 | 2 cores | 4 Gi | 50 Gi |
| Redis | 1-3 | 0.5 core | 512 Mi | 8 Gi |
| API Backend | 2-4 | 0.5 core | 512 Mi | - |
| Worker | 1-2 | 0.5 core | 512 Mi | - |
| Frontend | 2 | 0.25 core | 256 Mi | - |
| **Total** | ~10 pods | ~6 cores | ~8 Gi | ~60 Gi |

### Évolution future

```
v1 (lancement)          v2 (scale)              v3 (enterprise)
─────────────           ──────────              ────────────────
PostgreSQL              PostgreSQL              CockroachDB
Redis                   Redis Cluster           Redis Cluster
-                       Meilisearch             Meilisearch
-                       -                       Kafka
-                       -                       Grafana Loki
```

---

## Infrastructure Kubernetes complète

### Namespace et secrets

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-verify
  labels:
    app.kubernetes.io/name: atlas-verify

---
apiVersion: v1
kind: Secret
metadata:
  name: atlas-verify-secrets
  namespace: atlas-verify
type: Opaque
stringData:
  ORCID_CLIENT_ID: "APP-XXXX"
  ORCID_CLIENT_SECRET: "secret"
  SESSION_SECRET: "random-32-char-secret"
  DATABASE_URL: "postgresql://user:pass@atlas-verify-db-rw:5432/atlas"
  REDIS_URL: "redis://:pass@redis-master:6379"

---
apiVersion: v1
kind: Secret
metadata:
  name: s3-creds
  namespace: atlas-verify
type: Opaque
stringData:
  ACCESS_KEY_ID: "minio-access-key"
  SECRET_ACCESS_KEY: "minio-secret-key"
```

### Déploiement API

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlas-verify-api
  namespace: atlas-verify
spec:
  replicas: 2
  selector:
    matchLabels:
      app: atlas-verify-api
  template:
    metadata:
      labels:
        app: atlas-verify-api
    spec:
      containers:
        - name: api
          image: ghcr.io/univ-lehavre/atlas-verify-api:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: atlas-verify-secrets
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: atlas-verify-api
  namespace: atlas-verify
spec:
  selector:
    app: atlas-verify-api
  ports:
    - port: 3000
      targetPort: 3000

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: atlas-verify
  namespace: atlas-verify
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - verify.atlas.univ-lehavre.fr
      secretName: atlas-verify-tls
  rules:
    - host: verify.atlas.univ-lehavre.fr
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: atlas-verify-api
                port:
                  number: 3000
```

### Déploiement Worker

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlas-verify-worker
  namespace: atlas-verify
spec:
  replicas: 1
  selector:
    matchLabels:
      app: atlas-verify-worker
  template:
    metadata:
      labels:
        app: atlas-verify-worker
    spec:
      containers:
        - name: worker
          image: ghcr.io/univ-lehavre/atlas-verify-worker:latest
          envFrom:
            - secretRef:
                name: atlas-verify-secrets
          env:
            - name: NODE_ENV
              value: "production"
            - name: WORKER_CONCURRENCY
              value: "5"
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

---

## Conclusion

Pour Atlas Verify, la recommandation est :

1. **PostgreSQL 16 avec CloudNativePG** comme base principale
   - JSONB pour les données brutes hétérogènes
   - Relationnel strict pour l'intégrité des vérifications
   - Full-text search intégré

2. **Redis** pour cache, sessions et jobs

3. **Architecture monolithique modulaire** plutôt que microservices
   - Plus simple à opérer
   - Transactions faciles
   - Évolutive vers microservices si besoin

4. **Meilisearch en option** si la recherche full-text PostgreSQL s'avère insuffisante

Cette architecture supporte confortablement 10M+ records et 100k+ utilisateurs avec des ressources modestes (~6 cores, 8 Gi RAM).
