# Bases de données avancées et recherche multi-sources

Ce document analyse les bases de données spécialisées, les moteurs de recherche, et les architectures de fédération pour répondre aux besoins complexes de recherche bibliographique.

> **Voir aussi :**
> - [Bases de données](./database-analysis.md) - Analyse PostgreSQL/MongoDB pour le stockage principal
> - [Fiabilisation auteur](./author-verification.md) - Modèle de données et workflows de vérification
> - [Schéma unifié](./unified-schema.md) - Spécification OpenAPI et entités

## Cas d'usage des chercheurs

### Besoins identifiés

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BESOINS DES CHERCHEURS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DÉCOUVERTE                                                                  │
│  ──────────                                                                  │
│  "Qui sont les experts en machine learning éthique à Paris ?"               │
│  "Quels articles citent mes travaux et travaillent sur des sujets proches ?"│
│  "Quelles sont les tendances émergentes dans mon domaine ?"                 │
│  "Qui collabore avec qui dans mon réseau thématique ?"                      │
│                                                                              │
│  EXPLORATION                                                                 │
│  ───────────                                                                 │
│  "Montre-moi l'évolution des publications sur CRISPR depuis 2012"           │
│  "Quels labos européens travaillent sur les batteries solides ?"            │
│  "Visualise le graphe de co-auteurs de ce chercheur"                        │
│  "Quels financeurs soutiennent ce domaine ?"                                │
│                                                                              │
│  VEILLE                                                                      │
│  ─────                                                                       │
│  "Alerte-moi quand quelqu'un cite mon article"                              │
│  "Nouveaux preprints dans ma thématique cette semaine"                      │
│  "Évolution du h-index de mes concurrents"                                  │
│                                                                              │
│  ANALYSE                                                                     │
│  ───────                                                                     │
│  "Similarité sémantique entre deux corpus d'articles"                       │
│  "Clustering des thématiques de mon laboratoire"                            │
│  "Prédiction d'impact d'un preprint"                                        │
│                                                                              │
│  REPORTING                                                                   │
│  ─────────                                                                   │
│  "Export bibliométrique pour évaluation HCERES"                             │
│  "Statistiques de publication par équipe"                                   │
│  "Cartographie des collaborations internationales"                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Requêtes types traduites

| Besoin utilisateur | Dimensions de données | Index requis |
|--------------------|----------------------|--------------|
| Expert sur un sujet dans une ville | Texte + Géo + Graphe | Full-text, Spatial, Graph |
| Évolution temporelle d'un domaine | Time-series + Texte | Temporal, Full-text |
| Articles similaires | Vecteurs sémantiques | Vector (ANN) |
| Réseau de collaboration | Graphe | Graph traversal |
| Tendances émergentes | Time-series + NLP | Temporal, Vector |
| Impact prediction | ML features | Vector, Aggregations |

---

## Bases de données multi-modèles

### ArangoDB

#### Présentation

ArangoDB est une base multi-modèles native combinant documents, graphes et recherche dans un seul système.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARANGODB                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MODÈLES SUPPORTÉS                                                           │
│  ─────────────────                                                           │
│  ✓ Documents (JSON) - Comme MongoDB                                         │
│  ✓ Graphes - Traversées natives, plus rapide que Neo4j sur certains cas    │
│  ✓ Key-Value - Cache intégré                                                │
│  ✓ Search (ArangoSearch) - Full-text avec scoring BM25                      │
│  ✓ GeoJSON - Index spatiaux                                                 │
│                                                                              │
│  LANGAGE DE REQUÊTE : AQL                                                    │
│  ────────────────────────                                                    │
│  Unifié pour tous les modèles, similaire à SQL avec extensions graphe       │
│                                                                              │
│  EXEMPLE - Experts sur un sujet dans une région :                           │
│  ──────────────────────────────────────────────────────────────────────     │
│  FOR author IN authors                                                       │
│    FILTER GEO_DISTANCE(author.location, @parisCenter) < 50000               │
│    LET expertise = (                                                         │
│      FOR v, e IN 1..1 OUTBOUND author authored                              │
│        FOR work IN works FILTER work._id == v._id                           │
│          FILTER ANALYZER(work.title, "text_en") LIKE "%machine learning%"   │
│        RETURN 1                                                              │
│    )                                                                         │
│    FILTER LENGTH(expertise) > 5                                             │
│    SORT LENGTH(expertise) DESC                                               │
│    RETURN { author, expertiseCount: LENGTH(expertise) }                     │
│                                                                              │
│  KUBERNETES                                                                  │
│  ──────────                                                                  │
│  • ArangoDB Kubernetes Operator (officiel)                                  │
│  • Helm chart: arangodb/kube-arangodb                                       │
│  • Modes: Single, ActiveFailover, Cluster (sharding)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Modèle pour Atlas

```javascript
// Collection: works (documents)
{
  _key: "W2741809807",
  title: "Attention Is All You Need",
  abstract: "The dominant sequence transduction models...",
  year: 2017,
  doi: "10.48550/arXiv.1706.03762",
  venue: "NeurIPS",
  citationCount: 89000,
  embedding: [0.12, -0.34, ...],  // SPECTER vector 768d
  location: null,  // Pour les works avec localisation (conférences)
  keywords: ["transformer", "attention", "NLP"],
  _source: "openalex"
}

// Collection: authors (documents)
{
  _key: "A123456",
  displayName: "Ashish Vaswani",
  orcid: "0000-0002-1234-5678",
  affiliations: [
    {
      institution: "Google Brain",
      ror: "03yrm5c26",
      location: { type: "Point", coordinates: [37.4220, -122.0841] },
      startYear: 2015
    }
  ],
  hIndex: 45,
  topics: ["deep learning", "NLP", "transformers"]
}

// Collection: institutions (documents)
{
  _key: "I27837315",
  name: "Google",
  ror: "03yrm5c26",
  type: "company",
  location: {
    type: "Point",
    coordinates: [-122.0841, 37.4220]  // Mountain View
  },
  country: "US"
}

// Edge collection: authored (graphe)
{
  _from: "authors/A123456",
  _to: "works/W2741809807",
  position: 1,
  isCorresponding: true,
  affiliationAtTime: "Google Brain"
}

// Edge collection: cites (graphe)
{
  _from: "works/W2741809807",
  _to: "works/W1234567890",
  context: "building upon the work of..."
}

// Edge collection: affiliated (graphe)
{
  _from: "authors/A123456",
  _to: "institutions/I27837315",
  startYear: 2015,
  endYear: null,
  role: "Research Scientist"
}

// Edge collection: collaborated (graphe, computed)
{
  _from: "authors/A123456",
  _to: "authors/A789012",
  coauthorships: 15,
  firstCollab: 2015,
  lastCollab: 2024
}
```

#### Requêtes avancées AQL

```aql
// 1. Trouver des experts sur un sujet dans une zone géographique
FOR author IN authors
  // Filtre géographique : auteurs dans un rayon de 50km de Paris
  FILTER author.affiliations[*].location != null
  LET currentAffiliation = FIRST(
    FOR aff IN author.affiliations
      FILTER aff.endYear == null
      RETURN aff
  )
  FILTER currentAffiliation != null
  FILTER GEO_DISTANCE(
    currentAffiliation.location,
    GEO_POINT(2.3522, 48.8566)  // Paris
  ) < 50000

  // Comptage des publications sur le sujet
  LET relevantWorks = (
    FOR v IN 1..1 OUTBOUND author authored
      SEARCH ANALYZER(v.title IN TOKENS("machine learning ethics", "text_en"), "text_en")
         OR ANALYZER(v.abstract IN TOKENS("machine learning ethics", "text_en"), "text_en")
      RETURN v
  )

  FILTER LENGTH(relevantWorks) >= 3

  // Score d'expertise
  LET expertiseScore = SUM(relevantWorks[*].citationCount) / LENGTH(relevantWorks)

  SORT expertiseScore DESC
  LIMIT 20

  RETURN {
    author: author.displayName,
    orcid: author.orcid,
    institution: currentAffiliation.institution,
    publicationsOnTopic: LENGTH(relevantWorks),
    avgCitations: expertiseScore,
    hIndex: author.hIndex
  }

// 2. Graphe de co-auteurs avec profondeur
FOR author IN authors
  FILTER author._key == "A123456"

  // Traversée du graphe de co-auteurs jusqu'à profondeur 2
  FOR v, e, p IN 1..2 OUTBOUND author collaborated
    OPTIONS { bfs: true, uniqueVertices: "global" }

    LET distance = LENGTH(p.edges)

    RETURN {
      coauthor: v.displayName,
      distance: distance,
      sharedWorks: e.coauthorships,
      path: p.vertices[*].displayName
    }

// 3. Évolution temporelle d'un domaine
FOR work IN works
  SEARCH ANALYZER(work.title IN TOKENS("CRISPR gene editing", "text_en"), "text_en")
     OR ANALYZER(work.abstract IN TOKENS("CRISPR gene editing", "text_en"), "text_en")

  COLLECT year = work.year INTO worksPerYear

  SORT year ASC

  RETURN {
    year: year,
    count: LENGTH(worksPerYear),
    totalCitations: SUM(worksPerYear[*].work.citationCount),
    topPapers: (
      FOR w IN worksPerYear[*].work
        SORT w.citationCount DESC
        LIMIT 3
        RETURN { title: w.title, citations: w.citationCount }
    )
  }

// 4. Articles similaires (nearest neighbors sur embeddings)
LET targetWork = DOCUMENT("works/W2741809807")

FOR work IN works
  FILTER work._key != targetWork._key

  // Distance cosinus sur les embeddings
  LET similarity = (
    LET dotProduct = SUM(
      FOR i IN 0..LENGTH(targetWork.embedding)-1
        RETURN targetWork.embedding[i] * work.embedding[i]
    )
    LET normA = SQRT(SUM(FOR x IN targetWork.embedding RETURN x*x))
    LET normB = SQRT(SUM(FOR x IN work.embedding RETURN x*x))
    RETURN dotProduct / (normA * normB)
  )[0]

  FILTER similarity > 0.7

  SORT similarity DESC
  LIMIT 10

  RETURN {
    title: work.title,
    year: work.year,
    similarity: similarity,
    doi: work.doi
  }

// 5. Chemin de citation entre deux articles
FOR path IN OUTBOUND K_SHORTEST_PATHS
  "works/W2741809807" TO "works/W9999999"
  cites
  OPTIONS { weightAttribute: "weight" }
  LIMIT 5

  RETURN {
    length: LENGTH(path.edges),
    papers: path.vertices[*].title
  }
```

