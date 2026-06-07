#!/usr/bin/env node
/**
 * CRF Server CLI - Start the CRF HTTP microservice.
 *
 * Starts the CRF HTTP server that exposes a REST API for REDCap operations.
 *
 * @example
 * ```bash
 * # Using environment variables
 * export REDCAP_API_URL=https://redcap.example.com/api
 * export REDCAP_API_TOKEN=xxxxx
 * crf-server
 *
 * # Override port
 * crf-server --port 8080
 *
 * # Disable rate limiting (for testing)
 * crf-server --no-rate-limit
 * ```
 *
 * @module
 */

import { Command, HelpDoc, Options, Span } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { serve } from '@hono/node-server';
import { createCliContext, detectCi, ExitCode, intro, log, pc } from '../../shared/index.js';

/** Package version - should match package.json */
const VERSION = '1.2.1';

/** Default port */
const DEFAULT_PORT = 3000;

/** Default host */
const DEFAULT_HOST = '0.0.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

const portOption = Options.integer('port').pipe(
  Options.withAlias('p'),
  Options.withDescription('Port to listen on'),
  Options.withDefault(Number.parseInt(process.env['PORT'] ?? String(DEFAULT_PORT), 10))
);

const hostOption = Options.text('host').pipe(
  Options.withAlias('H'),
  Options.withDescription('Host to bind to'),
  Options.withDefault(process.env['HOST'] ?? DEFAULT_HOST)
);

const noRateLimitOption = Options.boolean('no-rate-limit').pipe(
  Options.withDescription('Disable rate limiting'),
  Options.withDefault(process.env['DISABLE_RATE_LIMIT'] === 'true')
);

const ciOption = Options.boolean('ci').pipe(
  Options.withAlias('c'),
  Options.withDescription('CI mode (minimal output)'),
  Options.withDefault(false)
);

const quietOption = Options.boolean('quiet').pipe(
  Options.withAlias('q'),
  Options.withDescription('Suppress startup messages'),
  Options.withDefault(false)
);

// ─────────────────────────────────────────────────────────────────────────────
// Command Definition
// ─────────────────────────────────────────────────────────────────────────────

const command = Command.make(
  'crf-server',
  {
    port: portOption,
    host: hostOption,
    noRateLimit: noRateLimitOption,
    ci: ciOption,
    quiet: quietOption,
  },
  (args) =>
    Effect.gen(function* () {
      // Create CLI context with auto-detection
      const isCi = args.ci || detectCi();
      const ctx = createCliContext({
        ci: isCi,
        quiet: args.quiet,
      });

      // Check required environment variables
      const crfUrl = process.env['REDCAP_API_URL'];
      const crfToken = process.env['REDCAP_API_TOKEN'];
      const authToken = process.env['CRF_AUTH_TOKEN'];

      if (!crfUrl) {
        log.error(ctx, 'REDCAP_API_URL environment variable is required');
        return yield* Effect.fail(ExitCode.InvalidConfig);
      }

      if (!crfToken) {
        log.error(ctx, 'REDCAP_API_TOKEN environment variable is required');
        return yield* Effect.fail(ExitCode.InvalidConfig);
      }

      // Bearer secret guarding /api/* (ADR 0041). Required: the service exposes
      // nominative data and must not start unauthenticated (fail-closed).
      if (!authToken) {
        log.error(ctx, 'CRF_AUTH_TOKEN environment variable is required');
        return yield* Effect.fail(ExitCode.InvalidConfig);
      }

      // Show intro in human mode
      intro(ctx, 'CRF Server');

      // Dynamically import the app factory + runtime builder.
      const { createApp, makeCrfRuntime } = yield* Effect.promise(
        () => import('@univ-lehavre/atlas-crf')
      );

      // Build the central Effect runtime (logger + CrfClientService) from the
      // validated env, then create the Hono app on it (écart E10, ADR 0045).
      const runtime = makeCrfRuntime({
        port: args.port,
        crfApiUrl: crfUrl,
        crfApiToken: crfToken,
        authToken,
        disableRateLimit: args.noRateLimit,
      });

      const app = createApp({
        port: args.port,
        disableRateLimit: args.noRateLimit,
        authToken,
        runtime,
      });

      // Start the server
      log.info(ctx, `Starting CRF service on ${args.host}:${String(args.port)}...`);

      serve({
        fetch: app.fetch,
        port: args.port,
        hostname: args.host,
      });

      // Log startup info
      if (!ctx.quiet) {
        log.success(
          ctx,
          `CRF service running at ${pc.cyan(`http://${args.host}:${String(args.port)}`)}`
        );
        log.info(
          ctx,
          `API documentation: ${pc.cyan(`http://${args.host}:${String(args.port)}/docs`)}`
        );
        log.info(
          ctx,
          `OpenAPI spec: ${pc.cyan(`http://${args.host}:${String(args.port)}/openapi.json`)}`
        );
        log.info(
          ctx,
          `Health check: ${pc.cyan(`http://${args.host}:${String(args.port)}/health`)}`
        );

        if (args.noRateLimit) {
          log.warn(ctx, 'Rate limiting is disabled');
        }

        log.message(ctx, '');
        log.message(ctx, pc.dim('Press Ctrl+C to stop'));
      }

      // Keep the process running
      yield* Effect.never;
    })
);

// ─────────────────────────────────────────────────────────────────────────────
// CLI Application
// ─────────────────────────────────────────────────────────────────────────────

const cli = Command.run(command, {
  name: 'crf-server',
  version: VERSION,
  summary: Span.text('CRF HTTP microservice for REDCap'),
  footer: HelpDoc.blocks([
    HelpDoc.p('Environment Variables:'),
    HelpDoc.p('  REDCAP_API_URL       REDCap API URL (required)'),
    HelpDoc.p('  REDCAP_API_TOKEN     REDCap API token (required)'),
    HelpDoc.p(`  PORT                 Server port (default: ${String(DEFAULT_PORT)})`),
    HelpDoc.p(`  HOST                 Server host (default: ${DEFAULT_HOST})`),
    HelpDoc.p('  DISABLE_RATE_LIMIT   Disable rate limiting (default: false)'),
    HelpDoc.p(''),
    HelpDoc.p('Exit Codes:'),
    HelpDoc.p('  0   Server stopped gracefully'),
    HelpDoc.p('  1   General error'),
    HelpDoc.p('  2   Invalid configuration'),
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────

cli(process.argv).pipe(
  Effect.catchAll((exitCode) =>
    Effect.sync(() => {
      process.exitCode = typeof exitCode === 'number' ? exitCode : ExitCode.Error;
    })
  ),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
);
