# Database Analysis for Atlas Verify

This document analyzes open source databases suitable for storing, querying, and updating bibliographic verification data on Kubernetes.

> **See also:**
> - [Author Verification](./author-verification.md) - Data model and verification workflows
> - [Researcher Profile](./researcher-profile.md) - Career reconstruction, expertise, collaborations
> - [Advanced Databases & Search](./advanced-databases.md) - ArangoDB, vector search, multi-database search

## Requirements

### Data Characteristics

| Aspect | Requirement |
|--------|-------------|
| **Volume** | ~10M raw records, ~1M profiles, ~100M potential candidates |
| **Velocity** | Initial batch import, then ~10k updates/day |
| **Variety** | JSONB (heterogeneous raw data) + relational (verified links) |
| **Veracity** | Complete audit trail, decision immutability |

### Access Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MAIN ACCESS PATTERNS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  READS (80%)                                                                 │
│  ───────────                                                                 │
│  1. Pending candidates by profile (paginated, filtered, sorted)             │
│  2. Verified publications by profile (paginated, full-text search)          │
│  3. Candidate detail with joined raw sources                                │
│  4. Aggregated statistics by profile                                        │
│  5. Full-text search on titles and authors                                  │
│                                                                              │
│  WRITES (20%)                                                                │
│  ────────────                                                                │
│  1. Batch import of raw records (bulk INSERT)                               │
│  2. Candidate creation (bulk INSERT after matching)                         │
│  3. Verification decisions (INSERT + UPDATE status)                         │
│  4. User profile update (occasional UPDATE)                                 │
│                                                                              │
│  SPECIAL PATTERNS                                                            │
│  ────────────────                                                            │
│  1. Deduplication by checksum (UPSERT)                                      │
│  2. JSONB queries (field extraction, GIN indexes)                           │
│  3. Time-series for audit trail (append-only)                               │
│  4. Multilingual full-text search                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kubernetes Requirements

| Aspect | Requirement |
|--------|-------------|
| **High availability** | Synchronous replication, automatic failover |
| **Scalability** | Horizontal scale for reads |
| **Backup** | Point-in-time recovery, S3 backups |
| **Observability** | Prometheus metrics, structured logs |
| **Operations** | Mature Helm charts, Kubernetes operators |

---

## Solution Analysis

### 1. PostgreSQL

#### Overview

PostgreSQL is the most complete open source relational database, with excellent JSONB support and powerful extensions.

#### Strengths for Atlas Verify

| Aspect | Evaluation |
|--------|------------|
| **JSONB** | Excellent - GIN indexes, operators, functions |
| **Relational** | Full ACID, FK, triggers |
| **Full-text** | Good - tsvector, multilingual |
| **Scalability** | Medium - read replication, no native sharding |
| **Kubernetes** | Mature operators (CloudNativePG, Zalando, CrunchyData) |

#### Kubernetes Operators

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL KUBERNETES OPERATORS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLOUDNATIVEPG                                                               │
│  ─────────────                                                               │
│  Maintained by: EDB (EnterpriseDB)                                          │
│  Maturity     : Production-ready, CNCF Sandbox                              │
│  Features     : HA, S3 backups, PITR, rolling updates, connection pooling   │
│  Helm         : cloudnative-pg/cloudnative-pg                               │
│  Docs         : https://cloudnative-pg.io                                   │
│                                                                              │
│  ZALANDO POSTGRES OPERATOR                                                   │
│  ────────────────────────                                                    │
│  Maintained by: Zalando                                                     │
│  Maturity     : Production-ready, used internally                           │
│  Features     : HA (Patroni), WAL-G backups, connection pooling (PgBouncer) │
│  Helm         : postgres-operator-charts/postgres-operator                  │
│  Docs         : https://github.com/zalando/postgres-operator                │
│                                                                              │
│  CRUNCHYDATA PGO                                                             │
│  ───────────────                                                             │
│  Maintained by: Crunchy Data                                                │
│  Maturity     : Enterprise-grade                                            │
│  Features     : HA, pgBackRest, built-in monitoring, pgBouncer              │
│  Helm         : Proprietary (kubectl apply)                                 │
│  Docs         : https://access.crunchydata.com/documentation/postgres-operator│
│                                                                              │
│  RECOMMENDATION: CloudNativePG                                               │
│  - Cloud-native design (not a port)                                         │
│  - Best Kubernetes integration (clean CRDs)                                 │
│  - Active community, CNCF backing                                           │
│  - Excellent documentation                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Optimized Schema

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Text similarity
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- Composite indexes

