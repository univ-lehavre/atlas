/* eslint-disable functional/no-let, functional/no-expression-statements, functional/immutable-data, functional/no-try-statements, functional/no-loop-statements, functional/no-conditional-statements, @typescript-eslint/strict-boolean-expressions -- Health check requires imperative code for latency measurements */
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Effect, pipe } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet as netCheckInternet,
  type DiagnosticStep,
  type DiagnosticResult,
} from '@univ-lehavre/atlas-net';
import { redcap } from '../redcap.js';
import { env } from '../env.js';

const LATENCY_SAMPLES = 3;
const CONNECTIVITY_CHECK_URL = 'https://www.google.com';

interface HealthCheck {
  readonly name: string;
  readonly status: 'ok' | 'degraded' | 'error';
  readonly latencyMs?: number;
  readonly message?: string;
}

interface InstrumentInfo {
  readonly name: string;
  readonly label: string;
}

interface FieldInfo {
  readonly name: string;
  readonly form: string;
  readonly type: string;
  readonly label: string;
}

interface RedcapCheckResult {
  readonly check: HealthCheck;
  readonly version?: string;
}

interface TokenCheckResult {
  readonly check: HealthCheck;
  readonly project?: { readonly title: string; readonly id: number };
}

interface HealthResponse {
  readonly status: 'ok' | 'degraded' | 'error';
  readonly timestamp: string;
  readonly checks: {
    readonly redcap: HealthCheck;
    readonly token: HealthCheck;
    readonly internet?: HealthCheck;
  };
  readonly redcap?: {
    readonly version: string;
    readonly project: string;
    readonly projectId: number;
  };
  readonly instruments?: readonly InstrumentInfo[];
  readonly fields?: readonly FieldInfo[];
}

/**
 * Measure latency of an async function over multiple samples
 * @param fn - The async function to measure
 * @param samples - Number of samples to take
 * @returns Promise with result and average latency in ms
 */
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

/**
 * Check internet connectivity
 * @returns Promise with HealthCheck result
 */
const checkInternet = async (): Promise<HealthCheck> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();
    await fetch(CONNECTIVITY_CHECK_URL, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    return { name: 'internet', status: 'ok', latencyMs };
  } catch {
    return { name: 'internet', status: 'error', message: 'No internet connectivity' };
  }
};

/**
 * Check REDCap server connectivity and get version
 * @returns Promise with RedcapCheckResult
 */
