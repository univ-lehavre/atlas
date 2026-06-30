import type { MiddlewareHandler } from 'hono';
import { Effect, Metric } from 'effect';

import type { CrfRuntime } from '../boot.js';

/**
 * Counter of HTTP requests served, exported to Prometheus as
 * `crf_http_requests_total` (ADR 0089). Effect-native `Metric` so it flows
 * through the same registry the `/metrics` reader collects.
 */
const httpRequestsTotal = Metric.counter('crf_http_requests_total', {
  description: 'Total HTTP requests handled by the CRF service',
});

/**
 * Hono middleware that counts every served request into {@link httpRequestsTotal}.
 *
 * Labels are kept **bounded and non-identifying** (ADR 0089 RGPD/cardinality
 * guard): `method` (HTTP verb), `route` (the *templated* path from
 * `c.req.routePath`, e.g. `/api/v1/records/:id` — never the real URL with an id,
 * so a record id or e-mail can never leak into a label), and `status`.
 *
 * The increment runs through the central Effect runtime **fire-and-forget**: a
 * metrics failure must never affect the response.
 *
 * @param runtime - The CRF runtime carrying the metrics layer.
 */
export const httpMetricsMiddleware = (runtime: CrfRuntime): MiddlewareHandler => {
  // Single returned expression (no bare statements): run the handler chain, then
  // record the request once it has resolved.
  return (c, next) =>
    next().then(() => {
      // `routePath` is the matched TEMPLATE (`/api/v1/records/:id`), the only
      // RGPD-safe choice: the real URL would embed ids/e-mails as unbounded
      // labels. (The lint-suggested `hono/route` helper is absent in hono 4.12.)
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- templated path; safe alternative unavailable in this hono version
      const route = c.req.routePath;
      const program = Metric.update(httpRequestsTotal, 1).pipe(
        Effect.tagMetrics({ method: c.req.method, route, status: String(c.res.status) })
      );
      // Fire-and-forget: a metrics failure must never affect the response.
      return void runtime.runPromise(program).catch((error: unknown) => {
        console.error('Failed to record HTTP metric:', error);
      });
    });
};
