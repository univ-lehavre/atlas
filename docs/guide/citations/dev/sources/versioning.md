# Stratégie de versioning

Ce document décrit la stratégie de versioning cohérente entre toutes les sources bibliographiques et le package agrégateur atlas-citations.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STRATÉGIE DE VERSIONING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SOURCE             STRATÉGIE           EXEMPLE                             │
│  ──────────────────────────────────────────────────────────────────────     │
│  REDCap             Version logiciel    redcap-14.5.10.yaml                 │
│  Crossref           Version API + date  crossref-v1-2025-01.yaml            │
│  OpenAlex           Date snapshot       openalex-2025-01-24.yaml            │
│  HAL                Date snapshot       hal-2025-01.yaml                    │
│  ArXiv              Date snapshot       arxiv-2025-01.yaml                  │
│  ORCID              Version API         orcid-v3.0.yaml                     │
│                                                                              │
│  atlas-citations    Version sémantique  1.0.0 (package)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Pourquoi différentes stratégies ?

Chaque source a des caractéristiques différentes qui dictent la meilleure stratégie de versioning :

| Source | Caractéristique | Stratégie adaptée |
|--------|-----------------|-------------------|
| **REDCap** | Logiciel avec versions explicites | Version logiciel |
| **Crossref** | API versionnée (v1) mais évolutions | Version API + date |
| **OpenAlex** | API non versionnée, évolutions fréquentes | Date snapshot |
| **HAL** | API Solr stable | Date snapshot |
| **ArXiv** | API legacy stable | Date snapshot |
| **ORCID** | API versionnée (v3.0) | Version API |

## Stratégie par type

### 1. Version logiciel (REDCap)

Pour les APIs associées à un logiciel versionné où la spec dépend de la version installée.

```
specs/
├── alpha/
│   └── redcap-15.5.32.yaml    # Nouvelle version en test
├── beta/
│   └── redcap-15.5.32.yaml    # En validation
├── stable/
│   ├── redcap-14.5.10.yaml    # Version précédente
│   └── redcap-15.5.32.yaml    # Version courante
└── current.yaml → stable/redcap-15.5.32.yaml
```

**Convention de nommage :** `{source}-{major}.{minor}.{patch}.yaml`

**Quand créer une nouvelle version :**
- Nouvelle release majeure/mineure de REDCap
- Changements d'API documentés dans les release notes

### 2. Version API + Date (Crossref)

Pour les APIs avec versioning explicite mais qui évoluent au sein d'une même version.

```
specs/
├── alpha/
│   └── crossref-v1-2025-01.yaml
├── beta/
│   └── crossref-v1-2025-01.yaml
├── stable/
│   ├── crossref-v1-2024-06.yaml    # Snapshot précédent
│   └── crossref-v1-2025-01.yaml    # Snapshot courant
└── current.yaml → stable/crossref-v1-2025-01.yaml
```

**Convention de nommage :** `{source}-v{api_version}-{YYYY-MM}.yaml`

**Quand créer une nouvelle version :**
- Tous les 6 mois (maintenance)
- Lorsque des déviations significatives sont détectées
- Nouvelle version majeure d'API annoncée

### 3. Date snapshot (OpenAlex, HAL, ArXiv)

Pour les APIs sans versioning explicite où l'on capture l'état à un instant T.

```
specs/
├── alpha/
│   └── openalex-2025-01-24.yaml
├── beta/
│   └── openalex-2025-01-24.yaml
├── stable/
│   ├── openalex-2024-07-15.yaml    # Ancien snapshot
│   └── openalex-2025-01-24.yaml    # Snapshot courant
└── current.yaml → stable/openalex-2025-01-24.yaml
```

**Convention de nommage :** `{source}-{YYYY-MM-DD}.yaml`

**Quand créer une nouvelle version :**
- Tous les 3-6 mois (maintenance proactive)
- Lorsque des déviations sont détectées par la validation
- Annonce de changements par le fournisseur

### 4. Version API (ORCID)

Pour les APIs avec versioning sémantique strict où les specs sont stables entre versions.

```
specs/
├── alpha/
│   └── orcid-v3.0.yaml
├── stable/
│   ├── orcid-v2.1.yaml    # Ancienne version (dépréciée)
│   └── orcid-v3.0.yaml    # Version courante
└── current.yaml → stable/orcid-v3.0.yaml
```

**Convention de nommage :** `{source}-v{major}.{minor}.yaml`

**Quand créer une nouvelle version :**
- Uniquement lors d'une nouvelle version d'API annoncée
- Maintenir les anciennes versions tant qu'elles sont supportées

## Métadonnées de version

Chaque spec contient des métadonnées standardisées :

