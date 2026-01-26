/**
 * String utilities
 */

/**
 * Capitalize the first letter of a string
 *
 * @example
 * ```ts
 * capitalizeFirst('hello')
 * // 'Hello'
 * ```
 */
export const capitalizeFirst = (str: string): string =>
  str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;

/**
 * Convert snake_case to camelCase
 *
 * @example
 * ```ts
 * snakeToCamel('record_id')
 * // 'recordId'
 * ```
 */
export const snakeToCamel = (str: string): string =>
  str.replaceAll(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/**
 * Convert camelCase to snake_case
 *
 * @example
 * ```ts
 * camelToSnake('recordId')
 * // 'record_id'
 * ```
 */
export const camelToSnake = (str: string): string =>
  str.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * Truncate a string to a maximum length
 *
 * @example
 * ```ts
 * truncate('Hello World', 5)
 * // 'Hello...'
 * ```
 */
export const truncate = (str: string, maxLength: number, suffix = '...'): string =>
  str.length > maxLength ? str.slice(0, maxLength) + suffix : str;

/**
 * Remove leading/trailing whitespace and collapse internal whitespace
 */
export const normalizeWhitespace = (str: string): string => str.trim().replaceAll(/\s+/g, ' ');
