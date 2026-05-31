import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// ecrin est une SPA Svelte 5 legacy avec une logique formulaire dense.
// Beaucoup de findings strict sont liés au style imperatif des handlers,
// aux flux Appwrite/typage permissif, et à des composants en PascalCase.
// Détail (occurrences mesurées au moment de la migration) :
// - functional/no-expression-statements (21), no-conditional-statements
//   (14), no-loop-statements (10), no-try-statements (2),
//   no-throw-statements (2), no-mixed-types (1), immutable-data (1) : code
//   formulaire imperatif et flux serveur, à refondre.
// - @typescript-eslint/no-unnecessary-condition (16), strict-boolean-expressions
//   (10), explicit-function-return-type (8), no-unsafe-* (12),
//   prefer-nullish-coalescing (2), require-await (1), no-base-to-string (1),
//   restrict-template-expressions (1), no-redundant-type-constituents (1),
//   no-empty-function (2), unified-signatures (1) : code legacy typé large.
// - unicorn/filename-case (13) : composants PascalCase (.svelte) — voir
//   préset svelte qui les autorise déjà, restent quelques .ts à renommer.
// - svelte/button-has-type (4) : boutons sans type — TODO accessibilité.
// - svelte/valid-compile (2) : pattern Svelte 5 sur `data` à corriger
//   (state_referenced_locally) — TODO refactor pages.
// - unicorn/prefer-logical-operator-over-ternary (1),
//   unicorn/consistent-function-scoping (1) : cosmétiques.
export default [
  ...svelte({
    architectureCategory: 'apps',
    ignores: ['test-utils/**'],
  }),
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      'functional/no-expression-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-try-statements': 'off',
      'functional/no-throw-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/immutable-data': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      'unicorn/filename-case': 'off',
      'svelte/button-has-type': 'off',
      'svelte/valid-compile': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'no-console': 'off', // logs serveur/graph en mode debug — TODO logger structuré
      'max-lines-per-function': 'off', // pipeline de graph long, à scinder
      complexity: 'off',
    },
  },
];
