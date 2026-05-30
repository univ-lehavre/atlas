// 'json' est requis même en CI pour que `coverage-final.json` soit
// généré et lu par `scripts/audit/coverage-report.mjs`. 'html' reste
// désactivé en CI pour ne pas alourdir le runner avec des artefacts
// visualisation qui ne sortent pas du job.
const defaultReporter = process.env.CI
  ? ["text", "json"]
  : ["text", "html", "json"];

const defaultInclude = ["src/**/*.{ts,tsx,js,jsx}"];

const defaultExclude = [
  "**/*.test.{ts,tsx,js,jsx}",
  "**/*.spec.{ts,tsx,js,jsx}",
  "**/*.a11y.test.{ts,tsx,js,jsx}",
  "**/*.a11y.spec.{ts,tsx,js,jsx}",
  "**/*.d.ts",
  "**/types.{ts,tsx,js,jsx}",
  "**/dist/**",
  "**/node_modules/**",
];

export function coverageConfig(options = {}) {
  const {
    include = defaultInclude,
    exclude = [],
    reporter = defaultReporter,
    ...overrides
  } = options;

  return {
    provider: "v8",
    reporter,
    include,
    exclude: [...defaultExclude, ...exclude],
    ...overrides,
  };
}
