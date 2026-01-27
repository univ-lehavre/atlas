# AI-Powered Automated Testing Agent

## Overview

This directory contains the AI-powered automated testing agent for the AMARRE project. The agent is designed to ensure comprehensive test coverage, detect drift in application behavior, and facilitate non-regression testing.

## Features

### 1. **Drift Detection** 🎯

Automatically detect unintended changes in:

- API response structures and schemas
- Performance characteristics
- Data formats and types
- Error handling behavior

### 2. **Non-Regression Testing** ✅

- Run comprehensive test suites on every change
- Compare against established baselines
- Identify breaking changes early
- Track test success rates over time

### 3. **Test Coverage Analysis** 📊

- Monitor code coverage metrics
- Identify untested code paths
- Generate actionable recommendations
- Track coverage trends

### 4. **CI/CD Integration** 🔄

- Automated testing in GitHub Actions
- Coverage reports as artifacts
- Baseline validation on PRs
- Smart test execution

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Drift Detection

```bash
# Initialize baselines for first-time setup
npm run test:baseline-init

# List all available baselines
npm run test:baseline-list

# Validate baselines against current version
npm run test:baseline-validate
```

### Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage-report
```

## Architecture

### Components

1. **Drift Detector** (`tests/utils/drift-detector.ts`)
   - Core utility for detecting behavioral drift
   - Supports API, performance, and schema comparisons
   - Configurable sensitivity and thresholds

2. **Baseline Manager** (`scripts/manage-baselines.ts`)
   - Manages test baselines for drift detection
   - Tracks versions and timestamps
   - Easy baseline updates and validation

3. **Coverage Analyzer** (`scripts/analyze-test-coverage.ts`)
   - Analyzes test coverage metrics
   - Identifies low-coverage files
   - Generates improvement recommendations

4. **Integration Tests** (`tests/integration/`)
   - End-to-end testing scenarios
   - Real-world drift detection examples
   - API contract validation

## Test Structure

```
tests/
├── baselines/              # Baseline data for drift detection
│   ├── .gitkeep
│   └── *.baseline.json     # Version-tracked baselines
├── integration/            # Integration and E2E tests
│   └── drift-detection.test.ts
├── lib/                    # Library/utility tests
├── routes/                 # API route tests
├── server/                 # Server-side logic tests
└── utils/                  # Test utilities
    ├── drift-detector.ts
    └── drift-detector.test.ts
```

## Usage Examples

### Example 1: Detecting API Drift

```typescript
import { DriftDetector } from '../utils/drift-detector';

const detector = new DriftDetector();

// First run - establishes baseline
const response1 = { status: 'ok', data: { id: 1 } };
detector.checkApiDrift('my-endpoint', response1);

// Later - detects changes
const response2 = { status: 'ok', data: { id: 1, newField: 'value' } };
const result = detector.checkApiDrift('my-endpoint', response2);

if (result.hasDrift) {
  console.log('Drift detected!', result.driftDetails);
}
```

### Example 2: Performance Monitoring

```typescript
const detector = new DriftDetector();

const start = Date.now();
await myApiCall();
const duration = Date.now() - start;

const result = detector.checkPerformanceDrift('my-operation', duration, 20);
// Alerts if performance degrades by more than 20%
```

### Example 3: Using in Tests

```typescript
describe('API Tests', () => {
  it('should maintain response structure', async () => {
    const response = await fetch('/api/endpoint');
    const data = await response.json();

    const detector = new DriftDetector();
    const result = detector.checkApiDrift('endpoint-response', data);

    expect(result.hasDrift).toBe(false);
  });
});
```

## Configuration

### Coverage Thresholds

Default thresholds are defined in `scripts/analyze-test-coverage.ts`:

- Statements: 80%
- Branches: 70%
- Functions: 80%
- Lines: 80%

### Drift Detection Settings

Configure drift detection sensitivity:

```typescript
// Strict mode - detects value changes
detector.checkApiDrift('endpoint', data, { strictMode: true });

// Custom performance threshold (30%)
detector.checkPerformanceDrift('operation', duration, 30);
```

## CI/CD Integration

The agent runs automatically in CI:

1. **On Push/PR**:
   - Runs all tests
   - Generates coverage reports
   - Validates against baselines
2. **Artifacts**:
   - Test coverage reports
   - Baseline snapshots
   - Test results

3. **Alerts**:
   - Failed tests block merge
   - Coverage drops trigger warnings
   - Drift detection findings reported

## Best Practices

### 1. Writing Tests

- **Isolate Tests**: Each test should be independent
- **Clear Names**: Use descriptive test names
- **Mock External Deps**: Use `vi.mock()` for external services
- **Test Edge Cases**: Cover boundary conditions

### 2. Managing Baselines

- **Update Intentionally**: Only update baselines for intentional changes
- **Review Changes**: Always review baseline diffs before committing
- **Version Track**: Baselines are tied to app versions
- **Document Updates**: Explain why baselines changed

### 3. Coverage Goals

- **Prioritize Critical Paths**: Focus on business-critical code
- **Test Error Paths**: Don't forget error handling
- **Integration Over Unit**: Balance unit and integration tests
- **Quality Over Quantity**: Meaningful tests > high coverage

## Maintenance

### Updating Baselines

When making intentional API changes:

```bash
# 1. Make your changes
# 2. Update the affected baselines
npm run test:baseline-init

# 3. Review the changes
git diff tests/baselines/

# 4. Commit if correct
git add tests/baselines/
git commit -m "Update baselines for API v2"
```

### Adding New Tests

1. Create test file: `tests/[category]/[feature].test.ts`
2. Follow existing patterns
3. Run tests: `npm test`
4. Check coverage: `npm run test:coverage`

### Troubleshooting

**Tests failing with "baseline not found":**

```bash
npm run test:baseline-init
```

**Coverage too low:**

```bash
npm run test:coverage-report  # Shows which files need tests
```

**Performance test flaky:**

- Increase threshold
- Run multiple times and average
- Consider using mocks

## Future Enhancements

Planned features:

- [ ] Visual regression testing with Playwright
- [ ] Mutation testing for test quality
- [ ] AI-powered test generation
- [ ] Smart test selection (run only affected tests)
- [ ] Automated test repair
- [ ] Load testing integration
- [ ] Cross-browser E2E testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [SvelteKit Testing Guide](https://kit.svelte.dev/docs/testing)

## Support

For issues or questions:

1. Check the [automated-testing.agent.md](.github/agents/automated-testing.agent.md)
2. Review existing tests for examples
3. Create an issue with the `testing` label

---

**Maintained by**: AMARRE Development Team  
**Last Updated**: December 2024
