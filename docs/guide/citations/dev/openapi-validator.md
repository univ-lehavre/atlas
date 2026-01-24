# Validateur OpenAPI

`@univ-lehavre/atlas-openapi-validator` est un outil CLI et une bibliothèque pour valider qu'une spec OpenAPI correspond à l'API réelle.

## Objectif

Produire un **rapport formel et structuré** des variations entre une spec et l'API réelle, consommable programmatiquement par les packages sources pour corriger leurs specs.

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-openapi-validator
```

## Structure

```
packages/openapi-validator/
├── src/
│   ├── types/
│   │   ├── report.ts              # Types du rapport de validation
│   │   ├── deviation.ts           # Types des déviations détectées
│   │   └── index.ts
│   ├── validator/
│   │   ├── endpoint-validator.ts  # Validation endpoints
│   │   ├── parameter-validator.ts # Validation paramètres
│   │   ├── schema-validator.ts    # Validation schémas réponse
│   │   ├── type-validator.ts      # Validation types de champs
│   │   └── index.ts
│   ├── reporter/
│   │   ├── json-reporter.ts       # Export JSON structuré
│   │   ├── console-reporter.ts    # Affichage console
│   │   └── index.ts
│   ├── cli/
│   │   └── index.ts
│   └── index.ts
```

## Types de déviations

Les déviations sont classées par niveau :

### Niveaux

```typescript
type DeviationLevel = 'endpoint' | 'parameter' | 'field' | 'type';
```

### Sévérités

```typescript
type DeviationSeverity = 'error' | 'warning' | 'info';
```

### Types de déviation

```typescript
type DeviationType =
  | 'missing_in_spec'      // Présent dans API, absent de spec
  | 'missing_in_api'       // Présent dans spec, absent d'API
  | 'type_mismatch'        // Type différent
  | 'format_mismatch'      // Format différent (date, uri, etc.)
  | 'nullable_mismatch'    // Nullabilité différente
  | 'enum_mismatch'        // Valeurs enum différentes
  | 'required_mismatch'    // Champ requis/optionnel différent
  | 'deprecated_missing'   // Champ déprécié non marqué
  | 'array_item_mismatch'; // Type d'éléments array différent
```

## Structure du rapport

```typescript
interface ValidationReport {
  meta: {
    specPath: string;
    specVersion: string;
    baseUrl: string;
    validatedAt: Date;
    duration: number;        // ms
    requestCount: number;
  };

  summary: {
    total: number;
    byLevel: Record<DeviationLevel, number>;
    bySeverity: Record<DeviationSeverity, number>;
    byType: Record<DeviationType, number>;
  };

  endpoints: EndpointReport[];
  deviations: Deviation[];
  suggestions: SpecSuggestion[];
}

interface SpecSuggestion {
  deviation: Deviation;
  action: 'add' | 'remove' | 'modify';
  target: 'endpoint' | 'parameter' | 'schema' | 'property';
  yamlPath: string;          // Chemin dans le fichier YAML
  currentValue?: unknown;
  suggestedValue?: unknown;
  confidence: number;        // 0-1
}
```

## CLI

### Valider une spec

```bash
# Validation complète avec rapport JSON
atlas-openapi-validator validate specs/openalex.yaml \
  --base-url https://api.openalex.org \
  --output report.json \
  --format json

# Filtrer par niveau de déviation
atlas-openapi-validator validate specs/openalex.yaml \
  --base-url https://api.openalex.org \
  --level field,type \
  --severity error,warning
```

### Appliquer des corrections

```bash
# Appliquer les suggestions automatiquement
atlas-openapi-validator fix specs/openalex.yaml \
  --report report.json \
  --confidence 0.9 \
  --dry-run

# Sans dry-run pour appliquer réellement
atlas-openapi-validator fix specs/openalex.yaml \
  --report report.json \
  --confidence 0.9
```

### Comparer des specs

```bash
# Détecter les régressions entre versions
atlas-openapi-validator diff specs/v1.yaml specs/v2.yaml \
  --output diff-report.json
```

### Récupérer une spec existante

```bash
# Depuis Swagger officiel
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --set-stage alpha
```

### Promouvoir une spec

```bash
# De beta vers stable
atlas-openapi-validator promote specs/beta/openalex-2025-01-24.yaml \
  --to stable \
  --set-current
```

## API programmatique

### Valider et obtenir le rapport

```typescript
import { validate, applySuggestions } from '@univ-lehavre/atlas-openapi-validator';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  // Valider
  const report = yield* validate({
    specPath: 'specs/openalex.yaml',
    baseUrl: 'https://api.openalex.org',
    sampleSize: 10,
    respectRateLimits: true,
  });

  // Filtrer les déviations
  const errors = report.deviations.filter(d => d.severity === 'error');
  const fieldDeviations = report.deviations.filter(d => d.level === 'field');

  // Appliquer les suggestions haute confiance
  if (report.suggestions.length > 0) {
    yield* applySuggestions(
      'specs/openalex.yaml',
      report.suggestions.filter(s => s.confidence > 0.9)
    );
  }

  return report;
});
```

### Intégration dans un package source

```typescript
// packages/openalex/scripts/validate-spec.ts
import { validate } from '@univ-lehavre/atlas-openapi-validator';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  const report = yield* validate({
    specPath: 'specs/current.yaml',
    baseUrl: 'https://api.openalex.org',
    sampleSize: 5,
    respectRateLimits: true,
  });

  const errors = report.deviations.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    console.error(`${errors.length} erreurs détectées:`);
    errors.forEach(e =>
      console.error(`  - [${e.level}] ${e.path}: ${e.message}`)
    );
    process.exit(1);
  }

  const warnings = report.deviations.filter(d => d.severity === 'warning');
  if (warnings.length > 0) {
    console.warn(`${warnings.length} avertissements:`);
    warnings.forEach(w =>
      console.warn(`  - [${w.level}] ${w.path}: ${w.message}`)
    );
  }

  console.log('✓ Spec validée');
});

Effect.runPromise(program);
```

## Exemples de déviations

### Endpoint manquant dans la spec

```json
{
  "level": "endpoint",
  "severity": "warning",
  "type": "missing_in_spec",
  "path": "/works/random",
  "method": "GET",
  "message": "Endpoint exists in API but not documented in spec"
}
```

### Type de champ incorrect

```json
{
  "level": "type",
  "severity": "error",
  "type": "type_mismatch",
  "endpoint": "/works",
  "method": "GET",
  "schemaPath": "#/components/schemas/Work",
  "fieldName": "cited_by_count",
  "expectedType": "string",
  "actualType": "integer",
  "message": "Field 'cited_by_count' is integer in API but string in spec"
}
```

### Champ nullable non marqué

```json
{
  "level": "field",
  "severity": "warning",
  "type": "nullable_mismatch",
  "endpoint": "/works/{id}",
  "method": "GET",
  "schemaPath": "#/components/schemas/Work",
  "fieldName": "abstract",
  "message": "Field 'abstract' can be null in API but not marked nullable in spec"
}
```
