import { Hono } from 'hono';
import type { RenderMetrics } from '../metrics.js';

/** Prometheus text exposition content type (version 0.0.4). */
const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

/**
 * Public `/metrics` route (no auth, like `/health`) exposing the service's
 * Prometheus metrics ([ADR 0089]).
 *
 * - `200` with the exposition text when metrics are enabled;
 * - `503` when disabled — so a scrape against a service started without
 *   `OTEL_METRICS_ENABLED` fails loudly rather than looking "up but empty".
 *
 * The endpoint carries no request-specific labels and reads only the registry,
 * so it cannot leak personal data (ADR 0089 RGPD guard).
 */
export const makeMetricsRoutes = (render: RenderMetrics | undefined): Hono => {
  const app = new Hono();

  app.get('/', async (c) => {
    if (render === undefined) {
      return c.text('metrics disabled\n', 503);
    }
    return c.body(await render(), 200, { 'Content-Type': PROMETHEUS_CONTENT_TYPE });
  });

  return app;
};
