/**
 * ESLint Base Configuration
 *
 * Common plugins and rules shared across all package types.
 * This is NOT meant to be used directly - use typescript, svelte, or scripts presets.
 */

import eslint from "@eslint/js";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettier from "eslint-config-prettier";
import barrelFiles from "eslint-plugin-barrel-files";
import importX from "eslint-plugin-import-x";
import n from "eslint-plugin-n";
import noSecrets from "eslint-plugin-no-secrets";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import turbo from "eslint-plugin-turbo";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

/** @type {import('typescript-eslint').ConfigArray} */
export const basePlugins = [
  // Base
  eslint.configs.recommended,

  // Best practices
  unicorn.configs.recommended,
  n.configs["flat/recommended"],
  regexp.configs["flat/recommended"],
  eslintComments.recommended,
  {
    // Phase 5.5 — Chaque `eslint-disable*` doit s'expliquer après `--`.
    // Empêche les disables silencieux qui s'accumulent au fil du temps.
    // Pattern accepté : `eslint-disable-next-line svelte/X -- raison`.
    rules: {
      "@eslint-community/eslint-comments/require-description": [
        "error",
        { ignore: [] },
      ],
    },
  },

  // Security
  security.configs.recommended,
  {
    plugins: { "no-secrets": noSecrets },
    rules: {
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
    },
  },

  // Barrel files
  {
    plugins: { "barrel-files": barrelFiles },
    rules: {
      "barrel-files/avoid-barrel-files": "off",
      "barrel-files/avoid-re-export-all": "error",
    },
  },

  // Imports
  {
    plugins: { "import-x": importX },
    rules: {
      "import-x/no-cycle": "error",
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
    },
  },

  // Turbo
  turbo.configs["flat/recommended"],
];

/** @type {import('typescript-eslint').ConfigArray} */
export const baseRules = [
  // Node.js version
  {
    rules: {
      "n/no-unsupported-features/node-builtins": [
        "error",
        { version: ">=24.0.0" },
      ],
      "n/no-unsupported-features/es-syntax": ["error", { version: ">=24.0.0" }],
    },
  },

  // Unicorn adjustments
  {
    rules: {
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-null": "off",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "unicorn/no-array-callback-reference": "off",
      // Effect uses Data.TaggedError() pattern without `new`
      "unicorn/throw-new-error": "off",
    },
  },

  // Security rules
  {
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "warn",
    },
  },

  // Format des annotations de dette — Phase 12.1. Impose la forme
  // `TODO(owner, YYYY-MM-DD)` : une annotation doit porter un responsable
  // et une date pour ne pas devenir une dette anonyme et sans échéance.
  // La règle core `no-warning-comments` ne sait pas vérifier un format par
  // regex ; on contourne en flaguant les formes NUES (`todo:`, `todo `
  // suivi d'espace, idem fixme) — la forme conforme `TODO(owner, date)`
  // est suivie d'une parenthèse, donc ne matche aucun de ces termes et
  // passe. `location: "anywhere"` capture aussi celles en milieu de ligne.
  {
    rules: {
      "no-warning-comments": [
        "error",
        {
          terms: ["todo:", "todo ", "fixme:", "fixme ", "xxx", "hack"],
          location: "anywhere",
        },
      ],
    },
  },

  // Code Quality
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["warn", 15],
    },
  },
];

/** @type {import('typescript-eslint').ConfigArray} */
export const prettierConfig = [prettier];

export { tseslint };