#### Évaluation ArangoDB

| Aspect | Score | Notes |
|--------|-------|-------|
| Multi-modèle natif | ⭐⭐⭐⭐⭐ | Documents + Graphe + Search unifié |
| Graphe | ⭐⭐⭐⭐ | Très bon, mais Neo4j plus mature |
| Full-text | ⭐⭐⭐⭐ | ArangoSearch basé sur IResearch |
| Géospatial | ⭐⭐⭐⭐ | GeoJSON natif |
| Vector search | ⭐⭐⭐ | Possible mais pas optimisé (pas d'ANN) |
| Kubernetes | ⭐⭐⭐⭐ | Operator officiel mature |
| Scalabilité | ⭐⭐⭐⭐ | Sharding, mais complexe |
| Communauté | ⭐⭐⭐ | Plus petite que Postgres/Mongo |

---

### SurrealDB

#### Présentation

SurrealDB est une base multi-modèle nouvelle génération avec SQL-like queries et features modernes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SURREALDB                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CARACTÉRISTIQUES                                                            │
│  ────────────────                                                            │
│  • Documents, Graphes, Relations, Time-series                               │
│  • SurrealQL (SQL-like avec extensions)                                     │
│  • Permissions granulaires row-level                                        │
│  • Real-time subscriptions (WebSocket)                                      │
│  • Embeddable ou server                                                      │
│                                                                              │
│  POINTS FORTS                                                                │
│  ────────────                                                                │
│  ✓ Record links (relations natives)                                         │
│  ✓ Computed fields                                                           │
│  ✓ Events et triggers                                                        │
│  ✓ Full-text search intégré                                                 │
│  ✓ Géospatial                                                                │
│                                                                              │
│  POINTS FAIBLES                                                              │
│  ─────────────                                                               │
│  ✗ Très jeune (v1.0 fin 2023)                                               │
│  ✗ Pas encore production-ready pour gros volumes                            │
│  ✗ Operator Kubernetes non officiel                                         │
│  ✗ Vector search basique                                                     │
│                                                                              │
│  VERDICT : À surveiller, pas recommandé pour production immédiate           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Bases de données spécialisées

### Bases vectorielles (Embeddings / Semantic Search)

#### Comparatif

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BASES VECTORIELLES COMPARÉES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                 │ Milvus  │ Qdrant  │ Weaviate │ Pinecone │ pgvector │     │
│  ───────────────┼─────────┼─────────┼──────────┼──────────┼──────────┤     │
│  Performance    │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐⭐   │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐     │     │
│  Scalabilité    │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐   │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐     │     │
│  Kubernetes     │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐   │ N/A      │ ⭐⭐⭐⭐⭐  │     │
│  Open Source    │ ✅       │ ✅       │ ✅        │ ❌       │ ✅        │     │
│  Filtres hybrid │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐⭐   │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐   │     │
│  Multi-tenancy  │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐│ ⭐⭐⭐⭐   │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐     │     │
│  Intégration PG │ ❌       │ ❌       │ ❌        │ ❌       │ ✅        │     │
│  Simplicité     │ ⭐⭐⭐    │ ⭐⭐⭐⭐  │ ⭐⭐⭐     │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐  │     │
│  ───────────────┴─────────┴─────────┴──────────┴──────────┴──────────┘     │
│                                                                              │
│  RECOMMANDATION ATLAS                                                        │
│  ────────────────────                                                        │
│                                                                              │
│  Option A : pgvector (simplicité)                                           │
│  ─────────────────────────────────                                           │
│  • Extension PostgreSQL, pas de nouvelle base                               │
│  • Suffisant pour < 10M vectors                                             │
│  • Index HNSW disponible depuis v0.5                                        │
│  • Filtrage SQL natif                                                        │
│                                                                              │
│  Option B : Qdrant (performance + features)                                 │
│  ──────────────────────────────────────────                                  │
│  • Meilleur rapport performance/simplicité                                  │
│  • Excellent filtrage hybride                                               │
│  • Rust, très efficace en mémoire                                           │
│  • Helm chart officiel                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Qdrant pour Atlas

```yaml
# Helm install
# helm repo add qdrant https://qdrant.github.io/qdrant-helm
# helm install qdrant qdrant/qdrant -n atlas-verify -f values.yaml

# values.yaml
replicaCount: 1

persistence:
  enabled: true
  size: 20Gi

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "2"

config:
  cluster:
    enabled: false  # Single node pour commencer
  storage:
    performance:
      optimizers_count: 2
```

```typescript
// Client Qdrant
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://qdrant:6333' });

// Créer collection pour embeddings d'articles
await qdrant.createCollection('work_embeddings', {
  vectors: {
    specter: { size: 768, distance: 'Cosine' },   // SPECTER embeddings
    title: { size: 384, distance: 'Cosine' },     // Title embeddings (MiniLM)
  },
  // Payload pour filtrage hybride
  payload_schema: {
    year: { data_type: 'Integer', indexed: true },
    source: { data_type: 'Keyword', indexed: true },
    venue_type: { data_type: 'Keyword', indexed: true },
    citation_count: { data_type: 'Integer', indexed: true },
  },
});

// Recherche sémantique avec filtres
const results = await qdrant.search('work_embeddings', {
  vector: {
    name: 'specter',
    vector: queryEmbedding,  // 768d vector
  },
  filter: {
    must: [
      { key: 'year', range: { gte: 2020 } },
      { key: 'source', match: { value: 'openalex' } },
    ],
  },
  limit: 20,
  with_payload: true,
});
```

#### pgvector (alternative intégrée)

```sql
-- Extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Table avec embeddings
ALTER TABLE canonical_works
  ADD COLUMN embedding vector(768);

-- Index HNSW pour recherche ANN efficace
CREATE INDEX ON canonical_works
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Recherche similarité avec filtres SQL
SELECT
  id, title, year,
  1 - (embedding <=> $1::vector) AS similarity
FROM canonical_works
WHERE year >= 2020
  AND type = 'article'
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

---

### Bases time-series

#### InfluxDB vs TimescaleDB vs QuestDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BASES TIME-SERIES COMPARÉES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                   │ InfluxDB 3 │ TimescaleDB │ QuestDB │ ClickHouse │       │
│  ─────────────────┼────────────┼─────────────┼─────────┼────────────┤       │
│  Langage          │ SQL + Flux │ SQL         │ SQL     │ SQL        │       │
│  Compression      │ ⭐⭐⭐⭐⭐   │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐   │       │
│  Ingestion        │ ⭐⭐⭐⭐⭐   │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐ │ ⭐⭐⭐⭐⭐   │       │
│  Agrégations      │ ⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐   │       │
│  PostgreSQL compat│ ❌          │ ✅          │ ✅       │ ❌         │       │
│  Kubernetes       │ ⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐    │ ⭐⭐⭐⭐    │       │
│  Open Source      │ ⚠️ (OSS 2) │ ✅          │ ✅       │ ✅         │       │
│  ─────────────────┴────────────┴─────────────┴─────────┴────────────┘       │
│                                                                              │
│  CAS D'USAGE ATLAS                                                           │
│  ─────────────────                                                           │
│                                                                              │
│  Métriques à stocker :                                                       │
│  • Évolution citations par article (daily)                                  │
│  • Publications par domaine (weekly)                                        │
│  • h-index auteurs (monthly)                                                │
│  • Tendances thématiques (rolling window)                                   │
│  • Logs d'audit vérifications                                               │
│                                                                              │
│  RECOMMANDATION : TimescaleDB                                                │
│  ─────────────────────────────                                               │
│  • Extension PostgreSQL → une seule base à gérer                            │
│  • SQL standard                                                              │
│  • Continuous aggregates pour rollups                                       │
│  • Compression automatique                                                   │
│  • Helm chart officiel (timescale/timescaledb-single)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Schéma TimescaleDB pour métriques

```sql
-- Extension TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Métriques de citations par article
CREATE TABLE citation_metrics (
  time TIMESTAMPTZ NOT NULL,
  work_id UUID NOT NULL,
  citation_count INTEGER,
  reference_count INTEGER,
  influential_count INTEGER,
  source TEXT
);

SELECT create_hypertable('citation_metrics', 'time');

-- Compression après 7 jours
ALTER TABLE citation_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'work_id'
);

