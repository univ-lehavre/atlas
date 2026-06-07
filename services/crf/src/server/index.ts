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
import { loadConfig, makeCrfRuntime } from './boot.js';
import { registerGracefulShutdown } from './shutdown.js';

// Start OpenTelemetry before anything else so the request middleware records
// spans. No-op safe: returns undefined when tracing is not configured.
startTelemetry();

// Read config and build the central Effect runtime once, at boot (écart
// E10/E8/E7, ADR 0045): the AppLayer wires the logger + CrfClientService that
// the routes depend on by injection.
const env = loadConfig();
const runtime = makeCrfRuntime(env);

// Create and start the server
const app = createApp({
  port: env.port,
  disableRateLimit: env.disableRateLimit,
  authToken: env.authToken,
  runtime,
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
