/**
 * REDCap connectivity test commands.
 *
 * Provides functionality to test REDCap API connectivity by running
 * a series of sequential tests against the configured endpoint.
 *
 * @module
 */

import { Effect } from 'effect';
import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  type RedcapClient,
} from '../../redcap/index.js';
import {
  type CliContext,
  type StepStatus,
  log,
  outputJson,
  ExitCode,
  pc,
} from '../shared/index.js';

/**
 * Result of a single connectivity test.
 */
export interface TestResult {
  readonly name: string;
  readonly status: 'ok' | 'error';
  readonly latencyMs?: number;
  readonly message?: string;
}

/**
 * Configuration for running REDCap tests.
 */
export interface TestConfig {
  /** REDCap API URL */
  readonly url: string;
  /** REDCap API token */
  readonly token: string;
  /** CLI context for output handling */
  readonly ctx: CliContext;
}

/**
 * JSON output format for test results.
 */
interface TestResultsJson {
  readonly url: string;
  readonly results: readonly TestResult[];
  readonly success: boolean;
}

/**
 * Measures the execution time of an async function.
 */
const measureLatency = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> => {
  const start = performance.now();
  const result = await fn();
  return { result, latencyMs: Math.round(performance.now() - start) };
};

/**
 * Tests REDCap version endpoint.
 */
const testVersion = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.getVersion())
    );
    return { name: 'Version', status: 'ok', latencyMs, message: result };
  } catch (e) {
    return {
      name: 'Version',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

/**
 * Tests REDCap project info endpoint.
 */
const testProjectInfo = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.getProjectInfo())
    );
    return { name: 'Project Info', status: 'ok', latencyMs, message: result.project_title };
  } catch (e) {
    return {
      name: 'Project Info',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

/**
 * Tests REDCap instruments endpoint.
 */
const testInstruments = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.getInstruments())
    );
    return {
      name: 'Instruments',
      status: 'ok',
      latencyMs,
      message: `${String(result.length)} instrument(s)`,
    };
  } catch (e) {
    return {
      name: 'Instruments',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

/**
 * Tests REDCap fields endpoint.
 */
const testFields = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() => Effect.runPromise(client.getFields()));
    return {
      name: 'Fields',
      status: 'ok',
      latencyMs,
      message: `${String(result.length)} field(s)`,
    };
  } catch (e) {
    return {
      name: 'Fields',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

/**
 * Tests REDCap records export endpoint.
 */
const testRecords = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.exportRecords())
    );
    return {
      name: 'Records',
      status: 'ok',
      latencyMs,
      message: `${String(result.length)} record(s)`,
    };
  } catch (e) {
    return {
      name: 'Records',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

/**
 * Runs REDCap connectivity tests.
 *
 * Performs sequential tests against a REDCap instance:
 * 1. Version - Tests basic API connectivity
 * 2. Project Info - Tests project access
 * 3. Instruments - Tests instrument metadata access
 * 4. Fields - Tests field metadata access
 * 5. Records - Tests data export access
 *
 * @param config - Test configuration including URL, token, and CLI context
 * @returns Exit code (0 for success, 1 for test failures, 2 for config errors)
 *
 * @example
 * ```typescript
 * const ctx = createCliContext({ ci: false });
 * const exitCode = await runTests({
 *   url: 'https://redcap.example.com/api',
 *   token: 'your-api-token',
 *   ctx,
 * });
 * process.exit(exitCode);
 * ```
 */
export const runTests = async (config: TestConfig): Promise<ExitCode> => {
  const { url, token, ctx } = config;

  log.info(ctx, `Testing REDCap at ${url}`);
  log.message(ctx, '');

  let client: RedcapClient;
  try {
    client = createRedcapClient({
      url: RedcapUrl(url),
      token: RedcapToken(token),
    });
  } catch (e) {
    if (ctx.json) {
      outputJson(ctx, { error: 'Invalid configuration', details: String(e) });
    } else {
      log.error(ctx, `Invalid configuration: ${String(e)}`);
    }
    return ExitCode.InvalidConfig;
  }

  const results: TestResult[] = [];

  // Run tests sequentially
  results.push(await testVersion(client));
  results.push(await testProjectInfo(client));
  results.push(await testInstruments(client));
  results.push(await testFields(client));
  results.push(await testRecords(client));

  const hasError = results.some((r) => r.status === 'error');

  if (ctx.json) {
    const jsonOutput: TestResultsJson = {
      url,
      results,
      success: !hasError,
    };
    outputJson(ctx, jsonOutput);
  } else {
    for (const r of results) {
      const status: StepStatus = r.status;
      log.step(ctx, r.name, status, r.latencyMs);
      if (r.message) {
        log.message(ctx, `     ${pc.dim(r.message)}`);
      }
    }

    log.message(ctx, '');
    if (hasError) {
      log.error(ctx, 'Some tests failed');
    } else {
      log.success(ctx, 'All tests passed');
    }
  }

  return hasError ? ExitCode.Error : ExitCode.Success;
};
