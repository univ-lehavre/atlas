# Versioning Strategy

This document describes the consistent versioning strategy across all bibliographic sources and the atlas-citations aggregator package.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERSIONING STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SOURCE             STRATEGY             EXAMPLE                            │
│  ──────────────────────────────────────────────────────────────────────     │
│  REDCap             Software version     redcap-14.5.10.yaml                │
│  Crossref           API version + date   crossref-v1-2025-01.yaml           │
│  OpenAlex           Date snapshot        openalex-2025-01-24.yaml           │
│  HAL                Date snapshot        hal-2025-01.yaml                   │
│  ArXiv              Date snapshot        arxiv-2025-01.yaml                 │
│  ORCID              API version          orcid-v3.0.yaml                    │
│                                                                              │
│  atlas-citations    Semantic version     1.0.0 (package)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why Different Strategies?

Each source has different characteristics that dictate the best versioning strategy:

| Source | Characteristic | Adapted Strategy |
|--------|-----------------|-------------------|
| **REDCap** | Software with explicit versions | Software version |
| **Crossref** | Versioned API (v1) but evolving | API version + date |
| **OpenAlex** | Non-versioned API, frequent changes | Date snapshot |
| **HAL** | Stable Solr API | Date snapshot |
| **ArXiv** | Stable legacy API | Date snapshot |
| **ORCID** | Versioned API (v3.0) | API version |

## Strategy by Type

### 1. Software Version (REDCap)

For APIs associated with versioned software where the spec depends on the installed version.

```
specs/
├── alpha/
│   └── redcap-15.5.32.yaml    # New version being tested
├── beta/
│   └── redcap-15.5.32.yaml    # In validation
├── stable/
│   ├── redcap-14.5.10.yaml    # Previous version
│   └── redcap-15.5.32.yaml    # Current version
└── current.yaml -> stable/redcap-15.5.32.yaml
```

**Naming convention:** `{source}-{major}.{minor}.{patch}.yaml`

**When to create a new version:**
- New major/minor REDCap release
- API changes documented in release notes

### 2. API Version + Date (Crossref)

For APIs with explicit versioning but that evolve within the same version.

```
specs/
├── alpha/
│   └── crossref-v1-2025-01.yaml
├── beta/
│   └── crossref-v1-2025-01.yaml
├── stable/
│   ├── crossref-v1-2024-06.yaml    # Previous snapshot
│   └── crossref-v1-2025-01.yaml    # Current snapshot
└── current.yaml -> stable/crossref-v1-2025-01.yaml
```

**Naming convention:** `{source}-v{api_version}-{YYYY-MM}.yaml`

**When to create a new version:**
- Every 6 months (maintenance)
- When significant deviations are detected
- New major API version announced

### 3. Date Snapshot (OpenAlex, HAL, ArXiv)

For APIs without explicit versioning where we capture state at a point in time.

```
specs/
├── alpha/
│   └── openalex-2025-01-24.yaml
├── beta/
│   └── openalex-2025-01-24.yaml
├── stable/
│   ├── openalex-2024-07-15.yaml    # Old snapshot
│   └── openalex-2025-01-24.yaml    # Current snapshot
└── current.yaml -> stable/openalex-2025-01-24.yaml
```

**Naming convention:** `{source}-{YYYY-MM-DD}.yaml`

**When to create a new version:**
- Every 3-6 months (proactive maintenance)
- When deviations are detected by validation
- Provider announces changes

### 4. API Version (ORCID)

For APIs with strict semantic versioning where specs are stable between versions.

```
specs/
├── alpha/
│   └── orcid-v3.0.yaml
├── stable/
│   ├── orcid-v2.1.yaml    # Old version (deprecated)
│   └── orcid-v3.0.yaml    # Current version
└── current.yaml -> stable/orcid-v3.0.yaml
```

**Naming convention:** `{source}-v{major}.{minor}.yaml`

**When to create a new version:**
- Only when a new API version is announced
- Maintain old versions as long as they are supported

## Version Metadata

Each spec contains standardized metadata:

```yaml
info:
  title: OpenAlex API
  version: '2025-01-24'           # Spec version
  x-atlas-metadata:
    stage: stable                  # alpha | beta | stable
    specVersion: '2025-01-24'      # Unique identifier for this spec
    apiVersion: null               # null if not versioned, otherwise "v3.0"
    origin:
      type: documentation          # official_swagger | documentation | reverse_engineered
      urls:
        - https://docs.openalex.org
      fetchedAt: '2025-01-24T10:00:00Z'
    createdAt: '2025-01-24T10:00:00Z'
    lastValidatedAt: '2025-01-24T15:30:00Z'
    validationReport: 'reports/openalex-2025-01-24-stable.json'
    previousVersion: '2024-07-15'  # Link to previous version
    deprecatedAt: null             # null if active, date if deprecated
    notes: []
```

## Management in atlas-citations

The atlas-citations aggregator package uses standard semantic versioning:

