/**
 * Parser for REDCap PHP class schemas
 *
 * Pure functions that extract data schemas from PHP class files.
 */

import type { SchemaDefinition } from '../types.js';

const inferFieldType = (fieldName: string): string => {
  if (fieldName.includes('_id') || fieldName.includes('_num') || fieldName === 'purpose') {
    return 'integer';
  }
  if (
    fieldName.includes('_enabled') ||
    fieldName.startsWith('is_') ||
    fieldName.startsWith('has_')
  ) {
    return 'boolean';
  }
  if (fieldName.includes('_time') || fieldName.includes('_date')) {
    return 'string';
  }
  return 'string';
};

const parsePhpArrayToSchema = (
  arrayContent: string,
  name: string,
  source: string
): SchemaDefinition | null => {
  const properties: Record<string, { type: string; description: string }> = {};

  const fieldPattern = /['"](\w+)['"]\s*=>\s*['"](\w+)['"]/g;
  let match;

  while ((match = fieldPattern.exec(arrayContent)) !== null) {
    const apiField = match[2];
    if (apiField) {
      properties[apiField] = {
        type: inferFieldType(apiField),
        description: `Field: ${apiField}`,
      };
    }
  }

  return Object.keys(properties).length > 0 ? { name, properties, source } : null;
};

/**
 * Parse Project.php content to extract project-related schemas
 *
 * @param content - Raw PHP source code of Project.php
 * @returns Array of schema definitions
 */
export const parseProjectSchemas = (content: string): readonly SchemaDefinition[] => {
  if (!content) {
    return [];
  }

  const schemas: SchemaDefinition[] = [];

  const exportMatch = content.match(
    /getAttributesApiExportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
  );
  if (exportMatch?.[1]) {
    const schema = parsePhpArrayToSchema(exportMatch[1], 'ProjectInfo', 'Project.php');
    if (schema) schemas.push(schema);
  }

  const importMatch = content.match(
    /getAttributesApiImportProjectInfo\s*\(\s*\)\s*\{[\s\S]*?\$project_fields\s*=\s*array\s*\(([\s\S]*?)\);/
  );
  if (importMatch?.[1]) {
    const schema = parsePhpArrayToSchema(importMatch[1], 'ProjectSettingsImport', 'Project.php');
    if (schema) schemas.push(schema);
  }

  return schemas;
};

/**
 * Parse UserRights.php content to extract user rights schema
 *
 * @param content - Raw PHP source code of UserRights.php
 * @returns Array of schema definitions
 */
export const parseUserRightsSchemas = (content: string): readonly SchemaDefinition[] => {
  if (!content) {
    return [];
  }

  const schemas: SchemaDefinition[] = [];

  const attrMatch = content.match(
    /getApiUserPrivilegesAttr\s*\([^)]*\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\];/
  );

  if (attrMatch?.[1]) {
    const attrs = attrMatch[1].match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];

    const properties: Record<string, { type: string; description: string }> = {};
    for (const attr of attrs) {
      properties[attr] = { type: 'string', description: attr };
    }

    if (Object.keys(properties).length > 0) {
      schemas.push({
        name: 'UserRights',
        properties,
        source: 'UserRights.php',
      });
    }
  }

  return schemas;
};

/**
 * Parse all class schemas from a map of class file contents
 *
 * @param classContents - Map of class name to file content
 * @returns Array of schema definitions
 */
export const parseClassSchemas = (
  classContents: ReadonlyMap<string, string>
): readonly SchemaDefinition[] => {
  const schemas: SchemaDefinition[] = [];

  const projectContent = classContents.get('Project');
  if (projectContent) {
    schemas.push(...parseProjectSchemas(projectContent));
  }

  const userRightsContent = classContents.get('UserRights');
  if (userRightsContent) {
    schemas.push(...parseUserRightsSchemas(userRightsContent));
  }

  return schemas;
};
