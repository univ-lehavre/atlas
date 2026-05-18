/**
 * OpenAPI Spec Comparator
 *
 * Pure functions for comparing two OpenAPI specifications to identify
 * discrepancies, breaking changes, and missing endpoints.
 */

import type { ComparisonResult, ComparisonSummary, OpenApiSpec } from './types.js';

const getSchemaNames = (spec: OpenApiSpec): ReadonlySet<string> => {
  const components = spec.components as Record<string, unknown> | undefined;
  const schemas = components?.schemas as Record<string, unknown> | undefined;
  return new Set(schemas ? Object.keys(schemas) : []);
};

const getPathNames = (spec: OpenApiSpec): ReadonlySet<string> => {
  const paths = spec.paths as Record<string, unknown> | undefined;
  return new Set(paths ? Object.keys(paths) : []);
};

/**
 * Compare schemas between two specs
 *
 * @param oldSpec - Previous OpenAPI specification
 * @param newSpec - New OpenAPI specification
 * @returns Array of comparison results for schema changes
 */
export const compareSchemas = (
  oldSpec: OpenApiSpec,
  newSpec: OpenApiSpec
): readonly ComparisonResult[] => {
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
};

/**
 * Compare paths between two specs
 *
 * @param oldSpec - Previous OpenAPI specification
 * @param newSpec - New OpenAPI specification
 * @returns Array of comparison results for path changes
 */
export const comparePaths = (
  oldSpec: OpenApiSpec,
  newSpec: OpenApiSpec
): readonly ComparisonResult[] => {
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
};

/**
 * Compare patterns and enums in matching schemas
 *
 * @param oldSpec - Previous OpenAPI specification
 * @param newSpec - New OpenAPI specification
 * @returns Array of comparison results for pattern/enum changes
 */
export const comparePatterns = (
  oldSpec: OpenApiSpec,
  newSpec: OpenApiSpec
): readonly ComparisonResult[] => {
  const results: ComparisonResult[] = [];

  const oldComponents = oldSpec.components as Record<string, unknown> | undefined;
  const newComponents = newSpec.components as Record<string, unknown> | undefined;

  const oldSchemas = (oldComponents?.schemas ?? {}) as Record<string, Record<string, unknown>>;
  const newSchemas = (newComponents?.schemas ?? {}) as Record<string, Record<string, unknown>>;

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
};

/**
 * Compare two OpenAPI specs and return a summary
 *
 * This is a pure function that takes two specifications and returns
 * a complete comparison summary.
 *
 * @param oldSpec - Previous OpenAPI specification
 * @param newSpec - New OpenAPI specification
 * @returns Comparison summary with all changes
 */
export const compareSpecs = (oldSpec: OpenApiSpec, newSpec: OpenApiSpec): ComparisonSummary => {
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
};
