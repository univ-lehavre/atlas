import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// find-an-expert agrège des données externes (publications, profils) avec
// un typage volontairement permissif (sources hétérogènes). Le preset
// strict catche bcp de findings qui sont des accidents du typage source.
// Détail (occurrences à la migration) :
// - security/detect-object-injection (44) : accès indexés par clés
//   contrôlées (mappings publications/profils).
// - @typescript-eslint/restrict-template-expressions (22) : interpolation
//   de valeurs typées via z.unknown().
// - @typescript-eslint/no-deprecated (19) : APIs zod ZodTypeAny et anciens
//   helpers — migration séparée.
// - @typescript-eslint/no-unsafe-* (35) : flux JSON externes.
// - @typescript-eslint/prefer-nullish-coalescing (11) : code legacy `||`.
// - svelte/button-has-type (10) : TODO accessibilité.
// - functional/no-loop-statements (9) : pipelines imperatifs.
// - @typescript-eslint/no-unnecessary-condition (8),
//   no-floating-promises (5), no-unused-vars (5), no-base-to-string (2),
//   no-non-null-assertion (1), no-empty-function (1),
//   no-redundant-type-constituents (1) : code legacy.
// - unicorn/* (8), security/detect-non-literal-fs-filename (3),
//   security/detect-unsafe-regex (1) : voir 0020 ; à refactorer.
// - eslint-comments/require-description (1) : commentaire de désactivation
//   existant sans description.
export default [
  ...svelte({ architectureCategory: 'apps' }),
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-unsafe-regex': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      'svelte/button-has-type': 'off',
      'functional/no-loop-statements': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-array-reverse': 'off',
      'unicorn/import-style': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
      '@eslint-community/eslint-comments/require-description': 'off',
      'no-secrets/no-secrets': 'off', // URLs Google Fonts détectées comme secrets
      'unicorn/prefer-global-this': 'off', // window utilisé en contexte navigateur
      'unicorn/prefer-ternary': 'off',
      'unicorn/no-document-cookie': 'off', // gestion de préférences i18n côté client
      'n/no-unsupported-features/node-builtins': 'off',
      'security/detect-non-literal-regexp': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      'no-undef': 'off', // __APP_VERSION__ injecté par Vite define
    },
  },
];