SELECT add_compression_policy('citation_metrics', INTERVAL '7 days');

-- Continuous aggregate pour tendances hebdomadaires
CREATE MATERIALIZED VIEW citation_weekly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 week', time) AS week,
  work_id,
  MAX(citation_count) AS max_citations,
  AVG(citation_count) AS avg_citations
FROM citation_metrics
GROUP BY week, work_id;

-- Métriques par domaine
CREATE TABLE domain_metrics (
  time TIMESTAMPTZ NOT NULL,
  domain TEXT NOT NULL,
  publication_count INTEGER,
  preprint_count INTEGER,
  avg_citations NUMERIC,
  top_venues JSONB
);

SELECT create_hypertable('domain_metrics', 'time');

-- Requête : évolution d'un domaine
SELECT
  time_bucket('1 month', time) AS month,
  domain,
  SUM(publication_count) AS total_publications,
  AVG(avg_citations) AS avg_citations
FROM domain_metrics
WHERE domain = 'machine learning'
  AND time > NOW() - INTERVAL '5 years'
GROUP BY month, domain
ORDER BY month;
```

---

### Bases géospatiales

#### PostGIS vs H3 vs DuckDB Spatial

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPTIONS GÉOSPATIALES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POSTGIS (Extension PostgreSQL)                                              │
│  ──────────────────────────────                                              │
│  ✓ Standard de facto                                                         │
│  ✓ Tous types de géométries                                                 │
│  ✓ Index GIST très efficaces                                                │
│  ✓ Fonctions spatiales complètes                                            │
│  → RECOMMANDÉ pour Atlas (déjà sur PostgreSQL)                              │
│                                                                              │
│  H3 (Uber Hexagonal Grid)                                                    │
│  ────────────────────────                                                    │
│  ✓ Indexation hexagonale hiérarchique                                       │
│  ✓ Excellente pour agrégations géo                                          │
│  ✓ Extension PostgreSQL disponible                                          │
│  → Utile pour heatmaps et clustering géographique                           │
│                                                                              │
│  REQUÊTES ATLAS                                                              │
│  ──────────────                                                              │
│  • Institutions dans un rayon                                               │
│  • Collaborations géographiques                                             │
│  • Heatmap des publications par région                                      │
│  • Clustering de labos par proximité                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Schéma PostGIS pour Atlas

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS h3;  -- Optionnel pour agrégations

-- Institutions avec localisation
ALTER TABLE institutions
  ADD COLUMN location GEOMETRY(Point, 4326);

CREATE INDEX idx_institutions_geo ON institutions USING GIST (location);

-- Requête : labos dans un rayon de 100km autour de Paris
SELECT
  i.name,
  i.country,
  ST_Distance(
    i.location::geography,
    ST_MakePoint(2.3522, 48.8566)::geography
  ) / 1000 AS distance_km,
  COUNT(DISTINCT wa.work_id) AS publications
FROM institutions i
JOIN work_authorships wa ON wa.affiliation_institution_id = i.id
WHERE ST_DWithin(
  i.location::geography,
  ST_MakePoint(2.3522, 48.8566)::geography,
  100000  -- 100km en mètres
)
GROUP BY i.id
ORDER BY distance_km;

-- Agrégation H3 pour heatmap
SELECT
  h3_lat_lng_to_cell(
    ST_Y(i.location),
    ST_X(i.location),
    5  -- Résolution H3
  ) AS h3_cell,
  COUNT(*) AS institution_count,
  SUM(i.works_count) AS total_works
FROM institutions i
WHERE i.location IS NOT NULL
GROUP BY h3_cell;
```

---

## Moteurs de recherche

### Elasticsearch vs OpenSearch vs Meilisearch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MOTEURS DE RECHERCHE COMPARÉS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                   │ OpenSearch  │ Elasticsearch │ Meilisearch │ Typesense │ │
│  ─────────────────┼─────────────┼───────────────┼─────────────┼───────────┤ │
│  Licence          │ Apache 2.0  │ SSPL/Elastic  │ MIT         │ GPL-3     │ │
│  Full-text        │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐  │ │
│  Agrégations      │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐        │ ⭐⭐⭐     │ │
│  Vector search    │ ⭐⭐⭐⭐     │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐        │ ⭐⭐⭐     │ │
│  Multitenancy     │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐⭐      │ ⭐⭐⭐⭐   │ │
│  Kubernetes       │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐⭐      │ ⭐⭐⭐     │ │
│  Ressources       │ ⭐⭐         │ ⭐⭐           │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐   │ │
│  Simplicité       │ ⭐⭐⭐       │ ⭐⭐⭐         │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐   │ │
│  Scoring avancé   │ ⭐⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐      │ ⭐⭐⭐        │ ⭐⭐⭐     │ │
│  ML intégré       │ ⭐⭐⭐⭐     │ ⭐⭐⭐⭐⭐      │ ❌           │ ❌        │ │
│  ─────────────────┴─────────────┴───────────────┴─────────────┴───────────┘ │
│                                                                              │
│  RECOMMANDATION ATLAS                                                        │
│  ────────────────────                                                        │
│                                                                              │
│  OpenSearch pour la recherche avancée                                        │
│  ─────────────────────────────────────                                       │
│  • Fork Apache 2.0 d'Elasticsearch                                          │
│  • Fonctionnalités équivalentes                                             │
│  • Pas de risque licence                                                     │
│  • Excellent support AWS (si cloud)                                          │
│  • Helm chart : opensearch-project/opensearch                               │
│  • Operator : opensearch-project/opensearch-k8s-operator                    │
│                                                                              │
│  Meilisearch en complément pour UX instantanée                              │
│  ─────────────────────────────────────────────                               │
│  • Autocomplete ultra-rapide                                                │
│  • Typo-tolerance                                                           │
│  • Très faible footprint                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture OpenSearch pour Atlas

```yaml
# OpenSearch cluster manifest
apiVersion: opensearch.opster.io/v1
kind: OpenSearchCluster
metadata:
  name: atlas-search
  namespace: atlas-verify
spec:
  general:
    serviceName: atlas-search
    version: 2.11.0
    httpPort: 9200
    pluginsList:
      - analysis-icu
      - analysis-kuromoji  # Japonais
      - analysis-smartcn   # Chinois

  dashboards:
    enable: true
    replicas: 1

  nodePools:
    - component: masters
      replicas: 3
      roles:
        - master
      resources:
        requests:
          memory: "1Gi"
          cpu: "500m"
      persistence:
        emptyDir: {}

    - component: data
      replicas: 2
      roles:
        - data
      resources:
        requests:
          memory: "2Gi"
          cpu: "1"
      persistence:
        pvc:
          storageClass: local-path
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi
```

