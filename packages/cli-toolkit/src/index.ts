/**
 * `@univ-lehavre/atlas-cli-toolkit` — framework-agnostic boilerplate shared by
 * the atlas CLIs.
 *
 * Scope is deliberately narrow and I/O-policy-free: environment reading, argv
 * flag parsing and fatal-error/exit-code handling. Terminal rendering
 * (`@clack/prompts`, colours) and argument frameworks (`yargs`) stay in the
 * individual CLIs — they may not live in `packages/` (see workspace structure
 * audit).
 */

export { getEnv, requireEnv, type RequireEnvResult } from './env.js';
export { hasFlag, getFlagValue, findUnknownFlags, type FindUnknownFlagsOptions } from './flags.js';
export { runMain, type RunMainOptions, type ErrorReporter } from './run.js';
