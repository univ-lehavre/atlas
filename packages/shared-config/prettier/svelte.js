/**
 * Prettier Svelte Configuration
 *
 * Extends base with Svelte plugin support.
 */

import { base } from './base.js';

/** @type {import("prettier").Config} */
export const svelte = {
  ...base,
  plugins: ['prettier-plugin-svelte'],
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
      },
    },
  ],
};
