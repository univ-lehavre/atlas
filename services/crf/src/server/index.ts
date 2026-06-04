/**
 * CRF Server - HTTP microservice for REDCap.
 *
 * This module starts the CRF HTTP server using configuration from environment variables.
 * For CLI usage with options, use the `crf-server` CLI command instead.
 *
 * @module
 */

import { serve } from '@hono/node-server';
import { startTelemetry } from './telemetry.js';
import { createApp } from './app.js';
import { env } from './env.js';
import { registerGracefulShutdown } from './shutdown.js';

// Start OpenTelemetry before anything else so the request middleware records
// spans. No-op safe: returns undefined when tracing is not configured.
startTelemetry();

// Create and start the server
const app = createApp({
  port: env.port,
  disableRateLimit: env.disableRateLimit,
  authToken: env.authToken,
});

console.warn(`Starting CRF service on port ${String(env.port)}...`);

// Capturer le serveur retourné par `serve()` pour pouvoir le fermer proprement
// à l'arrêt (SIGTERM/SIGINT) — facteur IX Disposability (cf. shutdown.ts).
const server = serve({
  fetch: app.fetch,
  port: env.port,
});

registerGracefulShutdown(server);

console.warn(`CRF service running at http://localhost:${String(env.port)}`);
console.warn(`API documentation available at http://localhost:${String(env.port)}/docs`);
console.warn(`OpenAPI spec available at http://localhost:${String(env.port)}/openapi.json`);
