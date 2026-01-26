/**
 * Prettier Base Configuration
 *
 * Shared Prettier settings for all Atlas packages.
 */

/** @type {import("prettier").Config} */
export const base = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
};
