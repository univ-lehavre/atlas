# Cycle de vie des specs OpenAPI

## Stratégies de versioning par source

Chaque source a sa propre stratégie de versioning adaptée à son API :

| Source | Stratégie | Exemple |
|--------|-----------|---------|
| **REDCap** | Version logiciel | `redcap-14.5.10.yaml`, `redcap-15.5.32.yaml` |
| **Crossref** | Version API + date | `crossref-v1-2025-01.yaml` |
| **OpenAlex** | Date snapshot | `openalex-2025-01-24.yaml` |
| **HAL** | Date snapshot | `hal-2025-01.yaml` |
| **ArXiv** | Date snapshot | `arxiv-2025-01.yaml` |
| **ORCID** | Version API | `orcid-v3.0.yaml` |

## Cycle de maturation : alpha → beta → stable

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CYCLE DE VIE D'UNE SPEC                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  SOURCE  │───>│  ALPHA   │───>│   BETA   │───>│  STABLE  │          │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘          │
│       │               │               │               │                 │
│       │               │               │               │                 │
│  - Swagger UI         │               │               │                 │
│  - Documentation      │          Validation      Validation            │
│  - Reverse-eng.       │          + Corrections   finale                │
│  - Inférence          │               │               │                 │
│                       ▼               ▼               ▼                 │
│                  specs/alpha/    specs/beta/    specs/stable/           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Structure des specs versionnées

```
packages/{source}/
├── specs/
│   ├── alpha/                      # Specs brutes, non validées
│   │   └── {source}-{version}.yaml
│   ├── beta/                       # Specs validées, en cours de stabilisation
│   │   └── {source}-{version}.yaml
│   ├── stable/                     # Specs validées et stables
│   │   └── {source}-{version}.yaml
│   └── current.yaml                # Symlink vers la spec stable courante
```

## Métadonnées d'une spec

```typescript
type SpecStage = 'alpha' | 'beta' | 'stable';

interface SpecMetadata {
  source: string;                    // 'openalex', 'redcap', etc.
  version: string;                   // '2025-01-24', '14.5.10', 'v3.0'
  stage: SpecStage;
  createdAt: Date;
  lastValidatedAt?: Date;
  validationReport?: string;         // Chemin vers le rapport
  origin: SpecOrigin;
}

type SpecOrigin =
  | { type: 'official_swagger'; url: string }           // Crossref
  | { type: 'documentation'; urls: string[] }           // OpenAlex, HAL
  | { type: 'reverse_engineered'; tool?: string }       // Inférence
  | { type: 'software_version'; version: string }       // REDCap
  | { type: 'community'; repository: string };          // Specs communautaires
```

## Workflow de validation itératif

### 1. Création alpha

```bash
# Option A: Récupérer depuis Swagger officiel
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --set-stage alpha

# Option B: Générer depuis documentation (semi-automatique)
atlas-openapi-validator generate \
  --from-docs https://docs.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml \
  --set-stage alpha

# Option C: Créer manuellement
# → specs/alpha/{source}-{version}.yaml
```

### 2. Validation alpha → beta

```bash
# Valider contre API réelle
atlas-openapi-validator validate specs/alpha/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-alpha.json \
  --sample-size 10

# Appliquer corrections automatiques (haute confiance)
atlas-openapi-validator fix specs/alpha/openalex-2025-01-24.yaml \
  --report reports/openalex-2025-01-24-alpha.json \
  --confidence 0.9 \
  --output specs/beta/openalex-2025-01-24.yaml \
  --set-stage beta
```

### 3. Itération beta (jusqu'à convergence)

```bash
# Re-valider
atlas-openapi-validator validate specs/beta/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-beta-1.json

# Si erreurs > 0 : corriger et re-tester
atlas-openapi-validator fix specs/beta/openalex-2025-01-24.yaml \
  --report reports/openalex-2025-01-24-beta-1.json \
  --confidence 0.8

# Répéter jusqu'à convergence (erreurs = 0)
```

### 4. Promotion stable

```bash
# Validation finale exhaustive
atlas-openapi-validator validate specs/beta/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-2025-01-24-final.json \
  --sample-size 50 \
  --all-endpoints

# Si OK, promouvoir
atlas-openapi-validator promote specs/beta/openalex-2025-01-24.yaml \
  --to stable \
  --set-current  # Met à jour le symlink current.yaml
```

## Critères de promotion

```typescript
interface PromotionCriteria {
  alpha_to_beta: {
    maxErrors: 0;              // Aucune erreur bloquante
    maxWarnings: 10;           // Warnings tolérés
    minCoverage: 0.5;          // 50% des endpoints testés
  };
  beta_to_stable: {
    maxErrors: 0;
    maxWarnings: 5;
    minCoverage: 0.9;          // 90% des endpoints testés
    minSampleSize: 20;         // Au moins 20 requêtes par endpoint
    consecutiveSuccess: 3;     // 3 validations successives OK
  };
}
```

## Intégration CI

Les validations sont exécutées de manière planifiée (pas sur chaque PR) pour éviter d'épuiser les quotas :

```yaml
# .github/workflows/validate-specs.yml
name: Validate OpenAPI Specs

on:
  schedule:
    - cron: '0 6 * * 1'  # Tous les lundis à 6h

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
