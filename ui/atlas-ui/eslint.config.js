import { svelte } from "@univ-lehavre/atlas-shared-config/eslint/svelte";

// Migration vers le preset strict — voir docs/decisions/0020-svelte-eslint-strict.md
// Dérogations paquet :
// atlas-ui est la bibliothèque de composants Svelte 5 partagée. Beaucoup
// de findings sont structurels (Storybook PascalCase, `page.data` typé
// large) et ne justifient pas un refactor de masse.
// Détail (occurrences à la migration) :
// - @typescript-eslint/no-unsafe-* (67) : composants consomment
//   `data` / `page` SvelteKit dont le type fin est défini ailleurs.
// - unicorn/filename-case (19) : fichiers .stories.ts en PascalCase,
//   convention Storybook (matche le composant correspondant).
// - @typescript-eslint/no-unnecessary-condition (10) : narrowing TS
//   incomplet sur des props optionnelles.
// - functional/no-conditional-statements (7), no-expression-statements (5),
//   immutable-data (2) : code de présentation imperatif.
// - @typescript-eslint/restrict-template-expressions (4),
//   require-await (4), no-empty-function (3), prefer-nullish-coalescing
//   (2), no-misused-spread (2), consistent-type-imports (2),
//   strict-boolean-expressions (1), no-unnecessary-type-parameters (1),
//   no-unnecessary-type-assertion (1), no-base-to-string (1),
//   dot-notation (1) : code legacy à nettoyer.
// - unicorn/consistent-function-scoping (3), prefer-code-point (2),
//   text-encoding-identifier-case (1), relative-url-style (1),
//   prefer-spread (1), prefer-query-selector (1), prefer-global-this (1),
//   prefer-dom-node-append (1), no-useless-fallback-in-spread (1),
//   no-useless-undefined (rest), no-negated-condition (rest),
//   no-useless-default-assignment (rest), catch-error-name (1) :
//   préférences stylistiques.
// - svelte/button-has-type (2), svelte/valid-compile (1) : TODO refactor.
// - security/detect-non-literal-fs-filename (1),
//   regexp/no-super-linear-backtracking (1) : usages contrôlés.
export default [
  ...svelte({ architectureCategory: "ui" }),
  {
    files: ["src/**/*.ts", "src/**/*.svelte", ".storybook/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/dot-notation": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-expression-statements": "off",
      "functional/immutable-data": "off",
      "unicorn/filename-case": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/prefer-code-point": "off",
      "unicorn/text-encoding-identifier-case": "off",
      "unicorn/relative-url-style": "off",
      "unicorn/prefer-spread": "off",
      "unicorn/prefer-query-selector": "off",
      "unicorn/prefer-global-this": "off",
      "unicorn/prefer-dom-node-append": "off",
      "unicorn/no-useless-fallback-in-spread": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/no-negated-condition": "off",
      "unicorn/catch-error-name": "off",
      "@typescript-eslint/no-useless-default-assignment": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "svelte/button-has-type": "off",
      "svelte/valid-compile": "off",
      "security/detect-non-literal-fs-filename": "off",
      "regexp/no-super-linear-backtracking": "off",
      "@eslint-community/eslint-comments/require-description": "off",
      "functional/no-throw-statements": "off",
      "no-console": "off", // stories interactives loggent les events
    },
  },
  {
    // Level-1 component tests migrated from apps/amarre (Phase 10.2).
    // Files keep the PascalCase name of the component under test
    // (TopNavbar.test.ts ↔ TopNavbar.svelte) — same waiver amarre's
    // eslint config grants its `tests/` tree.
    files: ["tests/**/*.ts"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
];
