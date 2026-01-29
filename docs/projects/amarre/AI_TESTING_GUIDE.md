# AI Testing Agent - Getting Started Guide

## What is the AI Testing Agent?

The AI Testing Agent is an automated testing system designed to:

- 🔍 **Detect drift** in application behavior automatically
- ✅ **Prevent regressions** by running comprehensive tests
- 📊 **Track coverage** and suggest improvements
- 🔄 **Integrate with CI/CD** for continuous validation

## Quick Start (5 Minutes)

### 1. Run Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch
```

### 2. Initialize Baselines (First Time Only)

```bash
# Create baseline snapshots for drift detection
npm run test:baseline-init

# Verify baselines were created
npm run test:baseline-list
```

### 3. Check Coverage

```bash
# Generate and view coverage report
npm run test:coverage
```

## Common Workflows

### Daily Development

When working on a feature:

```bash
# 1. Start test watcher
npm run test:watch

# 2. Make your changes
# 3. Watch tests auto-run
# 4. Fix any failures immediately
```

### Before Committing

Before pushing code:

```bash
# Run all quality checks
npm run check:all

# Or run individually:
npm run format:check  # Check code formatting
npm run lint          # Check for linting issues
npm test             # Run all tests
npm run build        # Ensure it builds
```

### After API Changes

When you modify API endpoints:

```bash
# 1. Update tests for the changes
npm test

# 2. Update baselines if structure changed intentionally
npm run test:baseline-init

# 3. Review the baseline changes
git diff tests/baselines/

# 4. Commit both code and baseline updates
git add tests/baselines/
git commit -m "Update API and baselines"
```

### Investigating Coverage

To improve test coverage:

```bash
# 1. Generate coverage report
npm run test:coverage-report

# 2. Look at the output for:
#    - Overall coverage percentages
#    - Files with low coverage
#    - Recommendations

# 3. Add tests for untested code
# 4. Re-run to verify improvement
```

## Understanding Drift Detection

### What is Drift?

Drift occurs when application behavior changes unintentionally, such as:

- API response structure changes
- Performance degradation
- Changed error messages
- Modified data formats

### How It Works

1. **First Run**: Creates baseline snapshots of expected behavior
2. **Subsequent Runs**: Compares current behavior to baselines
3. **Detection**: Alerts when differences are found
4. **Review**: You decide if changes are intentional or bugs

### Example: Detecting API Drift

```typescript
// In your test
import { DriftDetector } from '../utils/drift-detector';

describe('My API', () => {
  it('should maintain response structure', async () => {
    const response = await fetch('/api/my-endpoint');
    const data = await response.json();

    const detector = new DriftDetector();
    const result = detector.checkApiDrift('my-endpoint', data);

    // Fails if structure changed unexpectedly
    expect(result.hasDrift).toBe(false);
  });
});
```

## CI/CD Integration

The testing agent runs automatically in GitHub Actions:

### What Runs Automatically

On every push/PR:

- ✅ All unit tests
- ✅ Coverage analysis
- ✅ Baseline validation
- ✅ Linting and formatting

### Viewing Results

1. Go to GitHub Actions tab
2. Click on your workflow run
3. View "Unit tests" step for test results
4. Download coverage reports from artifacts

### What Blocks Merges

PRs are blocked if:

- ❌ Any test fails
- ❌ Build fails
- ❌ Critical drift detected

## Advanced Usage

### Custom Drift Detection

```typescript
const detector = new DriftDetector();

// API drift with strict value checking
const result = detector.checkApiDrift('endpoint', data, {
  strictMode: true, // Also checks values, not just structure
});

// Performance drift with custom threshold
const perfResult = detector.checkPerformanceDrift(
  'operation',
  duration,
  30 // Alert if >30% slower
);
```

### Managing Baselines

```bash
# List all baselines
npm run test:baseline-list

# Validate against current version
npm run test:baseline-validate

# Manually update a specific baseline (in code)
const detector = new DriftDetector();
detector.updateBaseline('my-endpoint', newData);
```

### Coverage Analysis

```bash
# Run tests with coverage
npm run test:coverage

# Generate detailed analysis
npm run test:coverage-report

# View HTML report (if generated)
open coverage/index.html
```

## Troubleshooting

### "Baseline not found" Error

```bash
# Solution: Initialize baselines
npm run test:baseline-init
```

### Tests Pass Locally But Fail in CI

Common causes:

1. **Missing dependencies**: Ensure `package-lock.json` is committed
2. **Environment variables**: Check `.env` configuration
3. **Timing issues**: Increase timeouts for slow tests
4. **Baseline mismatch**: Commit updated baselines

### Coverage Too Low

```bash
# Identify low-coverage files
npm run test:coverage-report

# Focus on critical files first
# Add tests for:
# - Core business logic
# - API endpoints
# - Error handling paths
```

### Performance Test Flaking

```typescript
// Increase threshold for noisy tests
detector.checkPerformanceDrift('operation', duration, 50); // More lenient

// Or average multiple runs
const durations = await Promise.all([runTest(), runTest(), runTest()]);
const avgDuration = durations.reduce((a, b) => a + b) / 3;
detector.checkPerformanceDrift('operation', avgDuration);
```

## Best Practices

### ✅ Do's

- ✅ Write tests for all new features
- ✅ Update baselines when making intentional changes
- ✅ Run tests before pushing
- ✅ Keep tests fast and focused
- ✅ Use meaningful test names
- ✅ Mock external dependencies

### ❌ Don'ts

- ❌ Don't ignore failing tests
- ❌ Don't update baselines without reviewing changes
- ❌ Don't test implementation details
- ❌ Don't make tests dependent on each other
- ❌ Don't skip tests in CI
- ❌ Don't commit sensitive data in tests

## Getting Help

Need assistance?

1. **Documentation**: Check `tests/README.md` and `.github/agents/automated-testing.agent.md`
2. **Examples**: Review existing tests in `tests/` directory
3. **CI Logs**: Check GitHub Actions for detailed error messages
4. **Issues**: Create an issue with the `testing` label

## What's Next?

Planned enhancements:

- Visual regression testing
- AI-powered test generation
- Smart test selection
- Mutation testing
- Load testing integration

---

**Happy Testing! 🎉**

For questions or feedback, contact the AMARRE development team.
