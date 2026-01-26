/**
 * ESLint Scripts Configuration
 *
 * Relaxed configuration for internal tooling and scripts (redcap).
 * Uses recommended (not strict) TypeScript rules.
 */

import vitest from '@vitest/eslint-plugin';
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @typedef {Object} ScriptsOptions
 * @property {string[]} [ignores] - Additional patterns to ignore
 */

/**
 * Creates ESLint config for internal scripts and tooling
 * @param {ScriptsOptions} [options]
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function scripts(options = {}) {
  const { ignores = [] } = options;

  return tseslint.config(
    // Ignores
    {
      ignores: ['dist/**', ...ignores],
    },

    // Base
    eslint.configs.recommended,
    ...tseslint.configs.recommended,

    // Global settings for all TypeScript files
    {
      files: ['**/*.ts'],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      rules: {
        // Relaxed rules for analyzer/test scripts (not library code)
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off',
      },
    },

    // Code Quality
    {
      rules: {
        'prefer-const': 'error',
        'no-var': 'error',
        eqeqeq: ['error', 'always'],
        curly: ['error', 'all'],
      },
    },

    // Vitest
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      plugins: { vitest },
      rules: {
        ...vitest.configs.recommended.rules,
      },
    },

    // Disable strict rules for test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      extends: [tseslint.configs.disableTypeChecked],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        'vitest/no-conditional-expect': 'off',
      },
    },

    // Prettier (must be last)
    prettier
  );
}

