import { typescript } from "@univ-lehavre/atlas-shared-config/eslint";

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    architectureCategory: "packages",
  }),
  {
    // `cache.ts` résout un chemin de cache par remontée de répertoires et parse
    // du JSON de façon tolérante (retour `null` plutôt qu'exception). Ce sont des
    // opérations impératives (remontée, try-catch) que le preset fonctionnel
    // strict refuse. Même dérogation ciblée que `atlas-stats`, qui implémente le
    // même mécanisme d'indirection de cache (ADR 0040).
    files: ["src/cache.ts"],
    rules: {
      "functional/no-conditional-statements": "off",
      "functional/no-expression-statements": "off",
      "functional/no-let": "off",
      "functional/no-loop-statements": "off",
      "functional/immutable-data": "off",
      "functional/no-try-statements": "off",
      "unicorn/no-negated-condition": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
];
