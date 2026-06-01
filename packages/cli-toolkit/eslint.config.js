import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({ tsconfigRootDir: import.meta.dirname, architectureCategory: 'packages' }),
  {
    // The toolkit is a thin imperative layer over `process` (env reading,
    // exit codes, argv parsing). These primitives are inherently mutable /
    // throw / loop, so the functional preset is relaxed for src/.
    files: ['src/**/*.ts'],
    rules: {
      'functional/no-throw-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-return-void': 'off',
      'functional/no-loop-statements': 'off',
      'functional/immutable-data': 'off',
      'functional/no-let': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'n/no-process-exit': 'off',
      'unicorn/no-process-exit': 'off',
      'no-console': 'off',
    },
  },
];
