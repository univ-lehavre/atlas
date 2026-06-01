import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({ tsconfigRootDir: import.meta.dirname, architectureCategory: 'packages' }),
  {
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-return-void': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
];
