import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({}),
  // Disable strict functional rules for this imperative utility package
  {
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-classes': 'off',
      'functional/no-let': 'off',
      'functional/no-loop-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/no-mixed-types': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/require-await': 'off', // Validators may be async for interface consistency
      'security/detect-non-literal-regexp': 'off', // Domain validation uses configurable regex
      'security/detect-object-injection': 'off', // False positive for property iteration
    },
  },
];
