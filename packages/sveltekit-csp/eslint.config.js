import { typescript } from "@univ-lehavre/atlas-shared-config/eslint";

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    architectureCategory: "packages",
  }),
  // The CSP/security helpers manipulate header objects imperatively
  // (response.headers.set) and build a merged directives object via
  // local mutable accumulators before returning a readonly view.
  {
    files: ["src/**/*.ts"],
    rules: {
      "functional/no-let": "off",
      "functional/immutable-data": "off",
      "functional/no-expression-statements": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-return-void": "off",
    },
  },
];
