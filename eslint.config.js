import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import functional from 'eslint-plugin-functional';
import jsdoc from 'eslint-plugin-jsdoc';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  jsdoc.configs['flat/recommended-typescript'],
  prettier,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/docs/**',
      '*.config.ts',
      '*.config.js',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      functional.configs.externalTypeScriptRecommended,
      functional.configs.recommended,
      functional.configs.stylistic,
    ],
    plugins: {
      security,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // TypeScript Strict
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

      // Security
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',

      // Code Quality
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

      // Functional - ajustements pour Effect
      'functional/no-expression-statements': [
        'error',
        {
          ignoreVoid: true,
          ignoreCodePattern: [
            // Effect patterns
            '^Effect\\.',
            '^pipe\\(',
            '^Layer\\.',
            '^Stream\\.',
            // Hono patterns (routers and app setup)
            '^app\\.',
            '^\\w+\\.get\\(',
            '^\\w+\\.post\\(',
            '^\\w+\\.put\\(',
            '^\\w+\\.delete\\(',
            '^\\w+\\.patch\\(',
            '^\\w+\\.use\\(',
            '^serve\\(',
            // Console for debugging
            '^console\\.',
            // Class constructor assignments
            '^this\\.',
            // Object property assignments (for building params objects)
            '^\\w+\\[',
            '^params\\.',
          ],
        },
      ],
      'functional/no-return-void': 'off', // Effect utilise void pour les side effects
      'functional/no-classes': 'off', // Effect utilise des classes pour les services
      'functional/no-class-inheritance': 'off', // Effect errors extend Data.TaggedError
      'functional/readonly-type': 'off', // Effect utilise readonly keyword
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
      'functional/prefer-immutable-types': [
        'error',
        {
          enforcement: 'None',
        },
      ],
    },
  },
  // Disable strict rules for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/immutable-data': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'no-console': 'off',
    },
  }
);
