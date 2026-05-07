import { typescript } from '@univ-lehavre/atlas-shared-config/eslint';

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    workspaceModules: [
      '@univ-lehavre/atlas-researcher-profiles',
      '@univ-lehavre/atlas-fetch-openalex',
      '@univ-lehavre/atlas-openalex-types',
    ],
  }),
  // CLI entry points: commands, prompts and rendering helpers are imperative
  // by nature (Clack flows, process.exit, console output, mutable accumulators).
  // The shared `**/cli/**/*.ts` override doesn't reach this package because
  // ESLint sees relative paths (src/commands/..., src/prompts/...).
  {
    files: [
      'src/bin/**/*.ts',
      'src/commands/**/*.ts',
      'src/output/**/*.ts',
      'src/prompts/**/*.ts',
    ],
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
];
