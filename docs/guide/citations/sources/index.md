# Modules sources

Chaque module source (`atlas-openalex`, `atlas-crossref`, etc.) suit le même processus de construction mais avec des stratégies adaptées à chaque API.

## Vue d'ensemble du processus

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROCESSUS DE CONSTRUCTION D'UN MODULE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ANALYSE          2. SPEC ALPHA       3. VALIDATION      4. CLIENT      │
│  ──────────          ────────────        ────────────       ────────       │
│                                                                             │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐    │
│  │ Swagger  │──┐    │          │       │          │       │          │    │
│  │ officiel │  │    │  alpha/  │       │  beta/   │       │ Client   │    │
│  └──────────┘  │    │  source- │       │  source- │       │ Effect   │    │
│                ├───>│  version │──────>│  version │──────>│          │    │
│  ┌──────────┐  │    │  .yaml   │       │  .yaml   │       │ + Types  │    │
│  │ Docs API │──┤    │          │       │          │       │ générés  │    │
│  └──────────┘  │    └──────────┘       └──────────┘       └──────────┘    │
│                │          │                  │                  │          │
│  ┌──────────┐  │          │                  │                  │          │
│  │ Reverse  │──┘          ▼                  ▼                  ▼          │
│  │ engineer │        Validation         Validation         stable/        │
│  └──────────┘        initiale           itérative          + current      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Méthodes de construction de la spec alpha

### Méthode 1 : Récupération depuis Swagger officiel

**Applicable à :** Crossref

```bash
# Télécharger et convertir
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --format yaml \
  --set-stage alpha
```

**Avantages :**
- Spec officiellement maintenue
- Généralement complète et à jour

**Inconvénients :**
- Peut contenir des erreurs ou omissions
- Format parfois non standard

### Méthode 2 : Construction depuis la documentation

**Applicable à :** OpenAlex, HAL, ORCID

Processus manuel ou semi-automatique basé sur la documentation officielle.

```bash
# Étape 1 : Créer le squelette
atlas-openapi-validator scaffold \
  --name openalex \
  --base-url https://api.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml

# Étape 2 : Enrichir avec les endpoints découverts
atlas-openapi-validator discover https://api.openalex.org \
  --probe-endpoints /works,/authors,/sources,/institutions \
  --append-to specs/alpha/openalex-2025-01-24.yaml
```

**Structure manuelle recommandée :**

```yaml
# specs/alpha/openalex-2025-01-24.yaml
openapi: '3.1.0'
info:
  title: OpenAlex API
  version: '2025-01-24'
  description: |
    Spec construite depuis la documentation officielle.
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
      # ... construit depuis la doc
```

### Méthode 3 : Reverse engineering

**Applicable à :** ArXiv (API Atom/XML), APIs sans documentation

Inférence du schéma depuis les réponses réelles.

```bash
# Capturer des réponses et inférer le schéma
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --endpoints /query \
  --sample-size 50 \
  --output specs/alpha/arxiv-2025-01.yaml

# Pour APIs XML, convertir en JSON schema
atlas-openapi-validator infer \
  --base-url http://export.arxiv.org/api \
  --response-format xml \
  --transform-to json \
  --output specs/alpha/arxiv-2025-01.yaml
```

**Processus d'inférence :**

```typescript
// Pseudo-code du processus d'inférence
const inferSchema = async (baseUrl: string, endpoint: string) => {
  const samples: unknown[] = [];

  // Collecter des échantillons
  for (let i = 0; i < sampleSize; i++) {
    const response = await fetch(`${baseUrl}${endpoint}`);
    samples.push(await response.json());
  }

  // Analyser les types
  const schema = analyzeTypes(samples);

  // Détecter les champs optionnels (absents dans certaines réponses)
  const optionalFields = detectOptionalFields(samples);

  // Détecter les enums (valeurs répétitives)
  const enums = detectEnums(samples);

  return buildOpenAPISchema(schema, optionalFields, enums);
};
```

### Méthode 4 : Hybride (recommandée)

Combiner plusieurs sources pour une spec plus robuste.

```bash
# 1. Partir de la documentation
atlas-openapi-validator scaffold \
  --from-docs https://docs.openalex.org \
  --output specs/alpha/openalex-2025-01-24.yaml

# 2. Enrichir par inférence
atlas-openapi-validator infer \
  --base-url https://api.openalex.org \
  --merge-into specs/alpha/openalex-2025-01-24.yaml \
  --only-missing  # N'ajoute que ce qui manque

# 3. Valider et corriger
atlas-openapi-validator validate specs/alpha/openalex-2025-01-24.yaml \
  --base-url https://api.openalex.org \
  --auto-fix \
  --confidence 0.95
```

## Modules sources détaillés

- [OpenAlex](./openalex.md) - Construction depuis documentation
- [Crossref](./crossref.md) - Récupération Swagger + adaptation
- [HAL](./hal.md) - API Solr, construction manuelle
- [ArXiv](./arxiv.md) - API XML, reverse engineering
- [ORCID](./orcid.md) - Construction depuis documentation

## Versioning cohérent

Voir [Stratégie de versioning](./versioning.md) pour la cohérence entre modules.
