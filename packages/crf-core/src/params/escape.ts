/**
 * Parameter escaping utilities
 *
 * Functions for safely escaping values in API parameters.
 */

/**
 * Escape a value for use in REDCap filterLogic
 *
 * Prevents injection attacks by escaping special characters.
 *
 * @example
 * ```ts
 * escapeFilterLogicValue('O\'Brien')
 * // "O\\'Brien"
 * ```
 */
export const escapeFilterLogicValue = (value: string): string =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", String.raw`\'`)
    .replaceAll('"', String.raw`\"`);

/**
 * Escape a value for use in SQL-like patterns
 *
 * @example
 * ```ts
 * escapeLikePattern('100%')
 * // "100\\%"
 * ```
 */
export const escapeLikePattern = (value: string): string =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', String.raw`\%`)
    .replaceAll('_', String.raw`\_`);

/**
 * Quote a string value for filterLogic
 *
 * @example
 * ```ts
 * quoteFilterValue('test')
 * // "'test'"
 * ```
 */
export const quoteFilterValue = (value: string): string => `'${escapeFilterLogicValue(value)}'`;
