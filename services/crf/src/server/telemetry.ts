/**
 * OpenTelemetry tracing bootstrap for the CRF service.
 *
 * The instrumentation is **opt-in and no-op safe**: if OpenTelemetry is not
 * explicitly enabled (see {@link isTelemetryEnabled}), {@link startTelemetry}
 * returns `undefined` and the service runs exactly as before — no collector
 * dependency, no extra startup cost, no crash.
 *
 * ## Enabling
 *
 * Telemetry starts when **either** of the following is true:
 *
 * - `OTEL_TRACES_ENABLED` is set to a truthy value (`1`, `true`, `yes`, `on`),
 *   which exports spans to **stdout** via the console exporter (handy in dev);
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` (or
 *   `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`) is set, which exports spans over
 *   OTLP/HTTP to that collector (typical in prod).
 *
 * Setting `OTEL_SDK_DISABLED=true` forces a no-op even if the above are set,
 * matching the upstream OpenTelemetry convention.
 *
 * ## Standard OTel environment variables
 *
 * Once enabled, the underlying `NodeSDK` honours the usual `OTEL_*` variables,
 * notably:
 *
 * - `OTEL_SERVICE_NAME` — overrides the default service name (`atlas-crf`);
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` — base collector endpoint (OTLP/HTTP);
 * - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` — traces-specific endpoint override;
 * - `OTEL_EXPORTER_OTLP_HEADERS` — extra headers (e.g. auth) for the exporter;
 * - `OTEL_RESOURCE_ATTRIBUTES` — additional resource attributes;
 * - `OTEL_SDK_DISABLED` — global kill switch.
 *
 * @module
 */

import { Layer } from 'effect';
import { Resource, Tracer } from '@effect/opentelemetry';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/** Default logical service name reported on every span. */
const DEFAULT_SERVICE_NAME = 'atlas-crf';

/**
 * Default service version reported on every span when
 * `OTEL_SERVICE_VERSION` is not set. A stable placeholder rather than a
 * `package.json` import (which would drag a JSON import assertion into the
 * build) — override via env where exact release correlation matters.
 */
const DEFAULT_SERVICE_VERSION = '0.0.0';

/** Values that count as "truthy" for the enablement flag. */
const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

const isTruthy = (value: string | undefined): boolean =>
  value !== undefined && TRUTHY.has(value.trim().toLowerCase());

/**
 * Reads an OTLP traces endpoint from the environment, if any.
 *
 * Honours both the generic `OTEL_EXPORTER_OTLP_ENDPOINT` and the
 * traces-specific `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`.
 */
const otlpEndpoint = (e: NodeJS.ProcessEnv): string | undefined =>
  e['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ?? e['OTEL_EXPORTER_OTLP_ENDPOINT'];

/**
 * Whether tracing should be activated for the current environment.
 *
 * @param e - Environment to inspect (defaults to `process.env`).
 * @returns `true` when an exporter is configured and the SDK is not disabled.
 */
export const isTelemetryEnabled = (e: NodeJS.ProcessEnv = process.env): boolean => {
  if (isTruthy(e['OTEL_SDK_DISABLED'])) return false;
  return isTruthy(e['OTEL_TRACES_ENABLED']) || otlpEndpoint(e) !== undefined;
};

/**
 * Picks the span processor for the current environment.
 *
 * - An OTLP endpoint wins and ships spans over OTLP/HTTP.
 * - Otherwise spans are printed to stdout (console exporter), which is the
 *   developer-friendly default when only `OTEL_TRACES_ENABLED` is set.
 */
const buildSpanProcessor = (e: NodeJS.ProcessEnv): SpanProcessor => {
  const endpoint = otlpEndpoint(e);
  if (endpoint !== undefined) {
    return new SimpleSpanProcessor(new OTLPTraceExporter());
  }
  return new SimpleSpanProcessor(new ConsoleSpanExporter());
};

/**
 * Starts the OpenTelemetry Node SDK when tracing is enabled.
 *
 * No-op safe: when {@link isTelemetryEnabled} is `false`, this returns
 * `undefined` and does not touch the SDK at all. When enabled, the SDK is
 * started synchronously and a shutdown hook is registered so spans are flushed
 * on process exit.
 *
 * @param e - Environment to inspect (defaults to `process.env`).
 * @returns The started {@link NodeSDK}, or `undefined` if telemetry is off.
 */
export const startTelemetry = (e: NodeJS.ProcessEnv = process.env): NodeSDK | undefined => {
  if (!isTelemetryEnabled(e)) return undefined;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: e['OTEL_SERVICE_NAME'] ?? DEFAULT_SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: e['OTEL_SERVICE_VERSION'] ?? DEFAULT_SERVICE_VERSION,
    }),
    spanProcessors: [buildSpanProcessor(e)],
  });

  sdk.start();

  const flush = (): void => {
    void sdk.shutdown().catch((error: unknown) => {
      console.error('Failed to shut down OpenTelemetry SDK:', error);
    });
  };
  process.once('SIGTERM', flush);
  process.once('SIGINT', flush);

  return sdk;
};

/**
 * Effect-side tracer layer bridging `Effect.withSpan` to the **global**
 * OpenTelemetry tracer provider — the same one {@link startTelemetry} registers
 * and that `@hono/otel` reads. Mounted in the service `AppLayer`
 * ([boot.ts](./boot.ts)) so business spans (REDCap client) correlate with the
 * HTTP spans of the request middleware (écart E9,
 * [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *
 * **Single provider, no double SDK**: the raw `NodeSDK` owns export and global
 * registration; this layer only makes Effect *use* that global provider via
 * `Tracer.layerGlobal`. When telemetry is off no provider is registered, so
 * `Tracer.layerGlobal` reads the API's no-op `ProxyTracerProvider` and spans are
 * harmlessly discarded — but to keep the disabled path truly zero-cost we mount
 * `Layer.empty`, letting Effect's own default no-op tracer satisfy `withSpan`.
 *
 * @param e - Environment to inspect (defaults to `process.env`).
 */
export const makeTracerLayer = (e: NodeJS.ProcessEnv = process.env): Layer.Layer<never> =>
  isTelemetryEnabled(e) ? Layer.provide(Tracer.layerGlobal, Resource.layerEmpty) : Layer.empty;
