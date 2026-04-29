const defaultReporter = process.env.CI ? 'text' : ['text', 'html', 'json'];

const defaultInclude = ['src/**/*.{ts,tsx,js,jsx}'];

const defaultExclude = [
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/*.a11y.test.{ts,tsx,js,jsx}',
  '**/*.a11y.spec.{ts,tsx,js,jsx}',
  '**/*.d.ts',
  '**/types.{ts,tsx,js,jsx}',
  '**/dist/**',
  '**/node_modules/**',
];

export function coverageConfig(options = {}) {
  const {
    include = defaultInclude,
    exclude = [],
    reporter = defaultReporter,
    ...overrides
  } = options;

  return {
    provider: 'v8',
    reporter,
    include,
    exclude: [...defaultExclude, ...exclude],
    ...overrides,
  };
}