```yaml
info:
  title: OpenAlex API
  version: '2025-01-24'           # Version de la spec
  x-atlas-metadata:
    stage: stable                  # alpha | beta | stable
    specVersion: '2025-01-24'      # Identifiant unique de cette spec
    apiVersion: null               # null si non versionnée, sinon "v3.0"
    origin:
      type: documentation          # official_swagger | documentation | reverse_engineered
      urls:
        - https://docs.openalex.org
      fetchedAt: '2025-01-24T10:00:00Z'
    createdAt: '2025-01-24T10:00:00Z'
    lastValidatedAt: '2025-01-24T15:30:00Z'
    validationReport: 'reports/openalex-2025-01-24-stable.json'
    previousVersion: '2024-07-15'  # Lien vers version précédente
    deprecatedAt: null             # null si actif, date si déprécié
    notes: []
```

## Gestion dans atlas-citations

Le package agrégateur atlas-citations utilise le versioning sémantique standard :

```json
{
  "name": "@univ-lehavre/atlas-citations",
  "version": "1.0.0"
}
```

### Matrice de compatibilité

atlas-citations maintient une matrice de compatibilité avec les specs sources :

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

### Règles de versioning atlas-citations

| Changement | Impact sur version |
|------------|-------------------|
| Nouvelle source ajoutée | Minor (1.x.0) |
| Nouvelle spec source (compatible) | Patch (1.0.x) |
| Breaking change dans le schéma unifié | Major (x.0.0) |
| Nouvelle méthode client | Minor (1.x.0) |
| Correction adaptateur | Patch (1.0.x) |

## Workflow de mise à jour

### 1. Détection d'une mise à jour nécessaire

```bash
# Validation périodique (CI scheduled)
atlas-openapi-validator validate specs/stable/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-check-2025-01-30.json

# Si déviations détectées → créer nouvelle spec alpha
```

### 2. Création de la nouvelle spec

```bash
# Copier la spec stable actuelle
cp specs/stable/openalex-2025-01-24.yaml specs/alpha/openalex-2025-01-30.yaml

# Mettre à jour les métadonnées
# info.version: '2025-01-30'
# x-atlas-metadata.stage: alpha
# x-atlas-metadata.previousVersion: '2025-01-24'

# Appliquer les corrections
atlas-openapi-validator fix specs/alpha/openalex-2025-01-30.yaml \
  --report reports/openalex-check-2025-01-30.json \
  --confidence 0.9
```

### 3. Validation et promotion

```bash
# Valider alpha → beta
atlas-openapi-validator validate specs/alpha/openalex-2025-01-30.yaml \
  --base-url https://api.openalex.org \
  --output reports/openalex-alpha-2025-01-30.json

# Si OK, promouvoir vers beta
atlas-openapi-validator promote specs/alpha/openalex-2025-01-30.yaml \
  --to beta

# Itérer jusqu'à convergence...

# Promouvoir vers stable
atlas-openapi-validator promote specs/beta/openalex-2025-01-30.yaml \
  --to stable \
  --set-current
```

### 4. Mise à jour atlas-citations

```bash
# Mettre à jour la matrice de compatibilité
# packages/citations/compatibility.yaml

# Bump version
pnpm changeset  # "Updated OpenAlex spec to 2025-01-30"

# Tests
pnpm -F @univ-lehavre/atlas-citations test
pnpm -F @univ-lehavre/atlas-citations test:integration
```

## Dépréciation

### Marquer une spec comme dépréciée

```yaml
info:
  x-atlas-metadata:
    deprecatedAt: '2025-02-01'
    deprecationReason: 'Remplacée par 2025-01-30 avec corrections majeures'
    removalDate: '2025-08-01'  # 6 mois de préavis
```

### Politique de rétention

| Stage | Rétention |
|-------|-----------|
| alpha | Supprimée après promotion ou abandon (max 1 mois) |
| beta | Supprimée après promotion vers stable |
| stable | Conservée 6 mois après dépréciation |
| dépréciée | Conservée 6 mois, puis archivée |

## Automatisation

### CI/CD : Validation périodique

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

### Renovate : Mise à jour des specs

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

## Résumé des conventions

| Source | Format version | Exemple | Fréquence màj |
|--------|---------------|---------|---------------|
| REDCap | `{major}.{minor}.{patch}` | `15.5.32` | Par release |
| Crossref | `v{api}-{YYYY-MM}` | `v1-2025-01` | ~6 mois |
| OpenAlex | `{YYYY-MM-DD}` | `2025-01-24` | ~3 mois |
| HAL | `{YYYY-MM}` | `2025-01` | ~6 mois |
| ArXiv | `{YYYY-MM}` | `2025-01` | ~6 mois |
| ORCID | `v{major}.{minor}` | `v3.0` | Par version API |
| atlas-citations | `{major}.{minor}.{patch}` | `1.0.0` | Semver |
