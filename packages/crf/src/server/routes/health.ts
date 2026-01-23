import { Hono } from 'hono';
import { Effect, pipe } from 'effect';
import { redcap } from '../redcap.js';

interface HealthCheck {
  readonly name: string;
  readonly status: 'ok' | 'degraded' | 'error';
  readonly latencyMs?: number;
  readonly message?: string;
}

const LATENCY_SAMPLES = 3;

const measureLatency = async <T>(
  fn: () => Promise<T>,
  samples: number = LATENCY_SAMPLES
): Promise<{ readonly result: T; readonly latencyMs: number }> => {
  const times: number[] = [];
  let result: T | undefined;

  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    result = await fn();
    times.push(performance.now() - start);
  }

  const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
  return { result: result as T, latencyMs: Math.round(avgLatency) };
};

const checkRedcapServer = async (): Promise<{
  readonly check: HealthCheck;
  readonly version?: string;
}> => {
  const program = pipe(
    redcap.getVersion(),
    Effect.map((version) => ({ version }))
  );

  try {
    const { result, latencyMs } = await measureLatency(() => Effect.runPromise(program));

    return {
      check: {
        name: 'redcap',
        status: latencyMs > 2000 ? 'degraded' : 'ok',
        latencyMs,
        ...(latencyMs > 2000 ? { message: 'High latency detected' } : {}),
      },
      version: result.version,
    };
  } catch (error) {
    return {
      check: {
        name: 'redcap',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect to REDCap server',
      },
    };
  }
};

const checkToken = async (): Promise<{
  readonly check: HealthCheck;
  readonly project?: { readonly title: string; readonly id: number };
}> => {
  try {
    const { result, latencyMs } = await measureLatency(() =>
      Effect.runPromise(redcap.getProjectInfo())
    );

    return {
      check: { name: 'token', status: 'ok', latencyMs },
      project: { title: result.project_title, id: result.project_id },
    };
  } catch (error) {
    return {
      check: {
        name: 'token',
        status: 'error',
        message: error instanceof Error ? error.message : 'Invalid or expired token',
      },
    };
  }
};

const computeOverallStatus = (checks: readonly HealthCheck[]): 'ok' | 'degraded' | 'error' =>
  checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'degraded')
      ? 'degraded'
      : 'ok';

const getStatusCode = (status: 'ok' | 'degraded' | 'error'): 200 | 503 =>
  status === 'error' ? 503 : 200;

export const health = new Hono();

health.get('/', (c) => c.json({ status: 'ok' }));

health.get('/detailed', async (c) => {
  const redcapResult = await checkRedcapServer();

  const tokenResult =
    redcapResult.check.status === 'error'
      ? {
          check: {
            name: 'token',
            status: 'error' as const,
            message: 'Skipped - REDCap unreachable',
          },
        }
      : await checkToken();

  const checks = [redcapResult.check, tokenResult.check];

  const response = {
    status: computeOverallStatus(checks),
    timestamp: new Date().toISOString(),
    checks: {
      redcap: redcapResult.check,
      token: tokenResult.check,
    },
    ...(redcapResult.version !== undefined && tokenResult.project !== undefined
      ? {
          redcap: {
            version: redcapResult.version,
            project: tokenResult.project.title,
            projectId: tokenResult.project.id,
          },
        }
      : {}),
  };

  return c.json(response, getStatusCode(response.status));
});
