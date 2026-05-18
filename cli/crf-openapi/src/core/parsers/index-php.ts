/**
 * Parser for REDCap API/index.php
 *
 * Pure function that extracts content types and routing information from PHP source.
 */

import type { ContentTypeInfo } from '../types.js';

/**
 * Parse index.php content to extract content types and routing
 *
 * @param content - Raw PHP source code of index.php
 * @param availableActionFiles - Map of content type to available action file names
 * @returns Array of content type information
 */
export const parseIndexPhp = (
  content: string,
  availableActionFiles: Map<string, string[]>
): ContentTypeInfo[] => {
  if (!content) {
    return [];
  }

  const contentTypes: ContentTypeInfo[] = [];

  // Extract content types from the main switch statement
  const switchMatch = content.match(
    /switch\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*\)\s*\{([\s\S]*?)\n\tdefault:/
  );

  if (switchMatch?.[1]) {
    const switchBlock = switchMatch[1];
    const casePattern = /case\s+['"](\w+)['"]\s*:/g;
    let match;

    while ((match = casePattern.exec(switchBlock)) !== null) {
      const contentType = match[1];
      if (contentType) {
        contentTypes.push({
          content: contentType,
          actions: [],
          hasDataParam: false,
        });
      }
    }
  }

  // Extract actions for specific content types
  const actionPattern =
    /in_array\s*\(\s*\$post\s*\[\s*['"]content['"]\s*\]\s*,\s*array\s*\(\s*([^)]+)\s*\)\s*\)/g;
  let actionMatch;

  while ((actionMatch = actionPattern.exec(content)) !== null) {
    const contentList = actionMatch[1];
    if (!contentList) continue;

    const contents = contentList.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];

    const contextEnd = content.indexOf(';', actionMatch.index + actionMatch[0].length);
    const context = content.slice(actionMatch.index, contextEnd);

    const actionsInContext =
      context.match(/['"](\w+)['"]/g)?.map((s) => s.replace(/['"]/g, '')) ?? [];

    for (const ct of contents) {
      const info = contentTypes.find((c) => c.content === ct);
      if (info) {
        for (const action of actionsInContext) {
          if (['export', 'import', 'delete', 'switch', 'list', 'createFolder'].includes(action)) {
            if (!info.actions.includes(action)) {
              info.actions.push(action);
            }
          }
        }
      }
    }
  }

  // Determine which content types have data parameter
  const dataParamPattern =
    /\$post\s*\[\s*['"]content['"]\s*\]\s*==\s*['"](\w+)['"]\s*&&[\s\S]*?\$post\s*\[\s*['"]data['"]\s*\]/g;
  let dataMatch;

  while ((dataMatch = dataParamPattern.exec(content)) !== null) {
    const ct = dataMatch[1];
    const info = contentTypes.find((c) => c.content === ct);
    if (info) {
      info.hasDataParam = true;
    }
  }

  // Add actions from available action files
  for (const info of contentTypes) {
    const actionFiles = availableActionFiles.get(info.content);
    if (actionFiles) {
      for (const action of actionFiles) {
        if (!info.actions.includes(action)) {
          info.actions.push(action);
        }
      }
    }
  }

  return contentTypes;
};
