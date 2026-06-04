import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// - n/no-unsupported-features/node-builtins : EventSource utilisé côté
//   navigateur, pas Node. La règle n est mal calibrée ici (2 occ.).
// - unicorn/prefer-add-event-listener : `onmessage` / `onerror` sur
//   EventSource sont conventionnels (cf. spec), pas un anti-pattern (4 occ.).
// - unicorn/no-array-sort : tri inline volontaire (1 occ.) — TODO refactor.
// - svelte/button-has-type : 2 boutons sans type explicite dans pages
//   legacy — TODO ajout `type="button"` quand pages refondues.
// - @typescript-eslint/no-unnecessary-condition : flux Effect avec valeurs
//   nullables non détectées par le narrowing TS (1 occ., +server.ts).
export default [
  ...svelte({ architectureCategory: 'apps' }),
  {
    files: ['src/**/*.svelte', 'src/**/*.ts'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/no-array-sort': 'off',
      'svelte/button-has-type': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    // refresh-coordinator.ts encapsule volontairement un état mutable partagé
    // entre requêtes (promesse en vol + horodatage) derrière une interface
    // injectable. Cet état est impératif par nature ; on le confine ici plutôt
    // que de le laisser fuir en variables de module (cf. l'en-tête du fichier
    // et l'ADR 0040). Dérogation au même titre que les `cache.ts` des paquets.
    files: ['src/lib/refresh-coordinator.ts'],
    rules: {
      'functional/no-let': 'off',
      'functional/no-expression-statements': 'off',
      'functional/no-mixed-types': 'off',
      'functional/immutable-data': 'off',
    },
  },
];