const checkRedcapServer = async (): Promise<RedcapCheckResult> => {
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

/**
 * Validate API token by fetching project info
 * @returns Promise with TokenCheckResult
 */
const checkToken = async (): Promise<TokenCheckResult> => {
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

/**
 * Fetch instruments list
 * @returns Promise with instruments or null on error
 */
const fetchInstruments = async (): Promise<readonly InstrumentInfo[] | null> => {
  try {
    const instruments = await Effect.runPromise(redcap.getInstruments());
    return instruments.map((i) => ({ name: i.instrument_name, label: i.instrument_label }));
  } catch {
    return null;
  }
};

/**
 * Fetch fields list (simplified)
 * @returns Promise with fields or null on error
 */
const fetchFields = async (): Promise<readonly FieldInfo[] | null> => {
  try {
    const fields = await Effect.runPromise(redcap.getFields());
    return fields.map((f) => ({
      name: f.field_name,
      form: f.form_name,
      type: f.field_type,
      label: f.field_label,
    }));
  } catch {
    return null;
  }
};

/**
 * Compute overall status from individual checks
 * @param checks - Array of health checks
 * @returns Overall status
 */
const computeOverallStatus = (checks: readonly HealthCheck[]): 'ok' | 'degraded' | 'error' =>
  checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'degraded')
      ? 'degraded'
      : 'ok';

/**
 * Get HTTP status code for health response
 * @param status - Health status
 * @returns HTTP status code
 */
const getStatusCode = (status: 'ok' | 'degraded' | 'error'): 200 | 503 =>
  status === 'error' ? 503 : 200;

/**
 * Convert HealthCheck to DiagnosticStep
 * Maps 'degraded' status to 'ok' (since DiagnosticStatus doesn't have 'degraded')
 */
const toDiagnosticStep = (check: HealthCheck): DiagnosticStep => ({
  name: check.name,
  status: check.status === 'degraded' ? 'ok' : check.status,
  latencyMs: check.latencyMs,
  message: check.message,
});

export const health = new Hono();

/**
 * Simple health check (fast, for load balancers)
 */
health.get('/', (c) => c.json({ status: 'ok' }));

/**
 * Detailed health check with REDCap connectivity
 */
health.get('/detailed', async (c) => {
  // Check REDCap server
  const redcapResult = await checkRedcapServer();

  // If REDCap fails, check internet to diagnose
  const internetCheck = redcapResult.check.status === 'error' ? await checkInternet() : null;

  // Check token (only if server is reachable)
  const tokenResult: TokenCheckResult =
    redcapResult.check.status === 'error'
      ? {
          check: { name: 'token', status: 'error', message: 'Skipped - REDCap server unreachable' },
        }
      : await checkToken();

  // Fetch instruments and fields (only if token is valid)
  const [instruments, fields] =
    tokenResult.check.status === 'ok'
      ? await Promise.all([fetchInstruments(), fetchFields()])
      : [null, null];

  // Build checks array
  const checks: readonly HealthCheck[] =
    internetCheck === null
      ? [redcapResult.check, tokenResult.check]
      : [redcapResult.check, tokenResult.check, internetCheck];

  // Build response
  const response: HealthResponse = {
    status: computeOverallStatus(checks),
    timestamp: new Date().toISOString(),
    checks: {
      redcap: redcapResult.check,
      token: tokenResult.check,
      ...(internetCheck === null ? {} : { internet: internetCheck }),
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
    ...(instruments === null ? {} : { instruments }),
    ...(fields === null ? {} : { fields }),
  };

  return c.json(response, getStatusCode(response.status));
});

/**
 * Network diagnostics via Server-Sent Events
 * Progressive diagnostic checks: DNS → TCP → TLS → HTTP → REDCap → Token → API
 */
health.get('/diagnose', (c) => {
  return streamSSE(c, async (stream) => {
    const steps: DiagnosticStep[] = [];

    const sendStep = async (step: DiagnosticStep): Promise<void> => {
      steps.push(step);
      await stream.writeSSE({
        event: 'step',
        data: JSON.stringify(step),
      });
    };

    const url = new URL(env.redcapApiUrl);
    const port = url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
    const isHttps = url.protocol === 'https:';

    // Step 1: DNS Resolution
    const dnsStep = await Effect.runPromise(dnsResolve(url.hostname));
    await sendStep(dnsStep);

    if (dnsStep.status === 'error') {
      const internetStep = await Effect.runPromise(netCheckInternet());
      await sendStep(internetStep);
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ steps, overallStatus: 'error' } satisfies DiagnosticResult),
      });
      return;
    }

    // Step 2: TCP Connect
    const tcpStep = await Effect.runPromise(tcpPing(url.hostname, port, { name: 'TCP Connect' }));
    await sendStep(tcpStep);

    if (tcpStep.status === 'error') {
      const internetStep = await Effect.runPromise(netCheckInternet());
      await sendStep(internetStep);
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ steps, overallStatus: 'error' } satisfies DiagnosticResult),
      });
      return;
    }

    // Step 3: TLS Handshake (HTTPS only)
    if (isHttps) {
      const tlsStep = await Effect.runPromise(tlsHandshake(url.hostname, port));
      await sendStep(tlsStep);

      if (tlsStep.status === 'error') {
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({ steps, overallStatus: 'error' } satisfies DiagnosticResult),
        });
        return;
      }
    }

    // Step 4: REDCap Version (tests HTTP + REDCap connectivity)
    const redcapResult = await checkRedcapServer();
    await sendStep(toDiagnosticStep(redcapResult.check));

    if (redcapResult.check.status === 'error') {
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ steps, overallStatus: 'error' } satisfies DiagnosticResult),
      });
      return;
    }

    // Step 5: Token validation
    const tokenResult = await checkToken();
    await sendStep(toDiagnosticStep(tokenResult.check));

    if (tokenResult.check.status === 'error') {
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ steps, overallStatus: 'partial' } satisfies DiagnosticResult),
      });
      return;
    }

    // Step 6: API Access (instruments)
    const instruments = await fetchInstruments();
    const apiStep: DiagnosticStep = {
      name: 'API Access',
      status: instruments === null ? 'error' : 'ok',
      message:
        instruments === null
          ? 'Failed to fetch instruments'
          : `${String(instruments.length)} instruments`,
    };
    await sendStep(apiStep);

    const hasError = steps.some((s) => s.status === 'error');
    await stream.writeSSE({
      event: 'done',
      data: JSON.stringify({
        steps,
        overallStatus: hasError ? 'partial' : 'ok',
      } satisfies DiagnosticResult),
    });
  });
});
/* eslint-enable functional/no-let, functional/no-expression-statements, functional/immutable-data, functional/no-try-statements, functional/no-loop-statements, functional/no-conditional-statements, @typescript-eslint/strict-boolean-expressions */
