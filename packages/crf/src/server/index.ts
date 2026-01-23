import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { openAPIRouteHandler } from 'hono-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { env } from './env.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { health } from './routes/health.js';
import { project } from './routes/project.js';
import { records } from './routes/records.js';
import { users } from './routes/users.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Rate limiting (can be disabled for testing with DISABLE_RATE_LIMIT=true)
if (!env.disableRateLimit) {
  app.use('/api/*', apiRateLimiter);
}

// Return 405 for unsupported methods (RFC 9110 requires Allow header)
app.use('*', async (c, next) => {
  if (c.req.method === 'TRACE') {
    c.header('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
    return c.json(
      {
        data: null,
        error: { code: 'method_not_allowed', message: 'Method TRACE is not allowed' },
      },
      405
    );
  }
  return next();
});

// Health check routes
app.route('/health', health);

// API routes
app.route('/api/v1/project', project);
app.route('/api/v1/records', records);
app.route('/api/v1/users', users);

// OpenAPI specification
app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'CRF Service API',
        version: '1.0.0',
        description: 'Clinical Research Forms - HTTP microservice exposing a REST API for REDCap',
      },
      servers: [{ url: `http://localhost:${String(env.port)}`, description: 'Local development' }],
      tags: [
        { name: 'Project', description: 'REDCap project metadata' },
        { name: 'Records', description: 'REDCap records management' },
        { name: 'Users', description: 'REDCap users lookup' },
        { name: 'Health', description: 'Service health checks' },
      ],
    },
  })
);

// Scalar API documentation UI
app.get(
  '/docs',
  Scalar({
    url: '/openapi.json',
    theme: 'kepler',
  })
);

// Handle 404 for API routes - return 405 for known paths with wrong method
app.notFound((c) => {
  const path = c.req.path;
  const method = c.req.method;

  // Check if path matches API routes but method is not supported
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

  return c.json(
    {
      data: null,
      error: { code: 'not_found', message: 'Resource not found' },
    },
    404
  );
});

// Error handling
app.onError((err, c) => {
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
});

// Start server
console.warn(`Starting CRF service on port ${String(env.port)}...`);

serve({
  fetch: app.fetch,
  port: env.port,
});

console.warn(`CRF service running at http://localhost:${String(env.port)}`);
console.warn(`API documentation available at http://localhost:${String(env.port)}/docs`);
console.warn(`OpenAPI spec available at http://localhost:${String(env.port)}/openapi.json`);