### Mapping OpenSearch multi-entités

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "title_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "synonym_filter"]
        },
        "author_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "name_synonym_filter"]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "ML, machine learning",
            "DL, deep learning",
            "NLP, natural language processing",
            "AI, artificial intelligence"
          ]
        },
        "name_synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "université, university, univ",
            "laboratoire, laboratory, lab"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "_entity_type": { "type": "keyword" },

      // ══════════════════════════════════════════════════════
      // WORK FIELDS
      // ══════════════════════════════════════════════════════
      "title": {
        "type": "text",
        "analyzer": "title_analyzer",
        "fields": {
          "exact": { "type": "keyword" },
          "suggest": {
            "type": "completion",
            "contexts": [
              { "name": "source", "type": "category" }
            ]
          }
        }
      },
      "abstract": {
        "type": "text",
        "analyzer": "english"
      },
      "year": { "type": "integer" },
      "doi": { "type": "keyword" },
      "work_type": { "type": "keyword" },
      "venue": {
        "type": "text",
        "fields": { "exact": { "type": "keyword" } }
      },
      "citation_count": { "type": "integer" },
      "keywords": { "type": "keyword" },
      "source": { "type": "keyword" },

      // Embeddings pour vector search
      "embedding": {
        "type": "knn_vector",
        "dimension": 768,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib"
        }
      },

      // ══════════════════════════════════════════════════════
      // AUTHOR FIELDS
      // ══════════════════════════════════════════════════════
      "display_name": {
        "type": "text",
        "analyzer": "author_analyzer",
        "fields": {
          "exact": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "orcid": { "type": "keyword" },
      "h_index": { "type": "integer" },
      "works_count": { "type": "integer" },
      "affiliations": {
        "type": "nested",
        "properties": {
          "institution": { "type": "text" },
          "ror": { "type": "keyword" },
          "country": { "type": "keyword" }
        }
      },
      "topics": { "type": "keyword" },

      // ══════════════════════════════════════════════════════
      // INSTITUTION FIELDS
      // ══════════════════════════════════════════════════════
      "institution_name": {
        "type": "text",
        "analyzer": "author_analyzer",
        "fields": { "exact": { "type": "keyword" } }
      },
      "ror": { "type": "keyword" },
      "institution_type": { "type": "keyword" },
      "country": { "type": "keyword" },
      "location": { "type": "geo_point" },

      // ══════════════════════════════════════════════════════
      // COMMON
      // ══════════════════════════════════════════════════════
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}
```

### Requêtes OpenSearch avancées

```typescript
// Client OpenSearch
import { Client } from '@opensearch-project/opensearch';

const client = new Client({ node: 'http://atlas-search:9200' });

// ══════════════════════════════════════════════════════════════════════════
// 1. RECHERCHE MULTI-ENTITÉS
// ══════════════════════════════════════════════════════════════════════════

const multiEntitySearch = async (query: string) => {
  const response = await client.search({
    index: 'atlas',
    body: {
      query: {
        bool: {
          should: [
            // Recherche sur works (titre, abstract)
            {
              bool: {
                must: { multi_match: { query, fields: ['title^3', 'abstract', 'keywords^2'] } },
                filter: { term: { _entity_type: 'work' } }
              }
            },
            // Recherche sur authors
            {
              bool: {
                must: { match: { display_name: { query, fuzziness: 'AUTO' } } },
                filter: { term: { _entity_type: 'author' } }
              }
            },
            // Recherche sur institutions
            {
              bool: {
                must: { match: { institution_name: { query, fuzziness: 'AUTO' } } },
                filter: { term: { _entity_type: 'institution' } }
              }
            }
          ]
        }
      },
      // Agrégations par type d'entité
      aggs: {
        by_entity_type: {
          terms: { field: '_entity_type' },
          aggs: {
            top_hits: { top_hits: { size: 5 } }
          }
        }
      },
      highlight: {
        fields: {
          title: {},
          abstract: { fragment_size: 200 },
          display_name: {},
          institution_name: {}
        }
      }
    }
  });

  return response.body;
};

// ══════════════════════════════════════════════════════════════════════════
// 2. EXPERT SUR UN SUJET DANS UNE ZONE
// ══════════════════════════════════════════════════════════════════════════

const findExperts = async (topic: string, location: { lat: number; lon: number }, radiusKm: number) => {
  const response = await client.search({
    index: 'atlas',
    body: {
      query: {
        bool: {
          must: [
            { term: { _entity_type: 'author' } },
            { match: { topics: topic } }
          ],
          filter: [
            {
              nested: {
                path: 'affiliations',
                query: {
                  geo_distance: {
                    distance: `${radiusKm}km`,
                    'affiliations.location': location
                  }
                }
              }
            }
          ]
        }
      },
      sort: [
        { h_index: 'desc' },
        { works_count: 'desc' }
      ],
      size: 20
    }
  });

  return response.body.hits.hits;
};

// ══════════════════════════════════════════════════════════════════════════
// 3. RECHERCHE SÉMANTIQUE (VECTOR + KEYWORDS)
// ══════════════════════════════════════════════════════════════════════════

const semanticSearch = async (queryEmbedding: number[], keywords: string[], filters: any) => {
  const response = await client.search({
    index: 'atlas',
    body: {
      query: {
        bool: {
          must: [
            { term: { _entity_type: 'work' } },
            // Vector search (k-NN)
            {
              knn: {
                embedding: {
                  vector: queryEmbedding,
                  k: 50
                }
              }
            }
          ],
          should: [
            // Boost si keywords match
            { terms: { keywords: keywords, boost: 2 } }
          ],
          filter: filters
        }
      },
      // Rescoring pour combiner BM25 et vector
      rescore: {
        window_size: 100,
        query: {
          rescore_query: {
            multi_match: {
              query: keywords.join(' '),
              fields: ['title^2', 'abstract']
            }
          },
          query_weight: 0.3,
          rescore_query_weight: 0.7
        }
      }
    }
  });

  return response.body.hits.hits;
};

// ══════════════════════════════════════════════════════════════════════════
// 4. AUTOCOMPLETE MULTI-ENTITÉS
// ══════════════════════════════════════════════════════════════════════════

const autocomplete = async (prefix: string) => {
  const response = await client.search({
    index: 'atlas',
    body: {
      suggest: {
        title_suggest: {
          prefix,
          completion: {
            field: 'title.suggest',
            size: 5,
            contexts: { source: ['openalex', 'crossref'] }
          }
        },
        author_suggest: {
          prefix,
          completion: {
            field: 'display_name.suggest',
            size: 5
          }
        }
      }
    }
  });

  return {
    works: response.body.suggest.title_suggest[0].options,
    authors: response.body.suggest.author_suggest[0].options
  };
};

// ══════════════════════════════════════════════════════════════════════════
// 5. FACETTES ET AGRÉGATIONS
// ══════════════════════════════════════════════════════════════════════════

const searchWithFacets = async (query: string) => {
  const response = await client.search({
    index: 'atlas',
    body: {
      query: {
        bool: {
          must: [
            { term: { _entity_type: 'work' } },
            { multi_match: { query, fields: ['title', 'abstract'] } }
          ]
        }
      },
      aggs: {
        // Facette par année
        by_year: {
          histogram: {
            field: 'year',
            interval: 1,
            min_doc_count: 1
          }
        },
        // Facette par type
        by_type: {
          terms: { field: 'work_type', size: 10 }
        },
        // Facette par source
        by_source: {
          terms: { field: 'source', size: 10 }
        },
        // Facette par venue (top 20)
        by_venue: {
          terms: { field: 'venue.exact', size: 20 }
        },
        // Stats citations
        citation_stats: {
          stats: { field: 'citation_count' }
        },
        // Répartition citations
        citation_ranges: {
          range: {
            field: 'citation_count',
            ranges: [
              { to: 10 },
              { from: 10, to: 50 },
              { from: 50, to: 100 },
              { from: 100, to: 500 },
              { from: 500 }
            ]
          }
        }
      },
      size: 20
    }
  });

  return {
    hits: response.body.hits,
    facets: response.body.aggregations
  };
};
```

---

## Architecture de fédération multi-bases

### Problématique

Comment exécuter une seule requête sur plusieurs bases de données (PostgreSQL, OpenSearch, Qdrant, TimescaleDB) ?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FÉDÉRATION DE REQUÊTES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  REQUÊTE UTILISATEUR                                                         │
│  ───────────────────                                                         │
│  "Experts en machine learning éthique, à Paris, avec publications récentes  │
│   très citées, et articles similaires à mon draft"                          │
│                                                                              │
│  DÉCOMPOSITION                                                               │
│  ─────────────                                                               │
│  1. Full-text "machine learning ethics" → OpenSearch                        │
│  2. Géo "Paris 50km" → PostgreSQL/PostGIS                                   │
│  3. Time-series "publications récentes" → TimescaleDB                       │
│  4. Vector "similaires à draft" → Qdrant                                    │
│  5. Graphe "réseau co-auteurs" → PostgreSQL ou ArangoDB                     │
│  6. Agrégation finale → Application layer                                   │
│                                                                              │
│  APPROCHES                                                                   │
│  ─────────                                                                   │
│  A. Query Federation (application layer)                                    │
│  B. Data Virtualization (Trino/Presto)                                      │
│  C. Polyglot Persistence avec Event Sourcing                                │
│  D. GraphQL Federation                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Approche A : Query Federation (Application Layer)

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// FEDERATED QUERY SERVICE
// ═══════════════════════════════════════════════════════════════════════════

import { Effect, pipe } from 'effect';

interface FederatedQuery {
  text?: string;              // Full-text query
  embedding?: number[];       // Vector query
  geo?: {
    lat: number;
    lon: number;
    radiusKm: number;
  };
  timeRange?: {
    from: Date;
    to: Date;
  };
  filters?: Record<string, unknown>;
  entityTypes?: ('work' | 'author' | 'institution')[];
  limit?: number;
}

interface QueryPlan {
  steps: QueryStep[];
  mergeStrategy: 'union' | 'intersection' | 'weighted';
}

interface QueryStep {
  source: 'postgres' | 'opensearch' | 'qdrant' | 'timescale';
  query: unknown;
  weight: number;
  dependsOn?: string[];
}

class FederatedQueryService {
  constructor(
    private readonly postgres: PostgresClient,
    private readonly opensearch: OpenSearchClient,
    private readonly qdrant: QdrantClient,
    private readonly timescale: TimescaleClient
  ) {}

  /**
   * Exécute une requête fédérée sur toutes les sources pertinentes
   */
  execute = (query: FederatedQuery): Effect.Effect<FederatedResult, QueryError> => {
    return Effect.gen(this, function* () {
      // 1. Planification de la requête
      const plan = this.planQuery(query);

      // 2. Exécution parallèle des requêtes indépendantes
      const independentSteps = plan.steps.filter(s => !s.dependsOn?.length);
      const dependentSteps = plan.steps.filter(s => s.dependsOn?.length);

      // Exécution parallèle
      const independentResults = yield* Effect.all(
        independentSteps.map(step => this.executeStep(step)),
        { concurrency: 'unbounded' }
      );

      // 3. Exécution séquentielle des étapes dépendantes
      let allResults = new Map<string, StepResult>();
      independentResults.forEach((result, i) => {
        allResults.set(independentSteps[i].source, result);
      });

      for (const step of dependentSteps) {
        const result = yield* this.executeStep(step, allResults);
        allResults.set(step.source, result);
      }

      // 4. Fusion des résultats
      return this.mergeResults(allResults, plan.mergeStrategy, query);
    });
  };

  private planQuery(query: FederatedQuery): QueryPlan {
    const steps: QueryStep[] = [];

    // Full-text → OpenSearch
    if (query.text) {
      steps.push({
        source: 'opensearch',
        query: this.buildOpenSearchQuery(query),
        weight: 0.4
      });
    }

    // Vector similarity → Qdrant
    if (query.embedding) {
      steps.push({
        source: 'qdrant',
        query: this.buildQdrantQuery(query),
        weight: 0.3
      });
    }

    // Geo filter → PostgreSQL/PostGIS
    if (query.geo) {
      steps.push({
        source: 'postgres',
        query: this.buildPostGISQuery(query),
        weight: 0.2
      });
    }

    // Time range aggregations → TimescaleDB
    if (query.timeRange) {
      steps.push({
        source: 'timescale',
        query: this.buildTimescaleQuery(query),
        weight: 0.1
      });
    }

    return {
      steps,
      mergeStrategy: query.embedding ? 'weighted' : 'intersection'
    };
  }

  private buildOpenSearchQuery(query: FederatedQuery): OpenSearchQuery {
    return {
      bool: {
        must: [
          { multi_match: { query: query.text, fields: ['title^3', 'abstract', 'display_name^2'] } }
        ],
        filter: query.entityTypes
          ? [{ terms: { _entity_type: query.entityTypes } }]
          : []
      }
    };
  }

  private buildQdrantQuery(query: FederatedQuery): QdrantQuery {
    return {
      vector: query.embedding!,
      limit: query.limit || 100,
      filter: query.filters
    };
  }

  private buildPostGISQuery(query: FederatedQuery): string {
    return `
      SELECT id, ST_Distance(location::geography, ST_MakePoint($1, $2)::geography) as distance
      FROM institutions
      WHERE ST_DWithin(location::geography, ST_MakePoint($1, $2)::geography, $3)
      ORDER BY distance
    `;
  }

  private buildTimescaleQuery(query: FederatedQuery): string {
    return `
      SELECT work_id, MAX(citation_count) as max_citations
      FROM citation_metrics
      WHERE time BETWEEN $1 AND $2
      GROUP BY work_id
      HAVING MAX(citation_count) > 10
      ORDER BY max_citations DESC
    `;
  }

  private async executeStep(
    step: QueryStep,
    previousResults?: Map<string, StepResult>
  ): Promise<StepResult> {
    switch (step.source) {
      case 'opensearch':
        return this.opensearch.search(step.query);
      case 'qdrant':
        return this.qdrant.search(step.query);
      case 'postgres':
        return this.postgres.query(step.query);
      case 'timescale':
        return this.timescale.query(step.query);
    }
  }

  private mergeResults(
    results: Map<string, StepResult>,
    strategy: 'union' | 'intersection' | 'weighted',
    query: FederatedQuery
  ): FederatedResult {
    // Collect all IDs from each source
    const idScores = new Map<string, { score: number; sources: string[] }>();

    for (const [source, result] of results) {
      const weight = this.getSourceWeight(source, query);

      for (const hit of result.hits) {
        const existing = idScores.get(hit.id) || { score: 0, sources: [] };
        existing.score += hit.score * weight;
        existing.sources.push(source);
        idScores.set(hit.id, existing);
      }
    }

    // Apply merge strategy
    let finalIds: string[];

    switch (strategy) {
      case 'union':
        finalIds = Array.from(idScores.keys());
        break;

      case 'intersection':
        const sourceCount = results.size;
        finalIds = Array.from(idScores.entries())
          .filter(([_, v]) => v.sources.length === sourceCount)
          .map(([id]) => id);
        break;

      case 'weighted':
        finalIds = Array.from(idScores.entries())
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, query.limit || 50)
          .map(([id]) => id);
        break;
    }

    // Fetch full entities from primary store
    return {
      ids: finalIds,
      scores: Object.fromEntries(
        finalIds.map(id => [id, idScores.get(id)!.score])
      ),
      sources: Object.fromEntries(
        finalIds.map(id => [id, idScores.get(id)!.sources])
      )
    };
  }

  private getSourceWeight(source: string, query: FederatedQuery): number {
    // Poids dynamiques selon le type de requête
    if (query.embedding && source === 'qdrant') return 0.5;
    if (query.text && source === 'opensearch') return 0.4;
    if (query.geo && source === 'postgres') return 0.3;
    return 0.2;
  }
}
```

### Approche B : Trino (Data Virtualization)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRINO (PRESTO FORK)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRINCIPE                                                                    │
│  ────────                                                                    │
│  Moteur SQL distribué qui fédère plusieurs sources de données               │
│  via des connecteurs (catalog).                                             │
│                                                                              │
│  ARCHITECTURE                                                                │
│  ────────────                                                                │
│                                                                              │
│  ┌─────────┐                                                                 │
│  │  Client │                                                                 │
│  │  (SQL)  │                                                                 │
│  └────┬────┘                                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │              TRINO COORDINATOR                           │                │
│  │  • Parse SQL                                             │                │
│  │  • Plan query                                            │                │
│  │  • Distribute to workers                                 │                │
│  └────────────────────────┬────────────────────────────────┘                │
│                           │                                                  │
│       ┌───────────────────┼───────────────────┐                             │
│       ▼                   ▼                   ▼                             │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐                       │
│  │ Worker  │         │ Worker  │         │ Worker  │                       │
│  └────┬────┘         └────┬────┘         └────┬────┘                       │
│       │                   │                   │                             │
│       ▼                   ▼                   ▼                             │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐                       │
│  │PostgreSQL│        │OpenSearch│        │  S3     │                       │
│  │ Catalog │         │ Catalog │         │ Catalog │                       │
│  └─────────┘         └─────────┘         └─────────┘                       │
│                                                                              │
│  CONNECTEURS DISPONIBLES                                                     │
│  ───────────────────────                                                     │
│  ✓ PostgreSQL                                                                │
│  ✓ MongoDB                                                                   │
│  ✓ Elasticsearch/OpenSearch                                                 │
│  ✓ Redis                                                                     │
│  ✓ S3 (Parquet, ORC, Avro)                                                  │
│  ✓ ClickHouse                                                                │
│  ✗ Qdrant (pas de connecteur natif)                                         │
│  ✗ InfluxDB/TimescaleDB (limité)                                            │
│                                                                              │
│  KUBERNETES                                                                  │
│  ──────────                                                                  │
│  Helm chart: trino/trino                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Configuration Trino pour Atlas

```yaml
# catalogs/postgres.properties
connector.name=postgresql
connection-url=jdbc:postgresql://atlas-verify-db:5432/atlas
connection-user=${PG_USER}
connection-password=${PG_PASSWORD}

# catalogs/opensearch.properties
connector.name=opensearch
opensearch.host=atlas-search
opensearch.port=9200

# catalogs/mongodb.properties (si utilisé pour raw records)
connector.name=mongodb
mongodb.connection-url=mongodb://mongodb:27017
mongodb.schema-collection=_schema
```

```sql
-- Requête Trino fédérée
SELECT
  p.display_name,
  p.h_index,
  os.title,
  os.citation_count
FROM postgres.public.author_profiles p
JOIN opensearch.atlas.works os ON os.author_id = p.id
WHERE p.institution_country = 'FR'
  AND os.year >= 2020
ORDER BY os.citation_count DESC
LIMIT 50;
```

### Approche C : GraphQL Federation

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// GRAPHQL SCHEMA FEDERATION
// ═══════════════════════════════════════════════════════════════════════════

// Schéma GraphQL unifié
const typeDefs = `#graphql
  type Query {
    # Recherche multi-entités
    search(
      query: String!
      types: [EntityType!]
      filters: SearchFilters
      limit: Int = 20
    ): SearchResult!

    # Recherche d'experts
    findExperts(
      topic: String!
      location: GeoInput
      minHIndex: Int
    ): [Author!]!

    # Articles similaires
    similarWorks(
      workId: ID!
      limit: Int = 10
    ): [Work!]!

    # Évolution temporelle
    domainTrends(
      domain: String!
      fromYear: Int!
      toYear: Int!
    ): [YearlyStats!]!
  }

  type SearchResult {
    works: [Work!]!
    authors: [Author!]!
    institutions: [Institution!]!
    totalCount: Int!
    facets: Facets!
  }

  type Work {
    id: ID!
    title: String!
    abstract: String
    year: Int
    doi: String
    citationCount: Int

    # Relations (résolues depuis GraphDB ou SQL)
    authors: [Author!]!
    venue: Venue
    references: [Work!]!
    citations: [Work!]!

    # Données enrichies
    similarity(to: ID!): Float @resolver(source: "qdrant")
    citationTrend: [CitationPoint!]! @resolver(source: "timescale")
  }

  type Author {
    id: ID!
    displayName: String!
    orcid: String
    hIndex: Int

    # Relations
    affiliations: [Affiliation!]!
    works(limit: Int = 10): [Work!]!
    coauthors(depth: Int = 1): [Author!]! @resolver(source: "graph")

    # Données enrichies
    expertiseTopics: [String!]! @resolver(source: "ml")
    location: GeoPoint @resolver(source: "postgis")
  }

  type Institution {
    id: ID!
    name: String!
    ror: String
    country: String
    location: GeoPoint

    # Relations
    authors: [Author!]!
    works: [Work!]!

    # Données enrichies
    publicationTrend: [YearlyStats!]! @resolver(source: "timescale")
  }

  input GeoInput {
    lat: Float!
    lon: Float!
    radiusKm: Float!
  }

  input SearchFilters {
    yearFrom: Int
    yearTo: Int
    sources: [String!]
    types: [String!]
    openAccess: Boolean
    minCitations: Int
  }

  enum EntityType {
    WORK
    AUTHOR
    INSTITUTION
  }
`;

// Resolvers avec fédération
const resolvers = {
  Query: {
    search: async (_, args, context) => {
      // Exécution parallèle sur OpenSearch
      const [works, authors, institutions] = await Promise.all([
        context.dataSources.opensearch.searchWorks(args),
        context.dataSources.opensearch.searchAuthors(args),
        context.dataSources.opensearch.searchInstitutions(args)
      ]);

      return {
        works,
        authors,
        institutions,
        totalCount: works.length + authors.length + institutions.length,
        facets: await context.dataSources.opensearch.getFacets(args)
      };
    },

    findExperts: async (_, { topic, location, minHIndex }, context) => {
      // 1. Full-text search pour le topic
      const candidates = await context.dataSources.opensearch.searchAuthors({
        query: topic,
        minHIndex
      });

      if (!location) return candidates;

      // 2. Filtre géographique
      const authorIds = candidates.map(a => a.id);
      const geoFiltered = await context.dataSources.postgres.filterByLocation(
        authorIds,
        location
      );

      return candidates.filter(a => geoFiltered.includes(a.id));
    },

    similarWorks: async (_, { workId, limit }, context) => {
      // 1. Récupérer l'embedding du work
      const embedding = await context.dataSources.postgres.getWorkEmbedding(workId);

      // 2. Recherche ANN dans Qdrant
      const similarIds = await context.dataSources.qdrant.searchSimilar(
        embedding,
        limit,
        { excludeIds: [workId] }
      );

      // 3. Récupérer les détails depuis PostgreSQL
      return context.dataSources.postgres.getWorksByIds(similarIds);
    }
  },

  Work: {
    authors: async (work, _, context) => {
      return context.dataSources.postgres.getWorkAuthors(work.id);
    },

    citationTrend: async (work, _, context) => {
      return context.dataSources.timescale.getCitationTrend(work.id);
    },

    similarity: async (work, { to }, context) => {
      const [emb1, emb2] = await Promise.all([
        context.dataSources.postgres.getWorkEmbedding(work.id),
        context.dataSources.postgres.getWorkEmbedding(to)
      ]);
      return cosineSimilarity(emb1, emb2);
    }
  },

  Author: {
    coauthors: async (author, { depth }, context) => {
      // Traversée de graphe
      return context.dataSources.graph.getCoauthorNetwork(author.id, depth);
    },

    location: async (author, _, context) => {
      const affiliation = await context.dataSources.postgres.getCurrentAffiliation(author.id);
      if (!affiliation?.institutionId) return null;

      return context.dataSources.postgres.getInstitutionLocation(affiliation.institutionId);
    }
  }
};
```

---

## Architecture recommandée multi-bases

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE MULTI-BASES ATLAS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────────────┐                            │
│                              │   API Gateway   │                            │
│                              │   (GraphQL)     │                            │
│                              └────────┬────────┘                            │
│                                       │                                      │
│                              ┌────────┴────────┐                            │
│                              │  Query Planner  │                            │
│                              │  & Federation   │                            │
│                              └────────┬────────┘                            │
│                                       │                                      │
│          ┌────────────────────────────┼────────────────────────────┐        │
│          │                            │                            │        │
│          ▼                            ▼                            ▼        │
│  ┌───────────────┐          ┌───────────────┐          ┌───────────────┐   │
│  │  PostgreSQL   │          │  OpenSearch   │          │    Qdrant     │   │
│  │  + PostGIS    │          │               │          │   (vectors)   │   │
│  │  + TimescaleDB│          │               │          │               │   │
│  │  + pgvector   │          │               │          │               │   │
│  ├───────────────┤          ├───────────────┤          ├───────────────┤   │
│  │ • Entités     │          │ • Full-text   │          │ • Semantic    │   │
│  │ • Relations   │          │ • Facettes    │          │   search      │   │
│  │ • Géo         │          │ • Autocomplete│          │ • Similarity  │   │
│  │ • Time-series │          │ • Agrégations │          │ • Clustering  │   │
│  │ • Audit trail │          │               │          │               │   │
│  └───────────────┘          └───────────────┘          └───────────────┘   │
│          │                            │                            │        │
│          └────────────────────────────┼────────────────────────────┘        │
│                                       │                                      │
│                              ┌────────┴────────┐                            │
│                              │     Redis       │                            │
│                              │  (cache, queue) │                            │
│                              └─────────────────┘                            │
│                                                                              │
│  FLUX DE DONNÉES                                                             │
│  ───────────────                                                             │
│  1. Ingestion → PostgreSQL (source of truth)                                │
│  2. CDC/Sync → OpenSearch (full-text index)                                 │
│  3. CDC/Sync → Qdrant (embeddings index)                                    │
│  4. Queries → Federation layer → Multiple backends                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Synchronisation des données (CDC)

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// CHANGE DATA CAPTURE avec Debezium
// ═══════════════════════════════════════════════════════════════════════════

// docker-compose.yml (ou Kubernetes)
/*
version: '3'
services:
  debezium:
    image: debezium/connect:2.4
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: atlas-cdc
      CONFIG_STORAGE_TOPIC: connect-configs
      OFFSET_STORAGE_TOPIC: connect-offsets
      STATUS_STORAGE_TOPIC: connect-status

  # Ou utiliser Debezium Server (sans Kafka)
  debezium-server:
    image: debezium/server:2.4
    environment:
      DEBEZIUM_SOURCE_CONNECTOR_CLASS: io.debezium.connector.postgresql.PostgresConnector
      DEBEZIUM_SOURCE_DATABASE_HOSTNAME: postgres
      DEBEZIUM_SOURCE_DATABASE_PORT: 5432
      DEBEZIUM_SOURCE_DATABASE_USER: debezium
      DEBEZIUM_SOURCE_DATABASE_PASSWORD: secret
      DEBEZIUM_SOURCE_DATABASE_DBNAME: atlas
      DEBEZIUM_SINK_TYPE: http
      DEBEZIUM_SINK_HTTP_URL: http://sync-service:3000/cdc
*/

// Service de synchronisation
import { Effect, Queue, Stream } from 'effect';

interface CDCEvent {
  op: 'c' | 'u' | 'd' | 'r';  // create, update, delete, read (snapshot)
  source: {
    table: string;
    schema: string;
  };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ts_ms: number;
}

class SyncService {
  private readonly opensearch: OpenSearchClient;
  private readonly qdrant: QdrantClient;
  private readonly embedder: EmbeddingService;

  async handleCDCEvent(event: CDCEvent): Promise<void> {
    const { op, source, after, before } = event;

    switch (source.table) {
      case 'canonical_works':
        await this.syncWork(op, after, before);
        break;
      case 'author_profiles':
        await this.syncAuthor(op, after, before);
        break;
      case 'institutions':
        await this.syncInstitution(op, after, before);
        break;
    }
  }

  private async syncWork(
    op: string,
    after: Record<string, unknown> | null,
    before: Record<string, unknown> | null
  ): Promise<void> {
    if (op === 'd') {
      // Delete from OpenSearch and Qdrant
      await Promise.all([
        this.opensearch.delete('atlas', before!.id as string),
        this.qdrant.delete('work_embeddings', [before!.id as string])
      ]);
      return;
    }

    if (!after) return;

    // Generate embedding if text changed
    const needsEmbedding = op === 'c' ||
      before?.title !== after.title ||
      before?.abstract !== after.abstract;

    let embedding: number[] | undefined;
    if (needsEmbedding && (after.title || after.abstract)) {
      embedding = await this.embedder.embed(
        `${after.title} ${after.abstract}`
      );
    }

    // Sync to OpenSearch
    await this.opensearch.index('atlas', {
      id: after.id,
      body: {
        _entity_type: 'work',
        title: after.title,
        abstract: after.abstract,
        year: after.year,
        doi: after.doi,
        citation_count: after.citation_count,
        // ... other fields
      }
    });

    // Sync embedding to Qdrant
    if (embedding) {
      await this.qdrant.upsert('work_embeddings', {
        points: [{
          id: after.id as string,
          vector: { specter: embedding },
          payload: {
            year: after.year,
            source: after.source
          }
        }]
      });
    }
  }

  // Similar methods for authors and institutions...
}
```

### Kubernetes manifests complets

```yaml
# ═══════════════════════════════════════════════════════════════════════════
# NAMESPACE
# ═══════════════════════════════════════════════════════════════════════════
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-data
  labels:
    app.kubernetes.io/name: atlas

---
# ═══════════════════════════════════════════════════════════════════════════
# POSTGRESQL (CloudNativePG avec extensions)
# ═══════════════════════════════════════════════════════════════════════════
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: atlas-postgres
  namespace: atlas-data
spec:
  instances: 3

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "512MB"
      effective_cache_size: "2GB"
      maintenance_work_mem: "256MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "32MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"

    # Extensions activées
    shared_preload_libraries:
      - timescaledb
      - pg_stat_statements

  bootstrap:
    initdb:
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS postgis
        - CREATE EXTENSION IF NOT EXISTS postgis_topology
        - CREATE EXTENSION IF NOT EXISTS timescaledb
        - CREATE EXTENSION IF NOT EXISTS vector
        - CREATE EXTENSION IF NOT EXISTS pg_trgm
        - CREATE EXTENSION IF NOT EXISTS btree_gin

  storage:
    size: 100Gi
    storageClass: ceph-block

  resources:
    requests:
      memory: "2Gi"
      cpu: "1"
    limits:
      memory: "4Gi"
      cpu: "4"

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
        maxParallel: 4
      data:
        compression: gzip
    retentionPolicy: "30d"

  monitoring:
    enablePodMonitor: true

---
# ═══════════════════════════════════════════════════════════════════════════
# OPENSEARCH (via Operator)
# ═══════════════════════════════════════════════════════════════════════════
apiVersion: opensearch.opster.io/v1
kind: OpenSearchCluster
metadata:
  name: atlas-opensearch
  namespace: atlas-data
spec:
  general:
    serviceName: atlas-opensearch
    version: 2.11.0
    httpPort: 9200
    pluginsList:
      - analysis-icu
      - analysis-kuromoji
      - analysis-smartcn
    drainDataNodes: true

  dashboards:
    enable: true
    replicas: 1
    resources:
      requests:
        memory: "512Mi"
        cpu: "200m"

  security:
    config:
      securityConfigSecret:
        name: opensearch-security-config
      adminCredentialsSecret:
        name: opensearch-admin-credentials

  nodePools:
    - component: masters
      replicas: 3
      roles:
        - master
      resources:
        requests:
          memory: "1Gi"
          cpu: "500m"
        limits:
          memory: "2Gi"
          cpu: "1"
      persistence:
        pvc:
          storageClass: ceph-block
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi

    - component: data
      replicas: 3
      roles:
        - data
        - ingest
      resources:
        requests:
          memory: "4Gi"
          cpu: "1"
        limits:
          memory: "8Gi"
          cpu: "4"
      persistence:
        pvc:
          storageClass: ceph-block
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
      jvm: "-Xmx4g -Xms4g"

---
# ═══════════════════════════════════════════════════════════════════════════
# QDRANT
# ═══════════════════════════════════════════════════════════════════════════
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: qdrant
  namespace: atlas-data
spec:
  serviceName: qdrant
  replicas: 1  # Single node pour commencer, scale later
  selector:
    matchLabels:
      app: qdrant
  template:
    metadata:
      labels:
        app: qdrant
    spec:
      containers:
        - name: qdrant
          image: qdrant/qdrant:v1.7.4
          ports:
            - containerPort: 6333
              name: http
            - containerPort: 6334
              name: grpc
          env:
            - name: QDRANT__SERVICE__GRPC_PORT
              value: "6334"
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "4Gi"
              cpu: "2"
          volumeMounts:
            - name: storage
              mountPath: /qdrant/storage
          livenessProbe:
            httpGet:
              path: /
              port: 6333
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 6333
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: ceph-block
        resources:
          requests:
            storage: 50Gi

---
apiVersion: v1
kind: Service
metadata:
  name: qdrant
  namespace: atlas-data
spec:
  selector:
    app: qdrant
  ports:
    - port: 6333
      targetPort: 6333
      name: http
    - port: 6334
      targetPort: 6334
      name: grpc

---
# ═══════════════════════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════════════════════
# Via Helm: helm install redis bitnami/redis -n atlas-data -f redis-values.yaml

# redis-values.yaml
# architecture: replication
# auth:
#   enabled: true
#   existingSecret: redis-password
# master:
#   persistence:
#     size: 8Gi
# replica:
#   replicaCount: 2
#   persistence:
#     size: 8Gi
# metrics:
#   enabled: true
#   serviceMonitor:
#     enabled: true

---
# ═══════════════════════════════════════════════════════════════════════════
# SYNC SERVICE (CDC Consumer)
# ═══════════════════════════════════════════════════════════════════════════
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sync-service
  namespace: atlas-data
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sync-service
  template:
    metadata:
      labels:
        app: sync-service
    spec:
      containers:
        - name: sync
          image: ghcr.io/univ-lehavre/atlas-sync:latest
          env:
            - name: POSTGRES_URL
              valueFrom:
                secretKeyRef:
                  name: atlas-secrets
                  key: postgres-url
            - name: OPENSEARCH_URL
              value: "http://atlas-opensearch:9200"
            - name: QDRANT_URL
              value: "http://qdrant:6333"
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: atlas-secrets
                  key: redis-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

---

## Patterns d'interface utilisateur

### Recherche facettée multi-entités

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT SVELTE - RECHERCHE MULTI-ENTITÉS
// ═══════════════════════════════════════════════════════════════════════════

// src/lib/components/Search.svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';

  interface SearchState {
    query: string;
    entityTypes: ('work' | 'author' | 'institution')[];
    filters: {
      yearFrom?: number;
      yearTo?: number;
      sources?: string[];
      openAccess?: boolean;
      location?: { lat: number; lon: number; radiusKm: number };
    };
    sort: string;
    page: number;
  }

  let state: SearchState = $state({
    query: '',
    entityTypes: ['work', 'author', 'institution'],
    filters: {},
    sort: 'relevance',
    page: 1
  });

  const searchQuery = createQuery({
    queryKey: ['search', state],
    queryFn: () => fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(state)
    }).then(r => r.json()),
    enabled: state.query.length > 2
  });

  // Autocomplete
  let suggestions = $state<Suggestion[]>([]);

  const fetchSuggestions = async (prefix: string) => {
    if (prefix.length < 2) {
      suggestions = [];
      return;
    }
    const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(prefix)}`);
    suggestions = await res.json();
  };

  // Debounce
  let debounceTimer: number;
  const onInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    state.query = value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(value), 150);
  };
