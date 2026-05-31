import { typescript } from "@univ-lehavre/atlas-shared-config/eslint";

export default [
  ...typescript({
    tsconfigRootDir: import.meta.dirname,
    architectureCategory: "packages",
  }),
  {
    // eslint-plugin-import-x's legacy resolver crashes when it tries to
    // walk msw's CommonJS exports map (see ESLint stack with
    // `requireResolver` / `legacy-resolver-settings`). Cycle detection is
    // irrelevant for test files anyway, which have no production import
    // graph to protect.
    files: ["**/*.spec.ts", "**/*.test.ts", "tests/**/*.ts"],
    rules: {
      "import-x/no-cycle": "off",
    },
  },
];
