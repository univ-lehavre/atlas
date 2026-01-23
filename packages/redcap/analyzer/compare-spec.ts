/**
 * OpenAPI Spec Comparator
 *
 * Compares two REDCap OpenAPI specs (different versions) to identify
 * discrepancies, breaking changes, and missing endpoints.
 *
 * Usage:
 *   pnpm compare                           # Compare default versions (14.5.10 vs 15.5.32)
 *   REDCAP_VERSION_OLD=14.5.10 REDCAP_VERSION_NEW=16.0.8 pnpm compare
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const SPECS_DIR = join(import.meta.dirname, '../specs/versions');

// Get available versions
function getAvailableVersions(): string[] {
  if (!existsSync(SPECS_DIR)) return [];
  return readdirSync(SPECS_DIR)
    .filter((f) => f.startsWith('redcap-') && f.endsWith('.yaml'))
    .map((f) => f.replace('redcap-', '').replace('.yaml', ''))
    .sort();
}

const availableVersions = getAvailableVersions();
const REDCAP_VERSION_OLD = process.env.REDCAP_VERSION_OLD || availableVersions[0] || '14.5.10';
const REDCAP_VERSION_NEW =
  process.env.REDCAP_VERSION_NEW || availableVersions[availableVersions.length - 1] || '15.5.32';

const OLD_SPEC = join(SPECS_DIR, `redcap-${REDCAP_VERSION_OLD}.yaml`);
const NEW_SPEC = join(SPECS_DIR, `redcap-${REDCAP_VERSION_NEW}.yaml`);

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
  oldSpec: Record<string, unknown>,
  newSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const oldSchemas = getSchemaNames(oldSpec);
  const newSchemas = getSchemaNames(newSpec);

  // Find schemas in old but not in new (removed)
  for (const schema of oldSchemas) {
    if (!newSchemas.has(schema)) {
      // Try to find a similar schema (removing Request suffix, etc.)
      const baseName = schema.replace(/Request$/, '');
      const similar = [...newSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'missing_crf',
        field: `components.schemas.${schema}`,
        extracted: schema,
        message: similar
          ? `Schema "${schema}" removed in new version (similar: "${similar}")`
          : `Schema "${schema}" removed in new version`,
      });
    }
  }

  // Find schemas in new but not in old (added)
  for (const schema of newSchemas) {
    if (!oldSchemas.has(schema)) {
      const baseName = schema.replace(/Request$/, '');
      const similar = [...oldSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'missing_extracted',
        field: `components.schemas.${schema}`,
        crf: schema,
        message: similar
          ? `Schema "${schema}" added in new version (similar: "${similar}")`
          : `Schema "${schema}" added in new version`,
      });
    }
  }

  return results;
}

function comparePatterns(
  oldSpec: Record<string, unknown>,
  newSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const oldSchemas = ((oldSpec.components as Record<string, unknown>)?.schemas ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const newSchemas = ((newSpec.components as Record<string, unknown>)?.schemas ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

  // Compare patterns in matching schemas
  for (const [name, oldSchema] of Object.entries(oldSchemas)) {
    const newSchema = newSchemas[name];
    if (!newSchema) continue;

    const oldProps = (oldSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const newProps = (newSchema.properties ?? {}) as Record<string, Record<string, unknown>>;

    for (const [propName, oldProp] of Object.entries(oldProps)) {
      const newProp = newProps[propName];
      if (!newProp) continue;

      // Compare patterns
      if (oldProp.pattern !== newProp.pattern) {
        results.push({
          status: 'mismatch',
          field: `${name}.${propName}.pattern`,
          extracted: oldProp.pattern,
          crf: newProp.pattern,
          message: `Pattern changed for ${name}.${propName}`,
        });
      }

      // Compare enums
      if (JSON.stringify(oldProp.enum) !== JSON.stringify(newProp.enum)) {
        results.push({
          status: 'mismatch',
          field: `${name}.${propName}.enum`,
          extracted: oldProp.enum,
          crf: newProp.enum,
          message: `Enum changed for ${name}.${propName}`,
        });
      }
    }
  }

  return results;
}

// Main execution
console.log('OpenAPI Spec Comparator');
console.log('=======================\n');

console.log(`Available versions: ${availableVersions.join(', ')}`);
console.log(`Old spec (v${REDCAP_VERSION_OLD}): ${OLD_SPEC}`);
console.log(`New spec (v${REDCAP_VERSION_NEW}): ${NEW_SPEC}\n`);

const oldSpec = loadSpec(OLD_SPEC, `v${REDCAP_VERSION_OLD}`);
const newSpec = loadSpec(NEW_SPEC, `v${REDCAP_VERSION_NEW}`);

const schemaResults = compareSchemas(oldSpec, newSpec);
const patternResults = comparePatterns(oldSpec, newSpec);

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
    console.log(`## Removed in v${REDCAP_VERSION_NEW} (was in v${REDCAP_VERSION_OLD}):`);
    for (const r of byStatus.missing_crf) {
      console.log(`  - ${r.message}`);
    }
    console.log();
  }

  if (byStatus.missing_extracted.length > 0) {
    console.log(`## Added in v${REDCAP_VERSION_NEW} (not in v${REDCAP_VERSION_OLD}):`);
    for (const r of byStatus.missing_extracted) {
      console.log(`  - ${r.message}`);
    }
    console.log();
  }

  if (byStatus.mismatch.length > 0) {
    console.log('## Changed between versions:');
    for (const r of byStatus.mismatch) {
      console.log(`  - ${r.message}`);
      console.log(`    v${REDCAP_VERSION_OLD}: ${JSON.stringify(r.extracted)}`);
      console.log(`    v${REDCAP_VERSION_NEW}: ${JSON.stringify(r.crf)}`);
    }
    console.log();
  }
}

// Exit with error if there are mismatches (for CI)
const hasMismatches = allResults.some((r) => r.status === 'mismatch');
if (hasMismatches) {
  process.exit(1);
}
