# OpenAPI Spec Lifecycle

## Versioning Strategies by Source

Each source has its own versioning strategy tailored to its API:

| Source | Strategy | Example |
|--------|----------|---------|
| **REDCap** | Software version | `redcap-14.5.10.yaml`, `redcap-15.5.32.yaml` |
| **Crossref** | API version + date | `crossref-v1-2025-01.yaml` |
| **OpenAlex** | Date snapshot | `openalex-2025-01-24.yaml` |
| **HAL** | Date snapshot | `hal-2025-01.yaml` |
| **ArXiv** | Date snapshot | `arxiv-2025-01.yaml` |
| **ORCID** | API version | `orcid-v3.0.yaml` |

## Maturation Cycle: alpha -> beta -> stable

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SPEC LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  SOURCE  │───>│  ALPHA   │───>│   BETA   │───>│  STABLE  │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                 │
│       │               │               │               │                 │
│  - Swagger UI         │               │               │                 │
│  - Documentation      │          Validation      Final                  │
│  - Reverse-eng.       │          + Fixes        Validation              │
│  - Inference          │               │               │                 │
│                       ▼               ▼               ▼                 │
│                  specs/alpha/    specs/beta/    specs/stable/           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Versioned Specs Structure

```
packages/{source}/
├── specs/
│   ├── alpha/                      # Raw specs, not validated
│   │   └── {source}-{version}.yaml
│   ├── beta/                       # Validated specs, being stabilized
│   │   └── {source}-{version}.yaml
│   ├── stable/                     # Validated and stable specs
│   │   └── {source}-{version}.yaml
│   └── current.yaml                # Symlink to current stable spec
```

## Spec Metadata

```typescript
type SpecStage = 'alpha' | 'beta' | 'stable';

interface SpecMetadata {
  source: string;                    // 'openalex', 'redcap', etc.
  version: string;                   // '2025-01-24', '14.5.10', 'v3.0'
  stage: SpecStage;
  createdAt: Date;
  lastValidatedAt?: Date;
  validationReport?: string;         // Path to the report
  origin: SpecOrigin;
}

type SpecOrigin =
  | { type: 'official_swagger'; url: string }           // Crossref
  | { type: 'documentation'; urls: string[] }           // OpenAlex, HAL
  | { type: 'reverse_engineered'; tool?: string }       // Inference
  | { type: 'software_version'; version: string }       // REDCap
  | { type: 'community'; repository: string };          // Community specs
```

## Iterative Validation Workflow

### 1. Alpha Creation

```bash
# Option A: Fetch from official Swagger
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --set-stage alpha

# Option B: Generate from documentation (semi-automatic)
atlas-openapi-validator generate \
  --from-docs https://docs.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml \
  --set-stage alpha

# Option C: Create manually
# -> specs/alpha/{source}-{version}.yaml
```

### 2. Validation alpha -> beta

```bash
# Validate against real API
atlas-openapi-validator validate specs/alpha/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-alpha.json \
  --sample-size 10

# Apply automatic fixes (high confidence)
atlas-openapi-validator fix specs/alpha/openalex-2025-01-24.yaml \
  --report reports/openalex-2025-01-24-alpha.json \
  --confidence 0.9 \
  --output specs/beta/openalex-2025-01-24.yaml \
  --set-stage beta
```

### 3. Beta Iteration (until convergence)

```bash
# Re-validate
atlas-openapi-validator validate specs/beta/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-beta-1.json

# If errors > 0: fix and re-test
atlas-openapi-validator fix specs/beta/openalex-2025-01-24.yaml \
  --report reports/openalex-2025-01-24-beta-1.json \
  --confidence 0.8

# Repeat until convergence (errors = 0)
```

### 4. Stable Promotion

```bash
# Exhaustive final validation
atlas-openapi-validator validate specs/beta/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-final.json \
  --sample-size 50 \
  --all-endpoints

# If OK, promote
atlas-openapi-validator promote specs/beta/openalex-2025-01-24.yaml \
  --to stable \
  --set-current  # Updates the current.yaml symlink
```

## Promotion Criteria

```typescript
interface PromotionCriteria {
  alpha_to_beta: {
    maxErrors: 0;              // No blocking errors
    maxWarnings: 10;           // Warnings tolerated
    minCoverage: 0.5;          // 50% of endpoints tested
  };
  beta_to_stable: {
    maxErrors: 0;
    maxWarnings: 5;
    minCoverage: 0.9;          // 90% of endpoints tested
    minSampleSize: 20;         // At least 20 requests per endpoint
    consecutiveSuccess: 3;     // 3 consecutive successful validations
  };
}
```

## CI Integration

Validations are run on a schedule (not on every PR) to avoid exhausting quotas:

```yaml
# .github/workflows/validate-specs.yml
name: Validate OpenAPI Specs

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6am

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        source: [openalex, crossref, hal, arxiv, orcid]
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: |
          pnpm -F @univ-lehavre/atlas-${{ matrix.source }} validate:spec
```
