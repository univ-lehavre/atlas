import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// - security/detect-object-injection : faux positifs sur accès indexés
//   par clés contrôlées (charts.ts) (7 occ.).
// - security/detect-non-literal-fs-filename : lectures de logs dont le
//   chemin est construit en interne (+server.ts admin) (2 occ.).
// - n/no-unsupported-features/node-builtins, unicorn/prefer-add-event-listener,
//   svelte/button-has-type, unicorn/no-array-sort : voir 0020 (legacy live
//   pages SSE). TODO: refondre pages quand back unifié (10 occ.).
// - max-lines-per-function : SSE handlers longs par nature, à refondre.
// - functional/no-loop-statements / no-mixed-types : +page.server.ts &
//   +server.ts utilisent boucles imperatives et types mixtes typiques
//   d'un endpoint Hono/Effect.
// - @typescript-eslint/no-unnecessary-condition, no-non-null-assertion,
//   explicit-function-return-type : code Hono routes legacy.
export default [
  ...svelte({ architectureCategory: 'apps' }),
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/no-array-sort': 'off',
      'svelte/button-has-type': 'off',
      'max-lines-per-function': 'off',
      'functional/no-loop-statements': 'off',
      'functional/no-mixed-types': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
