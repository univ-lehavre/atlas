/**
 * CRF Server Hono application factory.
 *
 * Creates and configures the Hono application for the CRF HTTP microservice.
 *
 * @module
 */

import { Hono } from 'hono';
import { httpInstrumentationMiddleware } from '@hono/otel';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { openAPIRouteHandler } from 'hono-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { bearerAuth } from './middleware/auth.js';
import { health } from './routes/health.js';
import { project } from './routes/project.js';
import { records } from './routes/records.js';
import { users } from './routes/users.js';

/**
 * Configuration options for creating the CRF app.
 */
export interface CreateAppOptions {
  /** Port number for OpenAPI server URL */
  readonly port: number;
  /** Whether to disable rate limiting */
  readonly disableRateLimit?: boolean;
  /**
   * Static Bearer secret required on `/api/*` (ADR 0041). When omitted, the
   * authentication middleware is not mounted — for tests and local tooling
   * only. The running service always passes `env.authToken` (required), so
   * production is never unauthenticated.
   */
  readonly authToken?: string;
}

const apiRoutes = [
  {
    pattern: /^\/api\/v1\/project\/(version|info|instruments|fields|export-field-names)$/,
    methods: ['GET'],
  },
  { pattern: /^\/api\/v1\/records$/, methods: ['GET', 'PUT'] },
  { pattern: /^\/api\/v1\/records\/[^/]+\/pdf$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/records\/[^/]+\/survey-link$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/users\/by-email$/, methods: ['GET'] },
];

// Return 405 for TRACE (RFC 9110 requires Allow header)
const traceBlocker: Parameters<Hono['use']>[1] = async (c, next) => {
  if (c.req.method === 'TRACE') {
    c.header('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return c.json(
      { data: null, error: { code: 'method_not_allowed', message: 'Method TRACE is not allowed' } },
      405
    );
  }
  return next();
};

const notFoundHandler: Parameters<Hono['notFound']>[0] = (c) => {
  const { path, method } = c.req;
  for (const route of apiRoutes) {
    if (route.pattern.test(path) && !route.methods.includes(method)) {
      c.header('Allow', route.methods.join(', '));
      return c.json(
        {
          data: null,
          error: { code: 'method_not_allowed', message: `Method ${method} is not allowed` },
        },
        405
      );
    }
  }
  return c.json({ data: null, error: { code: 'not_found', message: 'Resource not found' } }, 404);
};

const errorHandler: Parameters<Hono['onError']>[0] = (err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      data: null,
      error: {
        code: 'internal_error',
        message: err.message === '' ? 'An unexpected error occurred' : err.message,
      },
    },
    500
  );
};

/**
 * Creates and configures the Hono application.
 *
 * @param options - Configuration options
 * @returns Configured Hono application
 */
export const createApp = (options: CreateAppOptions): Hono => {
  const { port, disableRateLimit = false, authToken } = options;

  const app = new Hono();

  // OpenTelemetry: one span per HTTP request (method, route, status, duration).
  // No-op unless the OTel SDK is started — see ./telemetry.ts. When the SDK is
  // off the OTel API resolves to no-op tracers, so this middleware is cheap.
  app.use('*', httpInstrumentationMiddleware());
  app.use('*', logger());
  app.use('*', cors());
  if (!disableRateLimit) app.use('/api/*', apiRateLimiter);
  // Application-level Bearer auth on /api/* (ADR 0041), after the IP rate
  // limiter so unauthenticated floods are throttled first. /health,
  // /openapi.json and /docs stay open. Mounted only when a secret is provided;
  // the running service always provides one (env.authToken is required).
  if (authToken !== undefined) app.use('/api/*', bearerAuth(authToken));
  app.use('*', traceBlocker);

  app.route('/health', health);
  app.route('/api/v1/project', project);
  app.route('/api/v1/records', records);
  app.route('/api/v1/users', users);

  app.get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: 'CRF Service API',
          version: '1.0.0',
          description: 'Complex reporting form (CRF) - HTTP microservice exposing a REST API',
        },
        servers: [{ url: `http://localhost:${String(port)}`, description: 'Local development' }],
        tags: [
          { name: 'Project', description: 'REDCap project metadata' },
          { name: 'Records', description: 'REDCap records management' },
          { name: 'Users', description: 'REDCap users lookup' },
          { name: 'Health', description: 'Service health checks' },
        ],
      },
    })
  );

  app.get('/docs', Scalar({ url: '/openapi.json', theme: 'kepler' }));

  app.notFound(notFoundHandler);
  app.onError(errorHandler);

  return app;
};
