import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the NodeSDK so tests never spin up a real OpenTelemetry pipeline.
// `start` is a spy we can assert on; `shutdown` resolves so the SIGTERM/SIGINT
// flush hooks are safe to register. Declared via `vi.hoisted` because the
// `vi.mock` factory below is hoisted above normal top-level declarations.
const { sdkStart, NodeSDKMock } = vi.hoisted(() => {
  const start = vi.fn();
  const shutdown = vi.fn(() => Promise.resolve());
  // `new NodeSDK(...)` is called with `new`, so the mock must be usable as a
  // constructor — use a `function` implementation, not an arrow.
  const ctor = vi.fn(function NodeSDK(this: Record<string, unknown>) {
    this['start'] = start;
    this['shutdown'] = shutdown;
  });
  return { sdkStart: start, NodeSDKMock: ctor };
});

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: NodeSDKMock,
}));

// The exporters/processors are constructed eagerly inside `buildSpanProcessor`;
// stub them so no network/stdout side-effect happens during the test.
vi.mock('@opentelemetry/sdk-trace-base', () => ({
  SimpleSpanProcessor: vi.fn(function SimpleSpanProcessor(this: unknown, exporter: unknown) {
    return { exporter };
  }),
  ConsoleSpanExporter: vi.fn(function ConsoleSpanExporter(this: unknown) {
    return { kind: 'console' };
  }),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn(function OTLPTraceExporter(this: unknown) {
    return { kind: 'otlp' };
  }),
}));

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn((attrs: Record<string, unknown>) => ({ attrs })),
}));

import { isTelemetryEnabled, startTelemetry } from './telemetry.js';

describe('isTelemetryEnabled', () => {
  it('is disabled when nothing is configured', () => {
    expect(isTelemetryEnabled({})).toBe(false);
  });

  it('is enabled by a truthy OTEL_TRACES_ENABLED flag', () => {
    for (const value of ['1', 'true', 'yes', 'on', 'TRUE', ' On ']) {
      expect(isTelemetryEnabled({ OTEL_TRACES_ENABLED: value })).toBe(true);
    }
  });

  it('ignores a non-truthy OTEL_TRACES_ENABLED value', () => {
    expect(isTelemetryEnabled({ OTEL_TRACES_ENABLED: 'no' })).toBe(false);
    expect(isTelemetryEnabled({ OTEL_TRACES_ENABLED: '' })).toBe(false);
  });

  it('is enabled when an OTLP endpoint is set (generic or traces-specific)', () => {
    expect(isTelemetryEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://c:4318' })).toBe(true);
    expect(
      isTelemetryEnabled({ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://c:4318/v1/traces' })
    ).toBe(true);
  });

  it('is force-disabled by OTEL_SDK_DISABLED even when otherwise enabled', () => {
    expect(isTelemetryEnabled({ OTEL_TRACES_ENABLED: 'true', OTEL_SDK_DISABLED: 'true' })).toBe(
      false
    );
  });
});

describe('startTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('is a no-op (returns undefined, never builds the SDK) when disabled', () => {
    const sdk = startTelemetry({});
    expect(sdk).toBeUndefined();
    expect(NodeSDKMock).not.toHaveBeenCalled();
    expect(sdkStart).not.toHaveBeenCalled();
  });

  it('starts the SDK with the console processor when only the flag is set', () => {
    const sdk = startTelemetry({ OTEL_TRACES_ENABLED: '1' });
    expect(sdk).toBeDefined();
    expect(NodeSDKMock).toHaveBeenCalledTimes(1);
    expect(sdkStart).toHaveBeenCalledTimes(1);
  });

  it('starts the SDK with the OTLP processor when an endpoint is set', () => {
    const sdk = startTelemetry({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318' });
    expect(sdk).toBeDefined();
    expect(NodeSDKMock).toHaveBeenCalledTimes(1);
    expect(sdkStart).toHaveBeenCalledTimes(1);
  });

  it('honours custom service name and version', () => {
    startTelemetry({
      OTEL_TRACES_ENABLED: 'true',
      OTEL_SERVICE_NAME: 'custom-crf',
      OTEL_SERVICE_VERSION: '9.9.9',
    });
    const config = NodeSDKMock.mock.calls[0]?.[0] as {
      resource: { attrs: Record<string, string> };
    };
    const attrs = config.resource.attrs;
    expect(Object.values(attrs)).toContain('custom-crf');
    expect(Object.values(attrs)).toContain('9.9.9');
  });

  it('registers SIGTERM/SIGINT flush hooks when started', () => {
    const before = process.listenerCount('SIGTERM');
    startTelemetry({ OTEL_TRACES_ENABLED: '1' });
    expect(process.listenerCount('SIGTERM')).toBe(before + 1);
    expect(process.listenerCount('SIGINT')).toBeGreaterThanOrEqual(1);
  });
});
