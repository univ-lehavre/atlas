import baseConfig from '@univ-lehavre/atlas-eslint-config/base';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...baseConfig,
  {
    ignores: [
      '**/tools/**',
      '**/scripts/**',
      '*.config.ts',
      '*.config.js',
      '**/*.config.ts',
      '**/*.config.js',
      'packages/eslint-config/**',
      'packages/typescript-config/**',
      'packages/redcap-cli/**',
      '**/coverage/**',
      '**/.svelte-kit/**',
      '**/build/**',
    ],
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['*.config.js', '*.config.ts'],
    rules: {
      'barrel-files/avoid-barrel-files': 'off',
    },
  },
  // Svelte configuration for ecrin
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      // Svelte 5 runes compatibility
      'svelte/valid-compile': 'error',
      'svelte/no-at-html-tags': 'warn',
      'svelte/require-each-key': 'warn',
      'svelte/no-reactive-functions': 'error',
      'svelte/no-reactive-literals': 'error',
      // Disable rules that conflict with Svelte patterns
      'svelte/no-navigation-without-resolve': 'off', // SvelteKit static routes don't need resolve()
      'svelte/no-unused-props': 'off', // False positives with $props()
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/no-let': 'off',
      'functional/no-mixed-types': 'off',
      'functional/functional-parameters': 'off',
      'functional/prefer-immutable-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'no-console': 'off',
      'import-x/no-cycle': 'off',
      'prefer-const': 'off', // $props() destructuring uses let
    },
  },
  // SvelteKit server files and routes
  {
    files: [
      'apps/ecrin/src/**/*.server.ts',
      'apps/ecrin/src/hooks.server.ts',
      'apps/ecrin/src/lib/server/**/*.ts',
      'apps/ecrin/src/routes/**/*.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/immutable-data': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'functional/no-let': 'off',
      'no-console': 'off',
      'turbo/no-undeclared-env-vars': 'off',
      // SvelteKit generates $types imports
      'n/no-missing-import': 'off',
    },
  }
);
