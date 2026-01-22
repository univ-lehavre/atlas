import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { openAPIRouteHandler } from 'hono-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { env } from './env.js';
import { health } from './routes/health.js';
import { records } from './routes/records.js';
import { users } from './routes/users.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check routes
app.route('/health', health);

// API routes
app.route('/api/v1/records', records);
app.route('/api/v1/users', users);

// OpenAPI specification
app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'REDCap Service API',
        version: '1.0.0',
        description: 'HTTP microservice exposing a REST API for REDCap',
      },
      servers: [{ url: `http://localhost:${String(env.port)}`, description: 'Local development' }],
      tags: [
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
console.warn(`Starting REDCap service on port ${String(env.port)}...`);

serve({
  fetch: app.fetch,
  port: env.port,
});

console.warn(`REDCap service running at http://localhost:${String(env.port)}`);
console.warn(`API documentation available at http://localhost:${String(env.port)}/docs`);
console.warn(`OpenAPI spec available at http://localhost:${String(env.port)}/openapi.json`);