</script>

<div class="search-container">
  <!-- Barre de recherche -->
  <div class="search-bar">
    <input
      type="text"
      value={state.query}
      oninput={onInput}
      placeholder="Rechercher des articles, auteurs, institutions..."
    />

    <!-- Suggestions autocomplete -->
    {#if suggestions.length > 0}
      <div class="suggestions">
        {#each suggestions as suggestion}
          <button onclick={() => { state.query = suggestion.text; suggestions = []; }}>
            <span class="type-badge">{suggestion.type}</span>
            <span class="text">{suggestion.text}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Filtres entités -->
  <div class="entity-filters">
    {#each ['work', 'author', 'institution'] as type}
      <label>
        <input
          type="checkbox"
          checked={state.entityTypes.includes(type)}
          onchange={(e) => {
            if (e.target.checked) {
              state.entityTypes = [...state.entityTypes, type];
            } else {
              state.entityTypes = state.entityTypes.filter(t => t !== type);
            }
          }}
        />
        {type === 'work' ? 'Publications' : type === 'author' ? 'Auteurs' : 'Institutions'}
      </label>
    {/each}
  </div>

  <!-- Résultats avec facettes -->
  <div class="results-layout">
    <!-- Facettes (gauche) -->
    <aside class="facets">
      {#if $searchQuery.data?.facets}
        <FacetGroup
          title="Année"
          facet={$searchQuery.data.facets.by_year}
          onSelect={(year) => { state.filters.yearFrom = year; state.filters.yearTo = year; }}
        />
        <FacetGroup
          title="Source"
          facet={$searchQuery.data.facets.by_source}
          onSelect={(source) => { state.filters.sources = [source]; }}
        />
        <FacetGroup
          title="Type"
          facet={$searchQuery.data.facets.by_type}
          onSelect={(type) => { /* ... */ }}
        />
        <FacetGroup
          title="Citations"
          facet={$searchQuery.data.facets.citation_ranges}
          type="range"
        />
      {/if}
    </aside>

    <!-- Résultats (centre) -->
    <main class="results">
      {#if $searchQuery.isLoading}
        <LoadingSpinner />
      {:else if $searchQuery.data}
        <!-- Onglets par type d'entité -->
        <Tabs>
          <Tab label="Publications ({$searchQuery.data.works.length})">
            {#each $searchQuery.data.works as work}
              <WorkCard {work} highlights={work._highlights} />
            {/each}
          </Tab>
          <Tab label="Auteurs ({$searchQuery.data.authors.length})">
            {#each $searchQuery.data.authors as author}
              <AuthorCard {author} />
            {/each}
          </Tab>
          <Tab label="Institutions ({$searchQuery.data.institutions.length})">
            {#each $searchQuery.data.institutions as institution}
              <InstitutionCard {institution} />
            {/each}
          </Tab>
        </Tabs>
      {/if}
    </main>
  </div>
</div>
```

### Carte des experts

```typescript
// src/lib/components/ExpertMap.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';

  interface Props {
    topic: string;
    minHIndex?: number;
  }

  let { topic, minHIndex = 10 }: Props = $props();

  let map: maplibregl.Map;
  let mapContainer: HTMLDivElement;

  const expertsQuery = createQuery({
    queryKey: ['experts', topic, minHIndex],
    queryFn: () => fetch(`/api/experts?topic=${topic}&minHIndex=${minHIndex}`).then(r => r.json())
  });

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [2.3522, 48.8566],
      zoom: 4
    });

    return () => map.remove();
  });

  // Update markers when data changes
  $effect(() => {
    if (!map || !$expertsQuery.data) return;

    // Clear existing markers
    document.querySelectorAll('.expert-marker').forEach(el => el.remove());

    // Add new markers
    for (const expert of $expertsQuery.data) {
      if (!expert.location) continue;

      const el = document.createElement('div');
      el.className = 'expert-marker';
      el.style.width = `${Math.min(20 + expert.hIndex, 50)}px`;
      el.style.height = `${Math.min(20 + expert.hIndex, 50)}px`;

      new maplibregl.Marker(el)
        .setLngLat([expert.location.lon, expert.location.lat])
        .setPopup(new maplibregl.Popup().setHTML(`
          <div class="expert-popup">
            <h3>${expert.displayName}</h3>
            <p>${expert.institution}</p>
            <p>h-index: ${expert.hIndex}</p>
            <p>${expert.worksOnTopic} publications sur "${topic}"</p>
          </div>
        `))
        .addTo(map);
    }
  });
</script>

<div class="expert-map-container">
  <div class="controls">
    <input
      type="text"
      bind:value={topic}
      placeholder="Sujet de recherche..."
    />
    <input
      type="number"
      bind:value={minHIndex}
      min="0"
      max="100"
    />
  </div>

  <div bind:this={mapContainer} class="map"></div>

  <div class="legend">
    <p>Taille des marqueurs proportionnelle au h-index</p>
  </div>
</div>

<style>
  .map {
    width: 100%;
    height: 600px;
  }

  :global(.expert-marker) {
    background: rgba(59, 130, 246, 0.7);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
  }

  :global(.expert-marker:hover) {
    transform: scale(1.2);
  }
</style>
```

### Visualisation du réseau de co-auteurs

```typescript
// src/lib/components/CoauthorNetwork.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph3D from '3d-force-graph';

  interface Props {
    authorId: string;
    depth?: number;
  }

  let { authorId, depth = 2 }: Props = $props();

  let container: HTMLDivElement;
  let graph: any;

  const networkQuery = createQuery({
    queryKey: ['coauthor-network', authorId, depth],
    queryFn: () => fetch(`/api/authors/${authorId}/network?depth=${depth}`).then(r => r.json())
  });

  onMount(() => {
    graph = ForceGraph3D()(container)
      .nodeLabel('name')
      .nodeColor(node => node.id === authorId ? '#ef4444' : '#3b82f6')
      .nodeVal(node => Math.sqrt(node.hIndex || 1))
      .linkWidth(link => Math.sqrt(link.coauthorships))
      .linkColor(() => 'rgba(100, 100, 100, 0.5)')
      .onNodeClick(node => {
        // Navigate to author profile
        window.location.href = `/authors/${node.id}`;
      });

    return () => graph._destructor();
  });

  $effect(() => {
    if (!graph || !$networkQuery.data) return;

    graph.graphData({
      nodes: $networkQuery.data.nodes.map(n => ({
        id: n.id,
        name: n.displayName,
        hIndex: n.hIndex,
        institution: n.institution
      })),
      links: $networkQuery.data.edges.map(e => ({
        source: e.from,
        target: e.to,
        coauthorships: e.coauthorships
      }))
    });
  });
</script>

<div class="network-container">
  <div class="controls">
    <label>
      Profondeur:
      <input type="range" min="1" max="3" bind:value={depth} />
      {depth}
    </label>
  </div>

  <div bind:this={container} class="graph"></div>

  <div class="stats">
    {#if $networkQuery.data}
      <p>{$networkQuery.data.nodes.length} auteurs</p>
      <p>{$networkQuery.data.edges.length} collaborations</p>
    {/if}
  </div>
</div>

<style>
  .graph {
    width: 100%;
    height: 700px;
    background: #1a1a2e;
  }
</style>
```

### Tendances temporelles

```typescript
// src/lib/components/DomainTrends.svelte
<script lang="ts">
  import { Chart } from 'chart.js/auto';

  interface Props {
    domain: string;
    fromYear?: number;
    toYear?: number;
  }

  let { domain, fromYear = 2015, toYear = 2024 }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  const trendsQuery = createQuery({
    queryKey: ['trends', domain, fromYear, toYear],
    queryFn: () => fetch(
      `/api/trends?domain=${domain}&from=${fromYear}&to=${toYear}`
    ).then(r => r.json())
  });

  $effect(() => {
    if (!canvas || !$trendsQuery.data) return;

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: $trendsQuery.data.map(d => d.year),
        datasets: [
          {
            label: 'Publications',
            data: $trendsQuery.data.map(d => d.publicationCount),
            borderColor: '#3b82f6',
            yAxisID: 'y'
          },
          {
            label: 'Citations moyennes',
            data: $trendsQuery.data.map(d => d.avgCitations),
            borderColor: '#10b981',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Publications' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Citations moyennes' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });

    return () => chart?.destroy();
  });
</script>

<div class="trends-container">
  <div class="controls">
    <input type="text" bind:value={domain} placeholder="Domaine..." />
    <input type="number" bind:value={fromYear} min="1990" max="2024" />
    <input type="number" bind:value={toYear} min="1990" max="2024" />
  </div>

  <canvas bind:this={canvas}></canvas>

  {#if $trendsQuery.data}
    <div class="highlights">
      <div class="stat">
        <span class="value">{$trendsQuery.data.reduce((a, b) => a + b.publicationCount, 0)}</span>
        <span class="label">Total publications</span>
      </div>
      <div class="stat">
        <span class="value">
          {(($trendsQuery.data[$trendsQuery.data.length - 1]?.publicationCount -
            $trendsQuery.data[0]?.publicationCount) /
            $trendsQuery.data[0]?.publicationCount * 100).toFixed(1)}%
        </span>
        <span class="label">Croissance</span>
      </div>
    </div>
  {/if}
</div>
```

---

## Synthèse et recommandations

### Architecture finale recommandée

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE ATLAS - SYNTHÈSE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIER 1 - ESSENTIEL (v1)                                                    │
│  ───────────────────────                                                     │
│  • PostgreSQL 16 + PostGIS + TimescaleDB + pgvector                         │
│    → Base principale, source de vérité                                      │
│  • OpenSearch                                                                │
│    → Full-text, facettes, autocomplete                                      │
│  • Redis                                                                     │
│    → Cache, sessions, jobs                                                   │
│                                                                              │
│  TIER 2 - ENRICHISSEMENT (v2)                                               │
│  ────────────────────────────                                                │
│  • Qdrant                                                                    │
│    → Recherche sémantique, similarité (si pgvector insuffisant)            │
│  • Meilisearch                                                               │
│    → Autocomplete ultra-rapide (si OpenSearch trop lent)                    │
│                                                                              │
│  TIER 3 - AVANCÉ (v3)                                                       │
│  ─────────────────────                                                       │
│  • ArangoDB ou Neo4j                                                         │
│    → Graphe de co-auteurs, citations (si traversées complexes)             │
│  • ClickHouse                                                                │
│    → Analytics lourdes, reporting (si TimescaleDB insuffisant)             │
│                                                                              │
│  DÉCISIONS CLÉS                                                              │
│  ──────────────                                                              │
│                                                                              │
│  PostgreSQL comme pivot :                                                    │
│  • Une seule base à opérer initialement                                     │
│  • Extensions couvrent 80% des besoins                                      │
│  • pgvector pour vecteurs (suffisant < 10M)                                 │
│  • PostGIS pour géo                                                          │
│  • TimescaleDB pour time-series                                             │
│                                                                              │
│  OpenSearch pour recherche :                                                 │
│  • Full-text avancé, multilingue                                            │
│  • Facettes et agrégations                                                   │
│  • Vector search intégré (k-NN)                                             │
│  • Open source (Apache 2.0)                                                  │
│                                                                              │
│  Fédération au niveau application :                                         │
│  • GraphQL comme interface unifiée                                          │
│  • Query planner intelligent                                                │
│  • CDC pour synchronisation                                                  │
│  • Pas de Trino (trop complexe pour v1)                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Estimation des ressources

| Composant | v1 (basique) | v2 (production) | v3 (scale) |
|-----------|--------------|-----------------|------------|
| PostgreSQL | 3×2Gi, 100Gi | 3×4Gi, 200Gi | 5×8Gi, 500Gi |
| OpenSearch | 2×4Gi, 50Gi | 3×8Gi, 200Gi | 6×16Gi, 1Ti |
| Qdrant | - | 1×2Gi, 50Gi | 3×4Gi, 200Gi |
| Redis | 1×512Mi | 3×1Gi | 3×2Gi |
| API/Workers | 4×512Mi | 8×1Gi | 16×2Gi |
| **Total** | ~20Gi RAM | ~50Gi RAM | ~150Gi RAM |

### Roadmap d'implémentation

| Phase | Durée | Composants | Fonctionnalités |
|-------|-------|------------|-----------------|
| **v1.0** | 2 mois | PG+OS+Redis | Recherche basique, vérification |
| **v1.5** | 1 mois | + pgvector | Similarité sémantique |
| **v2.0** | 2 mois | + Qdrant, Meili | Recherche avancée, autocomplete |
| **v2.5** | 1 mois | + TimescaleDB | Tendances, métriques |
| **v3.0** | 3 mois | + ArangoDB | Graphe co-auteurs, traversées |
