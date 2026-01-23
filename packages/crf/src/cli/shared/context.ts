/**
 * CLI context and environment detection utilities.
 *
 * Provides a unified context for CLI operations including CI detection,
 * output mode handling, and verbosity levels.
 *
 * @module
 */

import { Context, Layer } from 'effect';

/**
 * CLI output modes.
 */
export type OutputMode = 'human' | 'json' | 'ci';

/**
 * CLI context containing runtime configuration.
 */
export interface CliContext {
  /** Whether running in CI mode (auto-detected or explicit) */
  readonly ci: boolean;
  /** Whether to output JSON instead of human-readable text */
  readonly json: boolean;
  /** Whether verbose logging is enabled */
  readonly verbose: boolean;
  /** Whether quiet mode is enabled (suppress non-essential output) */
  readonly quiet: boolean;
  /** Resolved output mode based on flags */
  readonly outputMode: OutputMode;
}

/**
 * Effect service tag for CLI context.
 */
export class CliContextService extends Context.Tag('CliContext')<CliContextService, CliContext>() {}

/**
 * Detects if running in a CI environment.
 *
 * Checks for:
 * - Non-interactive TTY
 * - CI environment variable
 * - CONTINUOUS_INTEGRATION environment variable
 * - GITHUB_ACTIONS environment variable
 * - GITLAB_CI environment variable
 * - JENKINS_URL environment variable
 *
 * @returns true if CI environment is detected
 *
 * @example
 * ```typescript
 * if (detectCi()) {
 *   // Disable interactive prompts
 * }
 * ```
 */
export const detectCi = (): boolean =>
  !process.stdout.isTTY ||
  Boolean(process.env['CI']) ||
  Boolean(process.env['CONTINUOUS_INTEGRATION']) ||
  Boolean(process.env['GITHUB_ACTIONS']) ||
  Boolean(process.env['GITLAB_CI']) ||
  Boolean(process.env['JENKINS_URL']);

/**
 * Resolves the output mode based on CLI flags.
 */
export const resolveOutputMode = (options: {
  readonly ci: boolean;
  readonly json: boolean;
}): OutputMode => {
  if (options.json) return 'json';
  if (options.ci || detectCi()) return 'ci';
  return 'human';
};

/**
 * Creates a CLI context from options.
 */
export const createCliContext = (options: {
  readonly ci?: boolean;
  readonly json?: boolean;
  readonly verbose?: boolean;
  readonly quiet?: boolean;
}): CliContext => {
  const ci = options.ci ?? detectCi();
  const json = options.json ?? false;
  const verbose = options.verbose ?? false;
  const quiet = options.quiet ?? false;
  const outputMode = resolveOutputMode({ ci, json });

  return { ci, json, verbose, quiet, outputMode };
};

/**
 * Creates a Layer providing CLI context.
 */
export const makeCliContextLayer = (options: {
  readonly ci?: boolean;
  readonly json?: boolean;
  readonly verbose?: boolean;
  readonly quiet?: boolean;
}): Layer.Layer<CliContextService> => Layer.succeed(CliContextService, createCliContext(options));

/**
 * Standard exit codes for CLI applications.
 */
export const ExitCode = {
  /** Successful execution */
  Success: 0,
  /** General error */
  Error: 1,
  /** Invalid configuration or arguments */
  InvalidConfig: 2,
  /** Network or connectivity error */
  NetworkError: 3,
  /** Authentication or authorization error */
  AuthError: 4,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
