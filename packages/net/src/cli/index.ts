#!/usr/bin/env node
/**
 * Atlas Network Diagnostics CLI.
 *
 * Performs network diagnostics including DNS resolution, TCP connectivity,
 * and TLS handshake tests.
 *
 * @example
 * ```bash
 * # Interactive mode
 * atlas-net
 *
 * # Diagnose specific URL
 * atlas-net https://example.com
 *
 * # CI mode with JSON output
 * atlas-net --ci --json https://example.com
 * ```
 *
 * @module
 */

import { Args, Command, HelpDoc, Options, Span } from '@effect/cli';
import { NodeContext } from '@effect/platform-node';
import { Effect, Option } from 'effect';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { dnsResolve, tcpPing, tlsHandshake, checkInternet } from '../diagnostics.js';
import { Hostname, Port, type DiagnosticStep } from '../types.js';

/** Package version - should match package.json */
const VERSION = '0.6.0';

// ─────────────────────────────────────────────────────────────────────────────
// Exit Codes
// ─────────────────────────────────────────────────────────────────────────────

const ExitCode = {
  Success: 0,
  Error: 1,
  InvalidConfig: 2,
  NetworkError: 3,
} as const;

type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

// ─────────────────────────────────────────────────────────────────────────────
// CLI Context
// ─────────────────────────────────────────────────────────────────────────────

interface CliContext {
  readonly ci: boolean;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
}

const detectCi = (): boolean =>
  !process.stdout.isTTY ||
  Boolean(process.env['CI']) ||
  Boolean(process.env['CONTINUOUS_INTEGRATION']) ||
  Boolean(process.env['GITHUB_ACTIONS']);

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

const formatStepHuman = (step: DiagnosticStep): string => {
  const icon =
    step.status === 'ok'
      ? pc.green('\u2713')
      : step.status === 'error'
        ? pc.red('\u2717')
        : pc.dim('\u25CB');
  const latency = step.latencyMs === undefined ? '' : pc.dim(` (${String(step.latencyMs)}ms)`);
  const message = step.message ? pc.dim(` \u2192 ${step.message}`) : '';
  return `${icon} ${step.name}${latency}${message}`;
};

