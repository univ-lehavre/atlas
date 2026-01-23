/**
 * OpenAPI Spec Comparator
 *
 * Compares the extracted REDCap OpenAPI spec with the CRF package spec
 * to identify discrepancies and missing endpoints.
 *
 * Usage: pnpm compare
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const EXTRACTED_SPEC = join(import.meta.dirname, '../specs/redcap-extracted.yaml');
const CRF_SPEC = join(import.meta.dirname, '../../crf/specs/redcap.yaml');

interface ComparisonResult {
  status: 'match' | 'mismatch' | 'missing_extracted' | 'missing_crf';
  field: string;
  extracted?: unknown;
  crf?: unknown;
  message: string;
}

function loadSpec(path: string, name: string): Record<string, unknown> {
  if (!existsSync(path)) {
    console.error(`${name} spec not found: ${path}`);
    process.exit(1);
  }
  const content = readFileSync(path, 'utf-8');
  return parse(content) as Record<string, unknown>;
}

function getSchemaNames(spec: Record<string, unknown>): Set<string> {
  const schemas = (spec.components as Record<string, unknown>)?.schemas as
    | Record<string, unknown>
    | undefined;
  return new Set(schemas ? Object.keys(schemas) : []);
}

function compareSchemas(
  extractedSpec: Record<string, unknown>,
  crfSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const extractedSchemas = getSchemaNames(extractedSpec);
  const crfSchemas = getSchemaNames(crfSpec);

  // Find schemas in extracted but not in CRF
  for (const schema of extractedSchemas) {
    if (!crfSchemas.has(schema)) {
      // Try to find a similar schema (removing Request suffix, etc.)
      const baseName = schema.replace(/Request$/, '');
      const similar = [...crfSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'missing_crf',
        field: `components.schemas.${schema}`,
        extracted: schema,
        message: similar
          ? `Schema "${schema}" found in extracted but not in CRF (similar: "${similar}")`
          : `Schema "${schema}" found in extracted but not in CRF`,
      });
    }
  }

  // Find schemas in CRF but not in extracted
  for (const schema of crfSchemas) {
    if (!extractedSchemas.has(schema)) {
      const baseName = schema.replace(/Request$/, '');
      const similar = [...extractedSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'missing_extracted',
        field: `components.schemas.${schema}`,
        crf: schema,
        message: similar
          ? `Schema "${schema}" found in CRF but not in extracted (similar: "${similar}")`
          : `Schema "${schema}" found in CRF but not in extracted - may need to be added to REDCap source analysis`,
      });
    }
  }

  return results;
}

function comparePatterns(
  extractedSpec: Record<string, unknown>,
  crfSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const extractedSchemas = ((extractedSpec.components as Record<string, unknown>)?.schemas ??
    {}) as Record<string, Record<string, unknown>>;
  const crfSchemas = ((crfSpec.components as Record<string, unknown>)?.schemas ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

  // Compare patterns in matching schemas
  for (const [name, extractedSchema] of Object.entries(extractedSchemas)) {
    const crfSchema = crfSchemas[name];
    if (!crfSchema) continue;

    const extractedProps = (extractedSchema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const crfProps = (crfSchema.properties ?? {}) as Record<string, Record<string, unknown>>;

    for (const [propName, extractedProp] of Object.entries(extractedProps)) {
      const crfProp = crfProps[propName];
      if (!crfProp) continue;

      // Compare patterns
      if (extractedProp.pattern !== crfProp.pattern) {
        results.push({
          status: 'mismatch',
          field: `${name}.${propName}.pattern`,
          extracted: extractedProp.pattern,
          crf: crfProp.pattern,
          message: `Pattern mismatch for ${name}.${propName}`,
        });
      }

      // Compare enums
      if (JSON.stringify(extractedProp.enum) !== JSON.stringify(crfProp.enum)) {
        results.push({
          status: 'mismatch',
          field: `${name}.${propName}.enum`,
          extracted: extractedProp.enum,
          crf: crfProp.enum,
          message: `Enum mismatch for ${name}.${propName}`,
        });
      }
    }
  }

  return results;
}

// Main execution
console.log('OpenAPI Spec Comparator');
console.log('=======================\n');

console.log(`Extracted spec: ${EXTRACTED_SPEC}`);
console.log(`CRF spec: ${CRF_SPEC}\n`);

const extractedSpec = loadSpec(EXTRACTED_SPEC, 'Extracted');
const crfSpec = loadSpec(CRF_SPEC, 'CRF');

const schemaResults = compareSchemas(extractedSpec, crfSpec);
const patternResults = comparePatterns(extractedSpec, crfSpec);

const allResults = [...schemaResults, ...patternResults];

if (allResults.length === 0) {
  console.log('No discrepancies found between specs.');
} else {
  console.log(`Found ${allResults.length} discrepancies:\n`);

  // Group by status
  const byStatus = {
    missing_crf: allResults.filter((r) => r.status === 'missing_crf'),
    missing_extracted: allResults.filter((r) => r.status === 'missing_extracted'),
    mismatch: allResults.filter((r) => r.status === 'mismatch'),
  };

  if (byStatus.missing_crf.length > 0) {
    console.log('## Missing in CRF spec (found in extracted):');
    for (const r of byStatus.missing_crf) {
      console.log(`  - ${r.message}`);
    }
    console.log();
  }

  if (byStatus.missing_extracted.length > 0) {
    console.log('## Missing in extracted (found in CRF):');
    for (const r of byStatus.missing_extracted) {
      console.log(`  - ${r.message}`);
    }
    console.log();
  }

  if (byStatus.mismatch.length > 0) {
    console.log('## Mismatches:');
    for (const r of byStatus.mismatch) {
      console.log(`  - ${r.message}`);
      console.log(`    Extracted: ${JSON.stringify(r.extracted)}`);
      console.log(`    CRF: ${JSON.stringify(r.crf)}`);
    }
    console.log();
  }
}

// Exit with error if there are mismatches (for CI)
const hasMismatches = allResults.some((r) => r.status === 'mismatch');
if (hasMismatches) {
  process.exit(1);
}
