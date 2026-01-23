import { Effect, pipe } from 'effect';
import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
  type RedcapClient,
} from '../../redcap/index.js';
import { log } from '../shared/terminal.js';

interface TestResult {
  readonly name: string;
  readonly status: 'ok' | 'error';
  readonly latencyMs?: number;
  readonly message?: string;
}

const measureLatency = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> => {
  const start = performance.now();
  const result = await fn();
  return { result, latencyMs: Math.round(performance.now() - start) };
};

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

const testInstruments = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.getInstruments())
    );
    return {
      name: 'Instruments',
      status: 'ok',
      latencyMs,
      message: `${result.length} instrument(s)`,
    };
  } catch (e) {
    return {
      name: 'Instruments',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

const testFields = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() => Effect.runPromise(client.getFields()));
    return { name: 'Fields', status: 'ok', latencyMs, message: `${result.length} field(s)` };
  } catch (e) {
    return {
      name: 'Fields',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

const testRecords = async (client: RedcapClient): Promise<TestResult> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(client.exportRecords())
    );
    return { name: 'Records', status: 'ok', latencyMs, message: `${result.length} record(s)` };
  } catch (e) {
    return {
      name: 'Records',
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error',
    };
  }
};

export interface TestConfig {
  readonly url: string;
  readonly token: string;
  readonly jsonOutput?: boolean;
}

export const runTests = async (config: TestConfig): Promise<void> => {
  const { url, token, jsonOutput = false } = config;

  if (!jsonOutput) {
    log.info(`Testing REDCap at ${url}`);
    console.log();
  }

  let client: RedcapClient;
  try {
    client = createRedcapClient({
      url: RedcapUrl(url),
      token: RedcapToken(token),
    });
  } catch (e) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: 'Invalid configuration', details: String(e) }));
    } else {
      log.error(`Invalid configuration: ${String(e)}`);
    }
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Run tests sequentially
  results.push(await testVersion(client));
  results.push(await testProjectInfo(client));
  results.push(await testInstruments(client));
  results.push(await testFields(client));
  results.push(await testRecords(client));

  if (jsonOutput) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    for (const r of results) {
      log.step(r.name, r.status, r.latencyMs);
      if (r.message) {
        console.log(`     ${r.message}`);
      }
    }

    console.log();
    const hasError = results.some((r) => r.status === 'error');
    if (hasError) {
      log.error('Some tests failed');
      process.exit(1);
    } else {
      log.success('All tests passed');
    }
  }
};
