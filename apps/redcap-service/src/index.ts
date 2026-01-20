import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
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

// Error handling
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      data: null,
      error: {
        code: 'internal_error',
        message: err.message !== '' ? err.message : 'An unexpected error occurred',
      },
    },
    500
  );
});

// Start server
console.warn(`Starting REDCap service on port ${String(env.PORT)}...`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.warn(`REDCap service running at http://localhost:${String(env.PORT)}`);
