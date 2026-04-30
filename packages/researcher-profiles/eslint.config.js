import { typescript } from "@univ-lehavre/atlas-shared-config/eslint";

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    architectureCategory: "packages",
    workspaceModules: [
      "@univ-lehavre/atlas-redcap-client",
      "@univ-lehavre/atlas-fetch-openalex",
      "@univ-lehavre/atlas-openalex-types",
    ],
  }),
  // Computational/mathematical services need reduce and mutable accumulators
  {
    files: [
      "src/services/scorer.ts",
      "src/services/tfidf-profile.ts",
      "src/services/match-formatter.ts",
    ],
    rules: {
      "unicorn/no-array-reduce": "off",
      "functional/no-let": "off",
      "functional/no-conditional-statements": "off",
      "security/detect-object-injection": "off",
    },
  },
  // embedding-profile.ts uses an imperative singleton + sequential async loop
  {
    files: ["src/services/embedding-profile.ts"],
    rules: {
      "unicorn/no-array-reduce": "off",
      "functional/no-let": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-loop-statements": "off",
      "functional/no-expression-statements": "off",
      "functional/immutable-data": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "security/detect-object-injection": "off",
    },
  },
  // PDFKit uses an imperative/stateful API — relax functional rules for this file
  {
    files: ["src/services/pdf-generator.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-conditional-statements": "off",
      "functional/immutable-data": "off",
      "functional/no-loop-statements": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  // utils.ts uses imperative date manipulation
  {
    files: ["src/utils.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-conditional-statements": "off",
    },
  },
];
