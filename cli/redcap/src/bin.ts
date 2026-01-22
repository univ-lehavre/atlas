/* eslint-disable functional/no-conditional-statements -- CLI entry point requires imperative code */
/**
 * REDCap CLI Entry Point
 *
 * Usage:
 *   redcap                    # Interactive menu (default)
 *   redcap --ci               # CI mode: run all tests and exit
 *   redcap --ci --json        # CI mode with JSON output
 *   redcap --url <url>        # Specify service URL
 */

import { NodeHttpClient, NodeRuntime } from '@effect/platform-node';
import { Effect, Layer, Console } from 'effect';
import { RedcapServiceConfigTag, RedcapServiceLive } from './services.js';
import { runInteractiveMenu } from './menu.js';
import { runCiMode } from './ci.js';

const DEFAULT_URL = 'http://localhost:3000';

interface CliArgs {
  readonly baseUrl: string;
  readonly ciMode: boolean;
  readonly jsonOutput: boolean;
}

/** Parse command line arguments */
const parseArgs = (args: readonly string[]): CliArgs => {
  const urlIndex = args.findIndex((arg) => arg === '--url' || arg === '-u');
  const nextArg = urlIndex === -1 ? undefined : args[urlIndex + 1];
  const baseUrl = nextArg ?? DEFAULT_URL;

  const ciMode = args.includes('--ci');
  const jsonOutput = args.includes('--json') || args.includes('-j');

  return { baseUrl, ciMode, jsonOutput };
};

const showHelp = (): Effect.Effect<void> =>
  Console.log(`
🔬 REDCap CLI - Test REDCap connectivity

Usage:
  redcap                     Interactive menu (default)
  redcap --ci                CI mode: run all tests and exit
  redcap --ci --json         CI mode with JSON output
  redcap --url <url>         Specify service URL (default: ${DEFAULT_URL})
  redcap --help              Show this help

Options:
  -u, --url <url>    Service base URL
  --ci               Run in CI mode (non-interactive)
  -j, --json         Output results as JSON (CI mode only)
  -h, --help         Show help
`);

const main: Effect.Effect<void> = Effect.gen(function* () {
  const args = process.argv;
  const { baseUrl, ciMode, jsonOutput } = parseArgs(args);

  if (args.includes('--help') || args.includes('-h')) {
    yield* showHelp();
    return;
  }

  const ConfigLayer = Layer.succeed(RedcapServiceConfigTag, { baseUrl });
  const HttpLayer = NodeHttpClient.layer;
  const ServiceLayer = Layer.provide(RedcapServiceLive, Layer.merge(ConfigLayer, HttpLayer));

  const program = ciMode ? runCiMode(jsonOutput) : runInteractiveMenu(baseUrl);

  yield* program.pipe(Effect.provide(ServiceLayer));
});

NodeRuntime.runMain(main);
/* eslint-enable functional/no-conditional-statements */
