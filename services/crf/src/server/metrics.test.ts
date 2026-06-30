import { describe, it, expect } from 'vitest';
import { Effect, Layer, Metric } from 'effect';

import { isMetricsEnabled, makeMetrics, type RenderMetrics } from './metrics.js';
import { makeMetricsRoutes } from './routes/metrics.js';

describe('isMetricsEnabled', () => {
  it('is disabled when nothing is configured', () => {
    expect(isMetricsEnabled({})).toBe(false);
  });

  it('is enabled by a truthy OTEL_METRICS_ENABLED flag', () => {
    for (const value of ['1', 'true', 'yes', 'on', 'TRUE', ' On ']) {
      expect(isMetricsEnabled({ OTEL_METRICS_ENABLED: value })).toBe(true);
    }
  });

  it('is enabled by an OTLP metrics endpoint (specific or generic)', () => {
    expect(isMetricsEnabled({ OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'http://c:4318' })).toBe(true);
    expect(isMetricsEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://c:4318' })).toBe(true);
  });

  it('is forced off by OTEL_SDK_DISABLED even when otherwise enabled', () => {
    expect(isMetricsEnabled({ OTEL_METRICS_ENABLED: '1', OTEL_SDK_DISABLED: 'true' })).toBe(false);
  });

  it('treats falsy / unknown flag values as disabled', () => {
    for (const value of ['0', 'false', 'no', 'off', '', 'maybe']) {
      expect(isMetricsEnabled({ OTEL_METRICS_ENABLED: value })).toBe(false);
    }
  });
});

describe('makeMetrics', () => {
  it('is a no-op when disabled: empty layer, render resolves undefined', async () => {
    const handle = makeMetrics({});
    expect(handle.enabled).toBe(false);
    expect(handle.layer).toBe(Layer.empty);
    expect(handle.render).toBeUndefined();
  });

  it('renders recorded Effect metrics in Prometheus format once the layer is mounted', async () => {
    const handle = makeMetrics({ OTEL_METRICS_ENABLED: '1' });
    expect(handle.enabled).toBe(true);
    const render = handle.render;
    expect(render).toBeDefined();

    // The reader is bound to its provider only when the metrics layer is mounted
    // (as it is in the runtime). Mount it, record one Effect metric, then render.
    const program = Effect.gen(function* () {
      yield* Metric.increment(Metric.counter('crf_test_total'));
      return yield* Effect.promise(() => render!());
    });
    const body = await Effect.runPromise(Effect.scoped(Effect.provide(program, handle.layer)));
    expect(body).toContain('crf_test_total');
  });

  it('render does not throw before the layer is mounted (serves empty body)', async () => {
    const handle = makeMetrics({ OTEL_METRICS_ENABLED: '1' });
    // No layer mounted → reader unbound. Must degrade to '' rather than throw,
    // so a scrape racing boot gets 200-empty instead of 500.
    await expect(handle.render!()).resolves.toBe('');
  });
});

describe('makeMetricsRoutes', () => {
  it('serves 200 with the Prometheus content type when render yields text', async () => {
    const app = makeMetricsRoutes(() => Promise.resolve('# HELP up\nup 1\n'));
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain; version=0.0.4');
    expect(await res.text()).toContain('up 1');
  });

  it('answers 503 when metrics are disabled (no renderer wired)', async () => {
    const noRenderer: RenderMetrics | undefined = undefined;
    const app = makeMetricsRoutes(noRenderer);
    const res = await app.request('/');
    expect(res.status).toBe(503);
    expect(await res.text()).toContain('metrics disabled');
  });
});
