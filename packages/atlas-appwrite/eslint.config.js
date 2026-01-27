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
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
];
