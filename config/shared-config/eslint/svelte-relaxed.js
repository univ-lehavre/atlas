/**
 * ESLint Svelte Relaxed Configuration
 *
 * Less strict configuration for SvelteKit applications.
 * Suitable for imported projects or rapid development.
 */

import sveltePlugin from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @typedef {Object} SvelteRelaxedOptions
 * @property {string[]} [ignores] - Additional patterns to ignore
 */

/**
 * Creates relaxed ESLint config for SvelteKit applications
 * @param {SvelteRelaxedOptions} [options]
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function svelteRelaxed(options = {}) {
	const { ignores = [] } = options;

	return tseslint.config(
		// Ignores
		{
			ignores: [
				'.svelte-kit/**',
				'build/**',
				'dist/**',
				'node_modules/**',
				...ignores,
			],
		},

		// Base
		eslint.configs.recommended,
		...tseslint.configs.recommended,
		...sveltePlugin.configs['flat/recommended'],
		prettier,
		...sveltePlugin.configs['flat/prettier'],

		// Global settings
		{
			languageOptions: {
				globals: { ...globals.browser, ...globals.node },
			},
			rules: {
				'no-undef': 'off',
				complexity: ['warn', { max: 10 }],
				'max-depth': ['warn', { max: 4 }],
				'max-nested-callbacks': ['warn', { max: 3 }],
				'max-params': ['warn', { max: 4 }],
				'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
			},
		},

		// Svelte files
		{
			files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
			languageOptions: {
				parserOptions: {
					parser: tseslint.parser,
					extraFileExtensions: ['.svelte'],
				},
			},
		},

		// Relaxed TypeScript rules
		{
			rules: {
				'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
				'@typescript-eslint/no-explicit-any': 'warn',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
				'@typescript-eslint/no-unsafe-argument': 'off',
				'svelte/no-navigation-without-resolve': 'off',
			},
		}
	);
}
