import { svelte } from '@univ-lehavre/atlas-shared-config/eslint/svelte';

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet : le code legacy (composants Svelte hérités, +server.ts
// flux Effect, helpers de scripts) n'est pas refactoré dans la migration
// strict. Les règles ci-dessous sont désactivées pour permettre le passage
// au preset sans bruit ; chaque entrée porte un TODO de remédiation.
export default [
  ...svelte({ architectureCategory: 'apps' }),
  {
    // Les scripts de maintenance sont en dehors du projectService TS.
    // Ignorés du lint pour éviter un parsing-error qui demanderait
    // d'enrichir le tsconfig sans bénéfice (scripts ad hoc).
    ignores: ['scripts/**'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    rules: {
      // TODO: corriger ces points quand le code applicatif sera revu.
      // - filename-case : un fichier en camelCase (userRepository.ts) (1 occ.)
      // - no-unsafe-* : composants/serveurs construisent des objets dynamiques (8 occ.)
      // - no-base-to-string : FormData.get() retourne string|File (1 occ.)
      // - no-deprecated : zod ZodTypeAny encore présent (1 occ.)
      // - unified-signatures, no-unused-vars, prefer-optional-chain,
      //   no-unnecessary-condition, no-array-sort : code legacy (5 occ.)
      // - functional/no-return-void : load() functions (1 occ.)
      'unicorn/filename-case': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'unicorn/no-array-sort': 'off',
      'functional/no-return-void': 'off',
    },
  },
  {
    // Tests : helpers de mock peuvent avoir des méthodes vides ;
    // ranger des arrow fns dans le scope interne reste idiomatique
    // avec les fixtures partagées par describe().
    files: ['tests/**/*.ts', 'src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/filename-case': 'off', // un test legacy TopNavbar.test.ts
      'vitest/no-disabled-tests': 'off',
    },
  },
];