-- ═══════════════════════════════════════════════════════════════════════════
-- RAW RECORDS (immutable data)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE raw_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL,

  -- Uniqueness constraint for deduplication
  CONSTRAINT raw_records_source_unique UNIQUE (source, source_id, checksum)
);

-- GIN index for JSONB queries
CREATE INDEX idx_raw_records_data ON raw_records USING GIN (data);

-- Index for search by source
CREATE INDEX idx_raw_records_source ON raw_records (source, fetched_at DESC);

-- Date-based partitioning (optional for large volumes)
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

-- Main index for verification queue
CREATE INDEX idx_candidates_queue ON candidate_matches (profile_id, status, match_score DESC)
  WHERE status IN ('pending', 'uncertain');

-- Index for statistics
CREATE INDEX idx_candidates_stats ON candidate_matches (profile_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION ACTS (immutable audit trail)
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

-- Index for history by profile
CREATE INDEX idx_verifications_profile ON verification_acts (profile_id, decided_at DESC);

-- Index for audit by candidate
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

-- Full-text search on titles
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
-- MATERIALIZED VIEWS FOR STATISTICS
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

-- Automatic refresh via pg_cron or application job
-- SELECT cron.schedule('refresh-stats', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY profile_stats');
```

#### CloudNativePG Manifest

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
    storageClass: local-path  # or ceph-block, longhorn, etc.

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

#### Overview

CockroachDB is a distributed PostgreSQL-compatible database with automatic sharding and multi-region replication.

#### Strengths

| Aspect | Evaluation |
|--------|------------|
| **JSONB** | Good - PostgreSQL compatible |
| **Relational** | Good - standard SQL, some limitations |
| **Full-text** | Medium - basic, no tsvector |
| **Scalability** | Excellent - auto sharding, horizontal scale |
| **Kubernetes** | Good - official operator |

#### When to Choose CockroachDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COCKROACHDB - USE CASES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RECOMMENDED IF:                                                             │
│  ───────────────                                                             │
│  ✓ Volume > 100M records with rapid growth                                  │
│  ✓ Multi-region (Europe, US, Asia)                                          │
│  ✓ Horizontal scale imperative                                              │
│  ✓ Team familiar with PostgreSQL                                            │
│                                                                              │
│  AVOID IF:                                                                   │
│  ──────────                                                                  │
│  ✗ Advanced full-text search required                                       │
│  ✗ Specific PostgreSQL extensions (pg_trgm, etc.)                           │
│  ✗ Cost constraints (more complex to operate)                               │
│  ✗ Volume < 10M records (over-engineering)                                  │
│                                                                              │
│  FOR ATLAS VERIFY:                                                           │
│  ─────────────────                                                           │
│  Estimated volume: 10M records → PostgreSQL sufficient                      │
│  Full-text: important → PostgreSQL preferred                                │
│  Regions: single-region likely → PostgreSQL sufficient                      │
│                                                                              │
│  VERDICT: Not recommended for v1, reconsider if massive scale needed        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. MongoDB

#### Overview

MongoDB is the most popular document database, with a flexible model and excellent horizontal scalability.

#### Strengths

| Aspect | Evaluation |
|--------|------------|
| **Documents** | Excellent - native model, schemaless |
| **Relational** | Weak - no FK, limited joins |
| **Full-text** | Good - Atlas Search / lucene-based |
| **Scalability** | Excellent - native sharding |
| **Kubernetes** | Good - Community Operator, MongoDB Ops Manager |

#### Document Model for Atlas Verify

```javascript
// Collection: raw_records
{
  _id: ObjectId("..."),
  source: "openalex",
  sourceId: "W2741809807",
  entityType: "work",
  data: {
    // Complete raw data from source
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
  // Denormalization to avoid lookups
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
  notes: "This is indeed my article",
  evidence: [],
  decidedAt: ISODate("..."),
  decidedBy: "user:123",
  decidedVia: "web"
}
```

#### Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MONGODB - ATLAS VERIFY ANALYSIS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ADVANTAGES:                                                                 │
│  ───────────                                                                 │
│  ✓ Natural model for raw_records (heterogeneous documents)                  │
│  ✓ Performant denormalization (embed summaries)                             │
│  ✓ Change streams for real-time                                             │
│  ✓ Excellent Atlas Search for full-text                                     │
│                                                                              │
│  DISADVANTAGES:                                                              │
│  ──────────────                                                              │
│  ✗ No true multi-document transactions (v4.0+ limited)                      │
│  ✗ Manual referential integrity                                             │
│  ✗ Less mature Kubernetes operator than PostgreSQL                          │
│  ✗ License cost for advanced features (Atlas)                               │
│  ✗ More complex to guarantee audit trail                                    │
│                                                                              │
│  VERDICT:                                                                    │
│  ────────                                                                    │
│  MongoDB would be suitable for raw_records storage only,                    │
│  but the need for strong integrity for verification decisions               │
│  favors PostgreSQL.                                                          │
│                                                                              │
│  HYBRID OPTION POSSIBLE:                                                     │
│  - MongoDB for raw_records (volume, flexibility)                            │
│  - PostgreSQL for profiles, candidates, verifications (integrity)           │
│  → Increased operational complexity, avoid unless proven need               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. ScyllaDB

#### Overview

ScyllaDB is a C++ rewrite of Cassandra, optimized for performance and massive scalability.

#### Strengths

| Aspect | Evaluation |
|--------|------------|
| **Wide columns** | Excellent - Cassandra model |
| **Scalability** | Excellent - linear scale |
| **Performance** | Excellent - very low latency |
| **Flexibility** | Weak - rigid query model |
| **Kubernetes** | Good - Scylla Operator |

#### Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCYLLADB - ATLAS VERIFY ANALYSIS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  IDEAL USE CASES:                                                            │
│  ─────────────────                                                           │
│  - Very high-throughput time-series                                         │
│  - Logs / events                                                             │
│  - Persistent distributed cache                                             │
│                                                                              │
│  FOR ATLAS VERIFY:                                                           │
│  ─────────────────                                                           │
│  ✗ Query model too rigid for our case                                       │
│  ✗ Not suitable for ad-hoc queries (dynamic filters)                        │
│  ✗ No joins                                                                  │
│  ✗ Over-engineering for expected volume                                     │
│                                                                              │
│  POTENTIALLY USEFUL FOR:                                                     │
│  ─────────────────────────                                                   │
│  - Metrics storage (if huge volume)                                         │
│  - Audit logs (if very long retention)                                      │
│                                                                              │
│  VERDICT: Not recommended                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Search Solutions

#### Meilisearch vs Elasticsearch vs Typesense

For full-text search on titles and author names, a dedicated solution can complement PostgreSQL.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SEARCH ENGINES COMPARED                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                   │ Meilisearch │ Elasticsearch │ Typesense │               │
│  ─────────────────┼─────────────┼───────────────┼───────────┤               │
│  Ease of use      │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐         │ ⭐⭐⭐⭐    │               │
│  Performance      │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐       │ ⭐⭐⭐⭐⭐  │               │
│  Features         │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐⭐    │               │
│  Kubernetes       │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐      │               │
│  Resources        │ ⭐⭐⭐⭐⭐    │ ⭐⭐          │ ⭐⭐⭐⭐    │               │
│  Typo-tolerance   │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐        │ ⭐⭐⭐⭐⭐  │               │
│  Multi-tenant     │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐     │ ⭐⭐⭐⭐    │               │
│  License          │ MIT          │ Dual (SSPL)   │ GPL-3      │               │
│  ─────────────────┴─────────────┴───────────────┴───────────┘               │
│                                                                              │
│  RECOMMENDATION: Meilisearch                                                 │
│  ────────────────────────────                                                │
│  - Very easy to configure and operate                                       │
│  - Excellent for title/name search                                          │
│  - Low memory footprint                                                      │
│  - Native typo-tolerance (important for author names)                       │
│  - Official Helm chart available                                             │
│                                                                              │
│  ALTERNATIVE: PostgreSQL full-text sufficient for v1                        │
│  - pg_trgm + tsvector cover 80% of needs                                    │
│  - Add Meilisearch if search UX insufficient                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Meilisearch Manifest

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

Redis is essential as a cache and job queue, not as a primary database.

#### Uses in Atlas Verify

| Use | Justification |
|-----|---------------|
| **Sessions** | JWT/session cookie storage |
| **Cache** | Matching results, frequent profiles |
| **Rate limiting** | Counters per user/source |
| **Job queue** | BullMQ for imports and notifications |
| **Pub/Sub** | Real-time notifications (SSE backend) |

#### Redis Manifest (Bitnami)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-verify

---
# Via Helm: bitnami/redis
# helm install redis bitnami/redis -n atlas-verify -f values.yaml

# values.yaml
architecture: standalone  # or 'replication' for HA

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

## Final Recommendation

### Recommended Architecture for Atlas Verify v1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED DATA ARCHITECTURE                             │
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
│  OPTIONAL COMPONENTS (v2+):                                                 │
│  ──────────────────────────                                                  │
│  • Meilisearch: if PostgreSQL full-text search insufficient                │
│  • TimescaleDB: if time-series metrics important                           │
│  • Kafka/NATS: if event-driven architecture needed                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Justification

| Choice | Reason |
|--------|--------|
| **PostgreSQL** | JSONB + relational + full-text in single database, mature operators |
| **CloudNativePG** | Cloud-native operator, excellent documentation, CNCF backing |
| **Redis** | Standard for cache/sessions, mature BullMQ |
| **Not MongoDB** | Transactional integrity important, PostgreSQL JSONB sufficient |
| **Not CockroachDB** | Volume too low to justify complexity |
| **Not Meilisearch v1** | PostgreSQL pg_trgm + tsvector sufficient initially |

### Resource Estimation

| Component | Instances | CPU | Memory | Storage |
|-----------|-----------|-----|--------|---------|
| PostgreSQL | 3 | 2 cores | 4 Gi | 50 Gi |
| Redis | 1-3 | 0.5 core | 512 Mi | 8 Gi |
| API Backend | 2-4 | 0.5 core | 512 Mi | - |
| Worker | 1-2 | 0.5 core | 512 Mi | - |
| Frontend | 2 | 0.25 core | 256 Mi | - |
| **Total** | ~10 pods | ~6 cores | ~8 Gi | ~60 Gi |

### Future Evolution

```
v1 (launch)          v2 (scale)              v3 (enterprise)
─────────────        ──────────              ────────────────
PostgreSQL           PostgreSQL              CockroachDB
Redis                Redis Cluster           Redis Cluster
-                    Meilisearch             Meilisearch
-                    -                       Kafka
-                    -                       Grafana Loki
```

---

## Complete Kubernetes Infrastructure

### Namespace and Secrets

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

### API Deployment

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

### Worker Deployment

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

For Atlas Verify, the recommendation is:

1. **PostgreSQL 16 with CloudNativePG** as primary database
   - JSONB for heterogeneous raw data
   - Strict relational for verification integrity
   - Built-in full-text search

2. **Redis** for cache, sessions, and jobs

3. **Modular monolithic architecture** rather than microservices
   - Simpler to operate
   - Easy transactions
   - Evolvable to microservices if needed

4. **Meilisearch as option** if PostgreSQL full-text search proves insufficient

This architecture comfortably supports 10M+ records and 100k+ users with modest resources (~6 cores, 8 Gi RAM).
