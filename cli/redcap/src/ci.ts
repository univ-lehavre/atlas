/* eslint-disable functional/no-expression-statements, functional/no-conditional-statements, functional/no-loop-statements, functional/immutable-data -- CI mode requires imperative code */
/**
 * CI mode for REDCap CLI - non-interactive test runner
 */

import { Effect, Console } from 'effect';
import { style, format, icon } from './terminal.js';
import { RedcapService, type HealthResponse, type Field } from './services.js';

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  readonly name: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

interface CiOutput {
  success: boolean;
  timestamp: string;
  tests: TestResult[];
}

// ============================================================================
// Helpers
// ============================================================================

const groupFieldsByForm = (fields: readonly Field[]): Record<string, readonly Field[]> => {
  const result: Record<string, Field[]> = {};
  for (const field of fields) {
    const existing = result[field.form];
    result[field.form] = existing === undefined ? [field] : [...existing, field];
  }
  return result;
};

// ============================================================================
// Test Runners
// ============================================================================

const runServiceTest = (): Effect.Effect<TestResult, never, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const result = yield* service.checkService().pipe(
      Effect.map((ok) => ({
        name: 'service',
        success: ok,
        data: { reachable: ok },
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          name: 'service',
          success: false,
          error: String(error),
        })
      )
    );
    return result;
  });

const runHealthTest = (): Effect.Effect<TestResult, never, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const result = yield* service.getHealth().pipe(
      Effect.map((health) => ({
        name: 'health',
        success: health.status !== 'error',
        data: health,
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          name: 'health',
          success: false,
          error: String(error),
        })
      )
    );
    return result;
  });

const runProjectTest = (health: HealthResponse | null): Effect.Effect<TestResult> =>
  Effect.succeed(
    health?.redcap === undefined
      ? {
          name: 'project',
          success: false,
          error: 'Project info not available',
        }
      : {
          name: 'project',
          success: true,
          data: {
            version: health.redcap.version,
            name: health.redcap.project,
            id: health.redcap.projectId,
          },
        }
  );

const runInstrumentsTest = (health: HealthResponse | null): Effect.Effect<TestResult> =>
  Effect.succeed(
    health?.instruments === undefined
      ? {
          name: 'instruments',
          success: false,
          error: 'Instruments not available',
        }
      : {
          name: 'instruments',
          success: true,
          data: health.instruments,
        }
  );

const runFieldsTest = (health: HealthResponse | null): Effect.Effect<TestResult> =>
  Effect.succeed(
    health?.fields === undefined
      ? {
          name: 'fields',
          success: false,
          error: 'Fields not available',
        }
      : {
          name: 'fields',
          success: true,
          data: groupFieldsByForm(health.fields),
        }
  );

const runRecordsTest = (): Effect.Effect<TestResult, never, RedcapService> =>
  Effect.gen(function* () {
    const service = yield* RedcapService;
    const result = yield* service.getRecords().pipe(
      Effect.map((records) => ({
        name: 'records',
        success: true,
        data: records,
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          name: 'records',
          success: false,
          error: String(error),
        })
      )
    );
    return result;
  });

// ============================================================================
// Output Formatters
// ============================================================================

const displayTestResult = (result: TestResult): Effect.Effect<void> => {
  const statusIcon = result.success ? icon.success : icon.error;
  const status = result.success ? style.green('PASS') : style.red('FAIL');
  const errorMsg = result.error === undefined ? '' : ` - ${style.dim(result.error)}`;

  return Console.log(`  ${statusIcon} ${result.name.padEnd(12)} ${status}${errorMsg}`);
};

const displayJsonOutput = (output: CiOutput): Effect.Effect<void> =>
  Console.log(JSON.stringify(output, null, 2));

const displayNormalOutput = (output: CiOutput): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Console.log(style.bold('\n🔬 REDCap CI Test Results\n'));
    yield* Console.log(`Timestamp: ${style.dim(output.timestamp)}`);
    yield* Console.log('');

    for (const test of output.tests) {
      yield* displayTestResult(test);
    }

    yield* Console.log('');

    const passed = output.tests.filter((t) => t.success).length;
    const total = output.tests.length;
    const summary = output.success
      ? format.success(`All tests passed (${String(passed)}/${String(total)})`)
      : format.error(`Some tests failed (${String(passed)}/${String(total)} passed)`);

    yield* Console.log(summary);
  });

// ============================================================================
// Main CI Runner
// ============================================================================

export const runCiMode = (jsonOutput: boolean): Effect.Effect<void, never, RedcapService> =>
  Effect.gen(function* () {
    const tests: TestResult[] = [];

    // Run service test
    const serviceResult = yield* runServiceTest();
    tests.push(serviceResult);

    // Run health test
    const healthResult = yield* runHealthTest();
    tests.push(healthResult);

    // Extract health data for dependent tests
    const health = healthResult.success ? (healthResult.data as HealthResponse) : null;

    // Run dependent tests
    const projectResult = yield* runProjectTest(health);
    tests.push(projectResult);

    const instrumentsResult = yield* runInstrumentsTest(health);
    tests.push(instrumentsResult);

    const fieldsResult = yield* runFieldsTest(health);
    tests.push(fieldsResult);

    const recordsResult = yield* runRecordsTest();
    tests.push(recordsResult);

    // Build output
    const output: CiOutput = {
      success: tests.every((t) => t.success),
      timestamp: new Date().toISOString(),
      tests,
    };

    // Display results
    yield* jsonOutput ? displayJsonOutput(output) : displayNormalOutput(output);

    // Exit with error code if any test failed
    if (!output.success) {
      yield* Effect.fail(new Error('Some tests failed'));
    }
  }).pipe(Effect.catchAll(() => Effect.void));
/* eslint-enable functional/no-expression-statements, functional/no-conditional-statements, functional/no-loop-statements, functional/immutable-data */
