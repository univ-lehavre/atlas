/**
 * ESLint TypeScript Configuration
 *
 * Strict configuration for TypeScript library packages (crf, net).
 * Includes functional programming rules adapted for Effect.
 */

import vitest from '@vitest/eslint-plugin';
import functional from 'eslint-plugin-functional';
import { basePlugins, baseRules, prettierConfig, tseslint } from './base.js';

/**
 * @typedef {Object} TypeScriptOptions
 * @property {string[]} [ignores] - Additional patterns to ignore
 * @property {string[]} [workspaceModules] - Workspace module names to allow in n/no-missing-import
 */

/**
 * Creates ESLint config for TypeScript library packages
 * @param {TypeScriptOptions} [options]
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function typescript(options = {}) {
  const { ignores = [], workspaceModules = [] } = options;

  return tseslint.config(
    // Ignores
    {
      ignores: ['dist/**', 'coverage/**', '**/*.config.js', '**/*.config.ts', ...ignores],
    },

    // Base plugins
    ...basePlugins,

    // TypeScript strict
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    // Functional programming
    functional.configs.recommended,

    // Parser options
    {
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: ['*.js', '*.ts'],
          },
        },
      },
    },

    // Workspace module resolution
    {
      rules: {
        'n/no-missing-import': [
          'error',
          {
            allowModules: workspaceModules,
          },
        ],
      },
    },

    // Base rules
    ...baseRules,

    // TypeScript strict rules
    {
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': [
          'error',
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
            allowHigherOrderFunctions: true,
            allowDirectConstAssertionInArrowFunctions: true,
          },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/strict-boolean-expressions': [
          'error',
          {
            allowString: false,
            allowNumber: false,
            allowNullableObject: true,
            allowNullableBoolean: false,
            allowNullableString: false,
            allowNullableNumber: false,
            allowAny: false,
          },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      },
    },

    // Functional - adjustments for Effect
    {
      files: ['**/*.ts'],
      rules: {
        'functional/no-expression-statements': [
          'error',
          {
            ignoreVoid: true,
            ignoreCodePattern: [
              '^Effect\\.',
              '^pipe\\(',
              '^Layer\\.',
              '^Stream\\.',
              '^app\\.',
              '^\\w+\\.get\\(',
              '^\\w+\\.post\\(',
              '^\\w+\\.put\\(',
              '^\\w+\\.delete\\(',
              '^\\w+\\.patch\\(',
              '^\\w+\\.use\\(',
              '^serve\\(',
              '^console\\.',
              '^this\\.',
              '^\\w+\\[',
              '^params\\.',
            ],
          },
        ],
        'functional/no-return-void': 'off',
        'functional/no-classes': 'off',
        'functional/no-class-inheritance': 'off',
        'functional/readonly-type': 'off',
        'functional/functional-parameters': [
          'error',
          { allowRestParameter: true, enforceParameterCount: false },
        ],
        'functional/no-conditional-statements': ['error', { allowReturningBranches: 'ifExhaustive' }],
        'functional/no-throw-statements': 'error',
        'functional/no-try-statements': 'error',
        'functional/immutable-data': [
          'error',
          {
            ignoreClasses: true,
            ignoreImmediateMutation: true,
            ignoreNonConstDeclarations: true,
            ignoreAccessorPattern: 'params.*',
          },
        ],
        'functional/prefer-immutable-types': ['error', { enforcement: 'None' }],
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

    // Disable type-aware rules for test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      extends: [tseslint.configs.disableTypeChecked],
      rules: {
        'functional/no-expression-statements': 'off',
        'functional/no-conditional-statements': 'off',
        'functional/no-throw-statements': 'off',
        'functional/no-try-statements': 'off',
        'functional/immutable-data': 'off',
        'functional/no-let': 'off',
        'functional/no-loop-statements': 'off',
        'functional/prefer-immutable-types': 'off',
        'functional/functional-parameters': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        'max-lines-per-function': 'off',
        complexity: 'off',
        'no-console': 'off',
        'no-secrets/no-secrets': 'off',
        'vitest/no-conditional-expect': 'off',
        'n/no-extraneous-import': 'off',
        'turbo/no-undeclared-env-vars': 'off',
      },
    },

    // CLI and bin files
    {
      files: ['**/cli/**/*.ts', '**/bin/**/*.ts'],
      rules: {
        'functional/no-expression-statements': 'off',
        'functional/no-conditional-statements': 'off',
        'functional/no-throw-statements': 'off',
        'functional/no-try-statements': 'off',
        'functional/immutable-data': 'off',
        'functional/no-let': 'off',
        'functional/no-loop-statements': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
        'max-lines-per-function': 'off',
        complexity: 'off',
        'no-console': 'off',
        'n/hashbang': 'off',
        'n/no-process-exit': 'off',
        'unicorn/no-process-exit': 'off',
        'unicorn/catch-error-name': 'off',
        'unicorn/no-immediate-mutation': 'off',
        'unicorn/prefer-top-level-await': 'off',
        'unicorn/no-negated-condition': 'off',
        'unicorn/prefer-single-call': 'off',
        'turbo/no-undeclared-env-vars': 'off',
      },
    },

    // Server entry points (Hono patterns are imperative)
    {
      files: ['**/server/index.ts', '**/server/routes/**/*.ts', '**/server/*.ts'],
      rules: {
        'functional/no-expression-statements': 'off',
        'functional/no-conditional-statements': 'off',
        'functional/no-try-statements': 'off',
        'functional/no-let': 'off',
        'functional/no-loop-statements': 'off',
        'functional/immutable-data': 'off',
        'no-console': 'off',
        // Effect Match.tag returns `never` typed errors in exhaustive matches
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      },
    },

    // Prettier (must be last)
    ...prettierConfig
  );
}