```json
{
  "name": "@univ-lehavre/atlas-citations",
  "version": "1.0.0"
}
```

### Compatibility Matrix

atlas-citations maintains a compatibility matrix with source specs:

```yaml
# packages/citations/compatibility.yaml
version: '1.0.0'
sources:
  openalex:
    specVersion: '2025-01-24'
    minSpecVersion: '2024-07-15'
    adapter: 'openalex-adapter-v1'
  crossref:
    specVersion: 'v1-2025-01'
    minSpecVersion: 'v1-2024-06'
    adapter: 'crossref-adapter-v1'
  hal:
    specVersion: '2025-01'
    minSpecVersion: '2024-06'
    adapter: 'hal-adapter-v1'
  arxiv:
    specVersion: '2025-01'
    minSpecVersion: '2024-06'
    adapter: 'arxiv-adapter-v1'
  orcid:
    specVersion: 'v3.0'
    minSpecVersion: 'v3.0'
    adapter: 'orcid-adapter-v3'
```

### atlas-citations Versioning Rules

| Change | Version Impact |
|------------|-------------------|
| New source added | Minor (1.x.0) |
| New source spec (compatible) | Patch (1.0.x) |
| Breaking change in unified schema | Major (x.0.0) |
| New client method | Minor (1.x.0) |
| Adapter fix | Patch (1.0.x) |

## Update Workflow

### 1. Detecting a Necessary Update

```bash
# Periodic validation (CI scheduled)
atlas-openapi-validator validate specs/stable/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-check-2025-01-30.json

# If deviations detected -> create new alpha spec
```

### 2. Creating the New Spec

```bash
# Copy the current stable spec
cp specs/stable/openalex-2025-01-24.yaml specs/alpha/openalex-2025-01-30.yaml

# Update metadata
# info.version: '2025-01-30'
# x-atlas-metadata.stage: alpha
# x-atlas-metadata.previousVersion: '2025-01-24'

# Apply corrections
atlas-openapi-validator fix specs/alpha/openalex-2025-01-30.yaml \
  --report reports/openalex-check-2025-01-30.json \
  --confidence 0.9
```

### 3. Validation and Promotion

```bash
# Validate alpha -> beta
atlas-openapi-validator validate specs/alpha/openalex-2025-01-30.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-alpha-2025-01-30.json

# If OK, promote to beta
atlas-openapi-validator promote specs/alpha/openalex-2025-01-30.yaml \
  --to beta

# Iterate until convergence...

# Promote to stable
atlas-openapi-validator promote specs/beta/openalex-2025-01-30.yaml \
  --to stable \
  --set-current
```

### 4. Updating atlas-citations

```bash
# Update the compatibility matrix
# packages/citations/compatibility.yaml

# Bump version
pnpm changeset  # "Updated OpenAlex spec to 2025-01-30"

# Tests
pnpm -F @univ-lehavre/atlas-citations test
pnpm -F @univ-lehavre/atlas-citations test:integration
```

## Deprecation

### Marking a Spec as Deprecated

```yaml
info:
  x-atlas-metadata:
    deprecatedAt: '2025-02-01'
    deprecationReason: 'Replaced by 2025-01-30 with major fixes'
    removalDate: '2025-08-01'  # 6 months notice
```

### Retention Policy

| Stage | Retention |
|-------|-----------|
| alpha | Deleted after promotion or abandonment (max 1 month) |
| beta | Deleted after promotion to stable |
| stable | Kept 6 months after deprecation |
| deprecated | Kept 6 months, then archived |

## Automation

### CI/CD: Periodic Validation

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
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - name: Validate ${{ matrix.source }}
        run: |
          pnpm -F @univ-lehavre/atlas-${{ matrix.source }} validate:spec
      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: validation-report-${{ matrix.source }}
          path: reports/${{ matrix.source }}-*.json
```

### Renovate: Spec Updates

```json
// renovate.json
{
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["packages/.*/compatibility\\.yaml$"],
      "matchStrings": [
        "specVersion: '(?<currentValue>\\d{4}-\\d{2}-\\d{2})'"
      ],
      "datasourceTemplate": "custom.atlas-specs",
      "depNameTemplate": "{{depName}}-spec"
    }
  ]
}
```

## Convention Summary

| Source | Version Format | Example | Update Frequency |
|--------|---------------|---------|---------------|
| REDCap | `{major}.{minor}.{patch}` | `15.5.32` | Per release |
| Crossref | `v{api}-{YYYY-MM}` | `v1-2025-01` | ~6 months |
| OpenAlex | `{YYYY-MM-DD}` | `2025-01-24` | ~3 months |
| HAL | `{YYYY-MM}` | `2025-01` | ~6 months |
| ArXiv | `{YYYY-MM}` | `2025-01` | ~6 months |
| ORCID | `v{major}.{minor}` | `v3.0` | Per API version |
| atlas-citations | `{major}.{minor}.{patch}` | `1.0.0` | Semver |
