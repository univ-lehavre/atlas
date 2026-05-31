import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// - @typescript-eslint/restrict-template-expressions (4) : interpolation
//   de number/codePoint dans des mocks et pages, lisible.
// - unicorn/prefer-code-point (1) : String.fromCharCode dans génération
//   d'initiales, acceptable.
// - functional/no-loop-statements (2), no-conditional-statements (1),
//   immutable-data (2) : Fisher–Yates shuffle nécessite mutation locale.
// - security/detect-object-injection (4) : indices contrôlés.
// - @typescript-eslint/unified-signatures (1) : surcharge fetch SvelteKit.
// - @typescript-eslint/no-unsafe-* (7) : composants +layout.svelte / +page.svelte
//   utilisent `page.data` typé large — TODO type narrowing.
// - unicorn/no-array-sort (7) : tris sur copies dans tests/intégration.
// - @typescript-eslint/no-empty-function (6), consistent-type-imports (1) :
//   mocks de tests.
// - unicorn/consistent-function-scoping (1) : factory RNG locale aux specs.
export default [
  ...svelte({ architectureCategory: 'apps' }),
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-conditional-statements': 'off',
      'functional/immutable-data': 'off',
      'security/detect-object-injection': 'off',
      'unicorn/prefer-code-point': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
];
