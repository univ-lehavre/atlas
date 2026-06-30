/**
 * Prometheus metrics bootstrap for the CRF service ([ADR 0089]).
 *
 * Symmetric to {@link file://./telemetry.ts} (traces): **opt-in and no-op
 * safe**. When metrics are not enabled (see {@link isMetricsEnabled}),
 * {@link makeMetrics} returns a handle whose layer is `Layer.empty` and whose
 * `render` reports the disabled state — the service runs exactly as before and
 * the `/metrics` route answers `503`.
 *
 * ## Enabling
 *
 * Metrics start when **either**:
 *
 * - `OTEL_METRICS_ENABLED` is truthy (`1`, `true`, `yes`, `on`); or
 * - an OTLP metrics endpoint is configured (`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
 *   or the generic `OTEL_EXPORTER_OTLP_ENDPOINT`).
 *
 * `OTEL_SDK_DISABLED=true` forces a no-op even if the above are set.
 *
 * ## Design ([ADR 0089])
 *
 * - Application code declares metrics with Effect's native `Metric` API; the
 *   {@link MetricsHandle.layer} bridges Effect's metric registry to an
 *   OpenTelemetry `MeterProvider` via `@effect/opentelemetry`'s `Metrics.layer`.
 *   That layer owns the provider; we only hand it the reader.
 * - The reader is a {@link https://prometheus.io Prometheus} `PrometheusExporter`
 *   created with `preventServerStart: true`: it owns **no** HTTP server (no port
 *   9464). The exposition text is rendered on demand by
 *   {@link MetricsHandle.render} and served by the service's own `/metrics`
 *   Hono route — one port, one `ServiceMonitor`.
 * - **RGPD / cardinality ([ADR 0033], [ADR 0030])**: never put unbounded or
 *   personal values in labels (no project id, e-mail, token, raw URL). Use
 *   bounded, non-identifying labels only (HTTP method, *templated* route, status
 *   code, logical service name).
 *
 * @module
 */

import { Layer } from 'effect';
import { Metrics, Resource } from '@effect/opentelemetry';
import { PrometheusExporter, PrometheusSerializer } from '@opentelemetry/exporter-prometheus';

/** Default logical service name reported on every metric (cf. `telemetry.ts`). */
const DEFAULT_SERVICE_NAME = 'atlas-crf';

/** Stable default version; override via `OTEL_SERVICE_VERSION`. */
const DEFAULT_SERVICE_VERSION = '0.0.0';

/** Values that count as "truthy" for the enablement flag. */
const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

const isTruthy = (value: string | undefined): boolean =>
  value !== undefined && TRUTHY.has(value.trim().toLowerCase());

/**
 * Reads an OTLP metrics endpoint from the environment, if any. Honours both the
 * metrics-specific and the generic OTLP endpoint variables.
 */
const otlpMetricsEndpoint = (e: NodeJS.ProcessEnv): string | undefined =>
  e['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'] ?? e['OTEL_EXPORTER_OTLP_ENDPOINT'];

/**
 * Whether metrics should be activated for the current environment.
 *
 * @param e - Environment to inspect (defaults to `process.env`).
 */
export const isMetricsEnabled = (e: NodeJS.ProcessEnv = process.env): boolean => {
  if (isTruthy(e['OTEL_SDK_DISABLED'])) return false;
  return isTruthy(e['OTEL_METRICS_ENABLED']) || otlpMetricsEndpoint(e) !== undefined;
};

/**
 * Renders the current Prometheus exposition text. Present only when metrics are
 * enabled; the `/metrics` route answers `503` when no renderer is wired.
 */
export type RenderMetrics = () => Promise<string>;

/**
 * A metrics pipeline for the service.
 *
 * - `layer` is mounted in the app runtime and bridges Effect's `Metric` registry
 *   to OpenTelemetry. It is `Layer.empty` when metrics are disabled.
 * - `render` produces the Prometheus exposition text, or is `undefined` when
 *   metrics are disabled (the route then answers `503`).
 */
export interface MetricsHandle {
  readonly enabled: boolean;
  readonly layer: Layer.Layer<never>;
  readonly render: RenderMetrics | undefined;
}

/**
 * Builds the metrics pipeline.
 *
 * No-op safe: when {@link isMetricsEnabled} is `false`, no OTel object is
 * constructed, `layer` is `Layer.empty`, and `render` resolves to `undefined`.
 * When enabled, a server-less `PrometheusExporter` is created and handed to
 * `Metrics.layer`, which builds and owns the `MeterProvider`; the same reader
 * is used to render the exposition text on demand.
 *
 * @param e - Environment to inspect (defaults to `process.env`).
 */
export const makeMetrics = (e: NodeJS.ProcessEnv = process.env): MetricsHandle => {
  if (!isMetricsEnabled(e)) {
    return {
      enabled: false,
      layer: Layer.empty,
      render: undefined,
    };
  }

  // `preventServerStart` keeps the exporter from opening its own HTTP server
  // (port 9464): the service serves the exposition text on its own /metrics
  // route instead (ADR 0089, single-port decision).
  const reader = new PrometheusExporter({ preventServerStart: true });
  const serializer = new PrometheusSerializer();

  const render = async (): Promise<string> => {
    let collected;
    try {
      collected = await reader.collect();
    } catch (error: unknown) {
      // The reader is bound to its `MeterProvider` only when the Effect metrics
      // layer is built (first run through the runtime). `makeCrfRuntime` forces
      // that build at boot, but a scrape racing it would hit "MetricReader is
      // not bound to a MetricProducer": treat ONLY that as "no metrics yet" and
      // serve an empty body (200, not 500). Any other error is a real fault and
      // is rethrown so it surfaces instead of silently blanking the endpoint.
      if (error instanceof Error && error.message.includes('not bound')) {
        console.error('Metrics reader not yet bound (serving empty body):', error.message);
        return '';
      }
      throw error;
    }
    const { resourceMetrics, errors } = collected;
    if (errors.length > 0) {
      // Producer-side errors are non-fatal: surface them in logs, still serve
      // what we have so a transient producer error never blanks the endpoint.
      console.error('Prometheus metric collection errors:', errors);
    }
    return serializer.serialize(resourceMetrics);
  };

  // `Metrics.layer` constructs and owns the MeterProvider from the reader, and
  // wires Effect's metric registry into it. It requires a `Resource`: we provide
  // one carrying `service.name`/`service.version` (default `atlas-crf`, override
  // via `OTEL_SERVICE_NAME`/`OTEL_SERVICE_VERSION`) so the exported metrics are
  // attributed per service — the `Resource.layerEmpty` variant would emit them
  // unattributed and defeat the per-service `ServiceMonitor` goal (ADR 0089).
  const resource = Resource.layer({
    serviceName: e['OTEL_SERVICE_NAME'] ?? DEFAULT_SERVICE_NAME,
    serviceVersion: e['OTEL_SERVICE_VERSION'] ?? DEFAULT_SERVICE_VERSION,
  });
  return {
    enabled: true,
    layer: Layer.provide(
      Metrics.layer(() => reader),
      resource
    ),
    render,
  };
};
