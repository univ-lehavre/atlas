/**
 * Parser for REDCap curl examples
 *
 * Pure function that extracts curl examples from shell scripts.
 */

/**
 * Parse a single curl example file
 *
 * @param content - Raw content of the curl example shell script
 * @returns Parsed example with content type and action, or null if invalid
 */
export const parseCurlExample = (content: string): { key: string; data: string } | null => {
  if (!content) {
    return null;
  }

  const dataMatch = content.match(/DATA\s*=\s*["']([^"']+)["']/);
  if (!dataMatch?.[1]) {
    return null;
  }

  const data = dataMatch[1];
  const contentMatch = data.match(/content=(\w+)/);
  const actionMatch = data.match(/action=(\w+)/);

  if (!contentMatch?.[1]) {
    return null;
  }

  const key = actionMatch?.[1]
    ? `${contentMatch[1]}_${actionMatch[1]}`
    : `${contentMatch[1]}_export`;

  return { key, data };
};

/**
 * Parse multiple curl example files
 *
 * @param exampleContents - Map of filename to file content
 * @returns Map of endpoint key to array of example data strings
 */
export const parseCurlExamples = (
  exampleContents: ReadonlyMap<string, string>
): ReadonlyMap<string, readonly string[]> => {
  const examples = new Map<string, string[]>();

  for (const [, content] of exampleContents) {
    const parsed = parseCurlExample(content);
    if (parsed) {
      const existing = examples.get(parsed.key) ?? [];
      existing.push(parsed.data);
      examples.set(parsed.key, existing);
    }
  }

  return examples;
};
