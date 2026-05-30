import { typescript } from "@univ-lehavre/atlas-shared-config/eslint";

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    architectureCategory: "packages",
  }),
  {
    files: ["src/**/*.ts"],
    rules: {
      // Test helpers are imperative and may build mutable mock objects.
      "functional/no-throw-statements": "off",
      "functional/no-try-statements": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-expression-statements": "off",
      "functional/no-let": "off",
      "functional/immutable-data": "off",
      "functional/no-mixed-types": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  },
];
