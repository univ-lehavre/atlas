/**
 * Parser for REDCap API action files
 *
 * Pure function that extracts validation and response information from PHP source.
 */

import type { ActionFileInfo, ContentTypeInfo } from '../types.js';

/**
 * Parse an action file content to extract validation and response info
 *
 * @param content - Raw PHP source code of the action file
 * @param contentType - Content type name
 * @param action - Action name
 * @returns Action file information
 */
export const parseActionFile = (
  content: string,
  contentType: string,
  action: string
): ActionFileInfo => {
  const info: ActionFileInfo = {
    content: contentType,
    action,
    validations: [],
    responseFormats: [],
    usesDataExport: false,
  };

  if (!content) {
    return info;
  }

  // Extract validation messages
  const validationPattern = /RestUtility::sendResponse\s*\(\s*400\s*,\s*['"]([^'"]+)['"]/g;
  const validations: string[] = [];
  let match;

  while ((match = validationPattern.exec(content)) !== null) {
    if (match[1]) {
      validations.push(match[1]);
    }
  }

  // Extract response formats
  const responseFormats: string[] = [];
  if (content.includes("case 'json':")) responseFormats.push('json');
  if (content.includes("case 'xml':")) responseFormats.push('xml');
  if (content.includes("case 'csv':")) responseFormats.push('csv');
  if (content.includes("case 'odm':")) responseFormats.push('odm');

  // Check if uses data export
  const usesDataExport = content.includes('DataExport::') || content.includes('getRecordsFlat');

  return {
    ...info,
    validations,
    responseFormats,
    usesDataExport,
  };
};

/**
 * Parse multiple action files from a map of content
 *
 * @param actionFileContents - Map of "contentType_action" to file content
 * @param contentTypes - Array of content type info
 * @returns Map of action file information
 */
export const parseActionFiles = (
  actionFileContents: ReadonlyMap<string, string>,
  contentTypes: readonly ContentTypeInfo[]
): ReadonlyMap<string, ActionFileInfo> => {
  const actionFiles = new Map<string, ActionFileInfo>();

  for (const ct of contentTypes) {
    for (const action of ct.actions) {
      const key = `${ct.content}_${action}`;
      const content = actionFileContents.get(key);

      if (content !== undefined) {
        actionFiles.set(key, parseActionFile(content, ct.content, action));
      }
    }
  }

  return actionFiles;
};
