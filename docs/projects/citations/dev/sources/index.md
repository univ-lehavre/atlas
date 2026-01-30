# Source Modules

Each source module (`atlas-openalex`, `atlas-crossref`, etc.) follows the same construction process but with strategies adapted to each API.

> **See also:**
> - [Full Catalog](./catalog.md) - List of all analyzed sources
> - [Entities Reference](./entities-reference.md) - Available entities per source
> - [Unified Schema](../unified-schema.md) - How sources are mapped to the common schema

## Process Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODULE CONSTRUCTION PROCESS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ANALYSIS         2. ALPHA SPEC      3. VALIDATION      4. CLIENT       │
│  ──────────          ────────────       ────────────       ────────        │
│                                                                             │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐    │
│  │ Official │──┐    │          │       │          │       │          │    │
│  │ Swagger  │  │    │  alpha/  │       │  beta/   │       │ Effect   │    │
│  └──────────┘  │    │  source- │       │  source- │       │ Client   │    │
│                ├───>│  version │──────>│  version │──────>│          │    │
│  ┌──────────┐  │    │  .yaml   │       │  .yaml   │       │ + Types  │    │
│  │ API Docs │──┤    │          │       │          │       │ generated│    │
│  └──────────┘  │    └──────────┘       └──────────┘       └──────────┘    │
│                │          │                  │                  │          │
│  ┌──────────┐  │          │                  │                  │          │
│  │ Reverse  │──┘          ▼                  ▼                  ▼          │
│  │ engineer │        Initial            Iterative          stable/        │
│  └──────────┘        validation         validation         + current      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alpha Spec Construction Methods

### Method 1: Retrieval from Official Swagger

**Applicable to:** Crossref

```bash
# Download and convert
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --format yaml \
  --set-stage alpha
```

**Advantages:**
- Officially maintained spec
- Generally complete and up-to-date

**Disadvantages:**
- May contain errors or omissions
- Sometimes non-standard format

### Method 2: Construction from Documentation

**Applicable to:** OpenAlex, HAL, ORCID

Manual or semi-automatic process based on official documentation.

```bash
# Step 1: Create skeleton
atlas-openapi-validator scaffold \
  --name openalex \
  --base-url https://api.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml

# Step 2: Enrich with discovered endpoints
atlas-openapi-validator discover https://api.openalex.org \
  --probe-endpoints /works,/authors,/sources,/institutions \
  --append-to specs/alpha/openalex-2025-01-24.yaml
```

**Recommended manual structure:**

```yaml
# specs/alpha/openalex-2025-01-24.yaml
openapi: '3.1.0'
info:
  title: OpenAlex API
  version: '2025-01-24'
  description: |
    Spec built from official documentation.
    Source: https://docs.openalex.org
  x-atlas-metadata:
    stage: alpha
    origin:
      type: documentation
      urls:
        - https://docs.openalex.org/api-entities/works
        - https://docs.openalex.org/api-entities/authors
    createdAt: '2025-01-24T10:00:00Z'

servers:
  - url: https://api.openalex.org

paths:
  /works:
    get:
      operationId: listWorks
      # ... built from documentation
```

### Method 3: Reverse Engineering

**Applicable to:** ArXiv (Atom/XML API), APIs without documentation

Schema inference from real responses.

```bash
# Capture responses and infer schema
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --endpoints /query \
  --sample-size 50 \
  --output specs/alpha/arxiv-2025-01.yaml

# For XML APIs, convert to JSON schema
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --response-format xml \
  --transform-to json \
  --output specs/alpha/arxiv-2025-01.yaml
```

**Inference process:**

```typescript
// Pseudo-code of the inference process
const inferSchema = async (baseUrl: string, endpoint: string) => {
  const samples: unknown[] = [];

  // Collect samples
  for (let i = 0; i < sampleSize; i++) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    samples.push(await response.json());
  }

  // Analyze types
  const schema = analyzeTypes(samples);

  // Detect optional fields (absent in some responses)
  const optionalFields = detectOptionalFields(samples);

  // Detect enums (repetitive values)
  const enums = detectEnums(samples);

  return buildOpenAPISchema(schema, optionalFields, enums);
};
```

### Method 4: Hybrid (Recommended)

Combine multiple sources for a more robust spec.

```bash
# 1. Start from documentation
atlas-openapi-validator scaffold \
  --from-docs https://docs.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml

# 2. Enrich by inference
atlas-openapi-validator infer \
  --base-url https://api.openalex.org \
  --merge-into specs/alpha/openalex-2025-01-24.yaml \
  --only-missing  # Only add what's missing

# 3. Validate and correct
atlas-openapi-validator validate specs/alpha/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --auto-fix \
  --confidence 0.95
```

## Detailed Source Modules

- [OpenAlex](./openalex.md) - Construction from documentation
- [Crossref](./crossref.md) - Swagger retrieval + adaptation
- [HAL](./hal.md) - Solr API, manual construction
- [ArXiv](./arxiv.md) - XML API, reverse engineering
- [ORCID](./orcid.md) - Construction from documentation

## Consistent Versioning

See [Versioning Strategy](./versioning.md) for consistency between modules.
