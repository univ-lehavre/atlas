# OpenAPI Validator

`@univ-lehavre/atlas-openapi-validator` is a CLI tool and library for validating that an OpenAPI spec matches the real API.

## Purpose

Produce a **formal and structured report** of variations between a spec and the real API, consumable programmatically by source packages to fix their specs.

## Installation

```bash
pnpm add -D @univ-lehavre/atlas-openapi-validator
```

## Structure

```
packages/openapi-validator/
├── src/
│   ├── types/
│   │   ├── report.ts              # Validation report types
│   │   ├── deviation.ts           # Detected deviation types
│   │   └── index.ts
│   ├── validator/
│   │   ├── endpoint-validator.ts  # Endpoint validation
│   │   ├── parameter-validator.ts # Parameter validation
│   │   ├── schema-validator.ts    # Response schema validation
│   │   ├── type-validator.ts      # Field type validation
│   │   └── index.ts
│   ├── reporter/
│   │   ├── json-reporter.ts       # Structured JSON export
│   │   ├── console-reporter.ts    # Console output
│   │   └── index.ts
│   ├── cli/
│   │   └── index.ts
│   └── index.ts
```

## Deviation Types

Deviations are classified by level:

### Levels

```typescript
type DeviationLevel = 'endpoint' | 'parameter' | 'field' | 'type';
```

### Severities

```typescript
type DeviationSeverity = 'error' | 'warning' | 'info';
```

### Deviation Types

```typescript
type DeviationType =
  | 'missing_in_spec'      // Present in API, absent from spec
  | 'missing_in_api'       // Present in spec, absent from API
  | 'type_mismatch'        // Different type
  | 'format_mismatch'      // Different format (date, uri, etc.)
  | 'nullable_mismatch'    // Different nullability
  | 'enum_mismatch'        // Different enum values
  | 'required_mismatch'    // Different required/optional status
  | 'deprecated_missing'   // Deprecated field not marked
  | 'array_item_mismatch'; // Different array item type
```

## Report Structure

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
  yamlPath: string;          // Path in the YAML file
  currentValue?: unknown;
  suggestedValue?: unknown;
  confidence: number;        // 0-1
}
```

## CLI

### Validate a spec

```bash
# Complete validation with JSON report
atlas-openapi-validator validate specs/openalex.yaml \
  --base-url https://api.openalex.org \
  --output report.json \
  --format json

# Filter by deviation level
atlas-openapi-validator validate specs/openalex.yaml \
  --base-url https://api.openalex.org \
  --level field,type \
  --severity error,warning
```

### Apply fixes

```bash
# Apply suggestions automatically
atlas-openapi-validator fix specs/openalex.yaml \
  --report report.json \
  --confidence 0.9 \
  --dry-run

# Without dry-run to actually apply
atlas-openapi-validator fix specs/openalex.yaml \
  --report report.json \
  --confidence 0.9
```

### Compare specs

```bash
# Detect regressions between versions
atlas-openapi-validator diff specs/v1.yaml specs/v2.yaml \
  --output diff-report.json
```

### Fetch an existing spec

```bash
# From official Swagger
atlas-openapi-validator fetch https://api.crossref.org/swagger.json \
  --output specs/alpha/crossref-v1-2025-01.yaml \
  --set-stage alpha
```

### Promote a spec

```bash
# From beta to stable
atlas-openapi-validator promote specs/beta/openalex-2025-01-24.yaml \
  --to stable \
  --set-current
```

## Programmatic API

### Validate and get the report

```typescript
import { validate, applySuggestions } from '@univ-lehavre/atlas-openapi-validator';
import { Effect } from 'effect';

const program = Effect.gen(function* () {
  // Validate
  const report = yield* validate({
    specPath: 'specs/openalex.yaml',
    baseUrl: 'https://api.openalex.org',
    sampleSize: 10,
    respectRateLimits: true,
  });

  // Filter deviations
  const errors = report.deviations.filter(d => d.severity === 'error');
  const fieldDeviations = report.deviations.filter(d => d.level === 'field');

  // Apply high confidence suggestions
  if (report.suggestions.length > 0) {
    yield* applySuggestions(
      'specs/openalex.yaml',
      report.suggestions.filter(s => s.confidence > 0.9)
    );
  }

  return report;
});
```

### Integration in a source package

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
    console.error(`${errors.length} errors detected:`);
    errors.forEach(e =>
      console.error(`  - [${e.level}] ${e.path}: ${e.message}`)
    );
    process.exit(1);
  }

  const warnings = report.deviations.filter(d => d.severity === 'warning');
  if (warnings.length > 0) {
    console.warn(`${warnings.length} warnings:`);
    warnings.forEach(w =>
      console.warn(`  - [${w.level}] ${w.path}: ${w.message}`)
    );
  }

  console.log('✓ Spec validated');
});

Effect.runPromise(program);
```

## Deviation Examples

### Endpoint missing in spec

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

### Incorrect field type

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

### Field nullable not marked

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
