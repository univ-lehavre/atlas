/**
 * OpenAPI Spec Comparator
 *
 * Compares two REDCap OpenAPI specs to identify discrepancies,
 * breaking changes, and missing endpoints.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import type { ComparisonResult, ComparisonSummary } from '../core/types.js';

// Re-export types for consumers
export type { ComparisonResult, ComparisonSummary } from '../core/types.js';

/**
 * Get available spec versions from a directory
 */
export function getAvailableSpecs(specsDir: string): string[] {
  if (!existsSync(specsDir)) return [];
  return readdirSync(specsDir)
    .filter((f) => f.startsWith('redcap-') && f.endsWith('.yaml'))
    .map((f) => f.replace('redcap-', '').replace('.yaml', ''))
    .sort();
}

/**
 * Load an OpenAPI spec from a YAML file
 */
export function loadSpec(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    throw new Error(`Spec not found: ${path}`);
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

function getPathNames(spec: Record<string, unknown>): Set<string> {
  const paths = spec.paths as Record<string, unknown> | undefined;
  return new Set(paths ? Object.keys(paths) : []);
}

/**
 * Compare schemas between two specs
 */
export function compareSchemas(
  oldSpec: Record<string, unknown>,
  newSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const oldSchemas = getSchemaNames(oldSpec);
  const newSchemas = getSchemaNames(newSpec);

  // Find schemas removed in new version
  for (const schema of oldSchemas) {
    if (!newSchemas.has(schema)) {
      const baseName = schema.replace(/Request$/, '');
      const similar = [...newSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'removed',
        field: `components.schemas.${schema}`,
        oldValue: schema,
        message: similar
          ? `Schema "${schema}" removed (similar: "${similar}")`
          : `Schema "${schema}" removed`,
      });
    }
  }

  // Find schemas added in new version
  for (const schema of newSchemas) {
    if (!oldSchemas.has(schema)) {
      const baseName = schema.replace(/Request$/, '');
      const similar = [...oldSchemas].find(
        (s) =>
          s.toLowerCase().includes(baseName.toLowerCase()) ||
          baseName.toLowerCase().includes(s.toLowerCase().replace(/request$/, ''))
      );

      results.push({
        status: 'added',
        field: `components.schemas.${schema}`,
        newValue: schema,
        message: similar
          ? `Schema "${schema}" added (similar: "${similar}")`
          : `Schema "${schema}" added`,
      });
    }
  }

  return results;
}

/**
 * Compare paths between two specs
 */
export function comparePaths(
  oldSpec: Record<string, unknown>,
  newSpec: Record<string, unknown>
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const oldPaths = getPathNames(oldSpec);
  const newPaths = getPathNames(newSpec);

  // Find paths removed in new version
  for (const path of oldPaths) {
    if (!newPaths.has(path)) {
      results.push({
        status: 'removed',
        field: `paths.${path}`,
        oldValue: path,
        message: `Endpoint "${path}" removed`,
      });
    }
  }

  // Find paths added in new version
  for (const path of newPaths) {
    if (!oldPaths.has(path)) {
      results.push({
        status: 'added',
        field: `paths.${path}`,
        newValue: path,
        message: `Endpoint "${path}" added`,
      });
    }
  }

  return results;
}

/**
 * Compare patterns and enums in matching schemas
 */
export function comparePatterns(
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
          oldValue: oldProp.pattern,
          newValue: newProp.pattern,
          message: `Pattern changed for ${name}.${propName}`,
        });
      }

      // Compare enums
      if (JSON.stringify(oldProp.enum) !== JSON.stringify(newProp.enum)) {
        results.push({
          status: 'mismatch',
          field: `${name}.${propName}.enum`,
          oldValue: oldProp.enum,
          newValue: newProp.enum,
          message: `Enum changed for ${name}.${propName}`,
        });
      }
    }
  }

  return results;
}

export interface CompareOptions {
  /** Path to old spec file */
  oldSpecPath: string;
  /** Path to new spec file */
  newSpecPath: string;
  /** Old version label (for display) */
  oldVersion?: string;
  /** New version label (for display) */
  newVersion?: string;
}

/**
 * Compare two OpenAPI specs and return a summary
 */
export function compare(options: CompareOptions): ComparisonSummary {
  const oldSpec = loadSpec(options.oldSpecPath);
  const newSpec = loadSpec(options.newSpecPath);

  const schemaResults = compareSchemas(oldSpec, newSpec);
  const pathResults = comparePaths(oldSpec, newSpec);
  const patternResults = comparePatterns(oldSpec, newSpec);

  const allResults = [...schemaResults, ...pathResults, ...patternResults];

  return {
    removed: allResults.filter((r) => r.status === 'removed'),
    added: allResults.filter((r) => r.status === 'added'),
    changed: allResults.filter((r) => r.status === 'mismatch'),
    hasBreakingChanges: allResults.some((r) => r.status === 'mismatch' || r.status === 'removed'),
  };
}
