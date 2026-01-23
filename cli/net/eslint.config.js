import eslint from '@eslint/js';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import prettier from 'eslint-config-prettier';
import barrelFiles from 'eslint-plugin-barrel-files';
import functional from 'eslint-plugin-functional';
import importX from 'eslint-plugin-import-x';
import n from 'eslint-plugin-n';
import noSecrets from 'eslint-plugin-no-secrets';
import regexp from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import turbo from 'eslint-plugin-turbo';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignores
  {
    ignores: ['dist/**', 'coverage/**', '**/*.config.js', '**/*.config.ts'],
  },

  // Base
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Best practices
  unicorn.configs.recommended,
  n.configs['flat/recommended'],
  regexp.configs['flat/recommended'],
  eslintComments.recommended,

  // Node.js version and workspace resolution
  {
    rules: {
      'n/no-unsupported-features/node-builtins': ['error', { version: '>=24.0.0' }],
      'n/no-unsupported-features/es-syntax': ['error', { version: '>=24.0.0' }],
      'n/no-missing-import': [
        'error',
        {
          allowModules: ['@univ-lehavre/atlas-net'],
        },
      ],
    },
  },

  // Functional programming
  functional.configs.recommended,

  // Barrel files
  {
    plugins: { 'barrel-files': barrelFiles },
    rules: {
      'barrel-files/avoid-barrel-files': 'off',
      'barrel-files/avoid-re-export-all': 'error',
    },
  },

  // Security
  security.configs.recommended,
  {
    plugins: { 'no-secrets': noSecrets },
    rules: {
      'no-secrets/no-secrets': ['error', { tolerance: 4.5 }],
    },
  },

  // Imports
  {
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
    },
  },

  // Turbo
  turbo.configs['flat/recommended'],

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

  // Unicorn adjustments
  {
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/no-array-callback-reference': 'off',
    },
  },

  // Security rules
  {
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
    },
  },

  // Code Quality
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
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
            '^console\\.',
            '^this\\.',
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
        },
      ],
      'functional/prefer-immutable-types': ['error', { enforcement: 'None' }],
    },
  },

  // CLI files (relaxed rules for scripts)
  {
    files: ['src/**/*.ts'],
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

  // Prettier (must be last)
  prettier
);