const formatStepCi = (step: DiagnosticStep): string => {
  const status = step.status.toUpperCase().padEnd(5);
  const latency = step.latencyMs === undefined ? '' : ` ${String(step.latencyMs)}ms`;
  const message = step.message ? ` - ${step.message}` : '';
  return `[${status}] ${step.name}${latency}${message}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics Runner
// ─────────────────────────────────────────────────────────────────────────────

interface DiagnosticsResult {
  readonly url: string;
  readonly steps: readonly DiagnosticStep[];
  readonly success: boolean;
}

const runDiagnostics = async (targetUrl: string, ctx: CliContext): Promise<DiagnosticsResult> => {
  const url = new URL(targetUrl);
  const port =
    url.port !== '' ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
  const isHttps = url.protocol === 'https:';
  const steps: DiagnosticStep[] = [];
  let hasError = false;

  const log = (step: DiagnosticStep): void => {
    steps.push(step);
    if (step.status === 'error') hasError = true;
    if (!ctx.json) {
      console.log(ctx.ci ? formatStepCi(step) : formatStepHuman(step));
    }
  };

  const runStep = async (
    name: string,
    effect: Effect.Effect<DiagnosticStep>
  ): Promise<DiagnosticStep> => {
    if (ctx.ci || ctx.json) {
      const step = await Effect.runPromise(effect);
      log(step);
      return step;
    }
    const spinner = p.spinner();
    spinner.start(name);
    const step = await Effect.runPromise(effect);
    spinner.stop(formatStepHuman(step));
    steps.push(step);
    if (step.status === 'error') hasError = true;
    return step;
  };

  const hostname = Hostname(url.hostname);
  const portBranded = Port(port);

  // Step 1: DNS Resolution
  const dnsStep = await runStep('DNS Resolution', dnsResolve(hostname));

  if (dnsStep.status === 'error') {
    await runStep('Internet Check', checkInternet());
    return { url: targetUrl, steps, success: !hasError };
  }

  // Step 2: TCP Connect
  const tcpStep = await runStep('TCP Connect', tcpPing(hostname, portBranded));

  if (tcpStep.status === 'error') {
    await runStep('Internet Check', checkInternet());
    return { url: targetUrl, steps, success: !hasError };
  }

  // Step 3: TLS Handshake (HTTPS only)
  if (isHttps) {
    await runStep('TLS Handshake', tlsHandshake(hostname, portBranded));
  }

  return { url: targetUrl, steps, success: !hasError };
};

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

const urlArg = Args.text({ name: 'url' }).pipe(
  Args.withDescription('Target URL to diagnose'),
  Args.optional
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
  Options.withAlias('v'),
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
  'atlas-net',
  {
    url: urlArg,
    ci: ciOption,
    json: jsonOption,
    verbose: verboseOption,
    quiet: quietOption,
  },
  (args) =>
    Effect.gen(function* () {
      // Create CLI context with auto-detection
      const isCi = args.ci || detectCi();
      const ctx: CliContext = {
        ci: isCi,
        json: args.json,
        verbose: args.verbose,
        quiet: args.quiet,
      };

      // Show intro in human mode
      if (!ctx.ci && !ctx.json && !ctx.quiet) {
        p.intro(pc.cyan('Atlas Network Diagnostics'));
      }

      // Resolve target URL
      let targetUrl = Option.getOrUndefined(args.url);

      if (targetUrl !== undefined) {
        try {
          new URL(targetUrl);
        } catch {
          if (ctx.json) {
            console.log(JSON.stringify({ error: 'Invalid URL', url: targetUrl }));
          } else if (ctx.ci) {
            console.error(`Error: Invalid URL: ${targetUrl}`);
          } else {
            p.log.error(`Invalid URL: ${targetUrl}`);
          }
          return yield* Effect.fail(ExitCode.InvalidConfig);
        }
      } else {
        if (ctx.ci) {
          console.error('Error: URL required in CI mode');
          return yield* Effect.fail(ExitCode.InvalidConfig);
        }

        const input = yield* Effect.promise(() =>
          p.text({
            message: 'Enter target URL to diagnose',
            placeholder: 'https://example.com',
            validate: (value) => {
              try {
                new URL(value);
              } catch {
                return 'Please enter a valid URL';
              }
            },
          })
        );

        if (p.isCancel(input)) {
          p.cancel('Cancelled');
          return yield* Effect.fail(ExitCode.Success);
        }

        targetUrl = input;
      }

      // Run diagnostics
      const result = yield* Effect.promise(() => runDiagnostics(targetUrl, ctx));

      // Output JSON if requested
      if (ctx.json) {
        console.log(JSON.stringify(result, null, 2));
      }

      // Show outro in human mode
      if (!ctx.ci && !ctx.json && !ctx.quiet) {
        p.outro(pc.dim('Done'));
      }

      if (!result.success) {
        return yield* Effect.fail(ExitCode.NetworkError);
      }
    })
);

// ─────────────────────────────────────────────────────────────────────────────
// CLI Application
// ─────────────────────────────────────────────────────────────────────────────

const cli = Command.run(command, {
  name: 'atlas-net',
  version: VERSION,
  summary: Span.text('Network diagnostics CLI'),
  footer: HelpDoc.blocks([
    HelpDoc.p('Diagnostics performed:'),
    HelpDoc.p('  1. DNS Resolution - Resolves hostname to IP address'),
    HelpDoc.p('  2. TCP Connect - Tests TCP connectivity to port'),
    HelpDoc.p('  3. TLS Handshake - Verifies TLS/SSL (HTTPS only)'),
    HelpDoc.p(''),
    HelpDoc.p('Exit Codes:'),
    HelpDoc.p('  0   All diagnostics passed'),
    HelpDoc.p('  1   General error'),
    HelpDoc.p('  2   Invalid configuration'),
    HelpDoc.p('  3   Network connectivity failed'),
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point for the CLI.
 * Called from bin/atlas-net.ts
 */
export const main = async (): Promise<void> => {
  await Effect.runPromise(
    cli(process.argv).pipe(
      Effect.catchAll((exitCode) =>
        Effect.sync(() => {
          process.exitCode = typeof exitCode === 'number' ? exitCode : ExitCode.Error;
        })
      ),
      Effect.provide(NodeContext.layer)
    )
  );
};
