#!/usr/bin/env node
/**
 * CRF REDCap CLI - Test REDCap connectivity directly.
 *
 * Tests connectivity to a REDCap instance by running a series of API calls
 * and reporting the results.
 *
 * @example
 * ```bash
 * # Using environment variables
 * export REDCAP_API_URL=https://redcap.example.com/api
 * export REDCAP_API_TOKEN=xxxxx
 * crf-redcap
 *
 * # Override with flags
 * crf-redcap --url https://other.com/api --token yyyyy
 *
 * # CI mode with JSON output
 * crf-redcap --ci --json
 * ```
 *
 * @module
 */

import { Command, HelpDoc, Options, Span } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Console, Effect, Option } from 'effect';
import { runTests } from './commands.js';
import { createCliContext, detectCi, ExitCode, intro, outro, log } from '../shared/index.js';

/** Package version - should match package.json */
const VERSION = '1.2.1';

/** Default REDCap API URL */
const DEFAULT_URL = 'http://localhost:8080/api';

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

const urlOption = Options.text('url').pipe(
  Options.withAlias('u'),
  Options.withDescription('REDCap API URL'),
  Options.withDefault(process.env['REDCAP_API_URL'] ?? DEFAULT_URL)
);

const tokenOption = Options.text('token').pipe(
  Options.withAlias('t'),
  Options.withDescription('REDCap API token'),
  Options.optional
);

const ciOption = Options.boolean('ci').pipe(
  Options.withAlias('c'),
  Options.withDescription('CI mode (no colors, no interactive prompts)'),
  Options.withDefault(false)
);

const jsonOption = Options.boolean('json').pipe(
  Options.withAlias('j'),
  Options.withDescription('Output results as JSON'),
  Options.withDefault(false)
);

const verboseOption = Options.boolean('verbose').pipe(
  Options.withDescription('Enable verbose output'),
  Options.withDefault(false)
);

const quietOption = Options.boolean('quiet').pipe(
  Options.withAlias('q'),
  Options.withDescription('Suppress non-essential output'),
  Options.withDefault(false)
);

// ─────────────────────────────────────────────────────────────────────────────
// Command Definition
// ─────────────────────────────────────────────────────────────────────────────

const command = Command.make(
  'crf-redcap',
  {
    url: urlOption,
    token: tokenOption,
    ci: ciOption,
    json: jsonOption,
    verbose: verboseOption,
    quiet: quietOption,
  },
  (args) =>
    Effect.gen(function* () {
      // Create CLI context with auto-detection
      const isCi = args.ci || detectCi();
      const ctx = createCliContext({
        ci: isCi,
        json: args.json,
        verbose: args.verbose,
        quiet: args.quiet,
      });

      // Show intro in human mode
      intro(ctx, 'CRF REDCap Connectivity Test');

      // Resolve token from args or environment
      const tokenFromArgs = Option.getOrUndefined(args.token);
      const token = tokenFromArgs ?? process.env['REDCAP_API_TOKEN'];

      if (token === undefined || token === '') {
        log.error(ctx, 'REDCAP_API_TOKEN is required (set via env or --token)');
        yield* Console.error('');
        yield* Console.error('Set the token via environment variable:');
        yield* Console.error('  export REDCAP_API_TOKEN=your-token');
        yield* Console.error('');
        yield* Console.error('Or pass it as an option:');
        yield* Console.error('  crf-redcap --token your-token');
        return yield* Effect.fail(ExitCode.InvalidConfig);
      }

      // Run the tests
      const exitCode = yield* Effect.promise(() =>
        runTests({
          url: args.url,
          token,
          ctx,
        })
      );

      // Show outro in human mode
      outro(ctx, 'Done');

      if (exitCode !== ExitCode.Success) {
        return yield* Effect.fail(exitCode);
      }
    })
);

// ─────────────────────────────────────────────────────────────────────────────
// CLI Application
// ─────────────────────────────────────────────────────────────────────────────

const cli = Command.run(command, {
  name: 'crf-redcap',
  version: VERSION,
  summary: Span.text('Test REDCap API connectivity'),
  footer: HelpDoc.blocks([
    HelpDoc.p('Environment Variables:'),
    HelpDoc.p(`  REDCAP_API_URL     REDCap API URL (default: ${DEFAULT_URL})`),
    HelpDoc.p('  REDCAP_API_TOKEN   REDCap API token (required)'),
    HelpDoc.p(''),
    HelpDoc.p('Exit Codes:'),
    HelpDoc.p('  0   All tests passed'),
    HelpDoc.p('  1   Some tests failed'),
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
