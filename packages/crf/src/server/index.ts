/**
 * CRF Server - HTTP microservice for REDCap.
 *
 * This module starts the CRF HTTP server using configuration from environment variables.
 * For CLI usage with options, use the `crf-server` CLI command instead.
 *
 * @module
 */

import { serve } from '@hono/node-server';
import { createApp } from '../cli/server/app.js';
import { env } from './env.js';

// Create and start the server
const app = createApp({
  port: env.port,
  disableRateLimit: env.disableRateLimit,
});

console.warn(`Starting CRF service on port ${String(env.port)}...`);

serve({
  fetch: app.fetch,
  port: env.port,
});

console.warn(`CRF service running at http://localhost:${String(env.port)}`);
console.warn(`API documentation available at http://localhost:${String(env.port)}/docs`);
console.warn(`OpenAPI spec available at http://localhost:${String(env.port)}/openapi.json`);
