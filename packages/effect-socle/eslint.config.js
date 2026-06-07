import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({ tsconfigRootDir: import.meta.dirname, architectureCategory: 'packages' }),
  {
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-return-void': 'off',
    },
  },
];
