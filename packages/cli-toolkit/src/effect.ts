/**
 * Effect interop + runner shared by the Effect-based atlas CLIs.
 *
 * Two concerns, both behind the `./effect` subpath so the base CLI helpers
 * stay free of an `effect` runtime dependency:
 *
 * - {@link quiet}: silence the default Effect logger for a program (legacy
 *   helper, kept for transition).
 * - {@link runEffectCli}: the **single** CLI bootstrap (écart E11,
 *   [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *   Runs a CLI program on a central runtime that provides a silenced logger
 *   (CLIs draw their own UI via prompts) and `NodeContext`, mapping a failed
 *   `ExitCode` to `process.exitCode`. Replaces the per-CLI `NodeRuntime.runMain`
 *   / `Effect.runPromiseExit` / ad-hoc `runPromise` runners.
 *
 * @module
 */

import { Effect, Logger, LogLevel } from 'effect';
import type { Effect as EffectType } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { makeRuntime, QuietLoggerLayer } from '@univ-lehavre/atlas-effect-socle';

/**
 * Silences the default Effect logger for `program` by raising the minimum log
 * level to `None`. Returns a new Effect; nothing is executed.
 *
 * @deprecated Prefer {@link runEffectCli}, whose runtime already silences the
 * logger via `QuietLoggerLayer`. Kept for programs not yet migrated.
 */
export const quiet = <A, E, R>(program: EffectType.Effect<A, E, R>): EffectType.Effect<A, E, R> =>
  program.pipe(Logger.withMinimumLogLevel(LogLevel.None));

/** Options for {@link runEffectCli}. */
export interface RunEffectCliOptions {
  /**
   * Exit code used when the program fails with a non-numeric error
   * (default `1`). When the program fails with a **number** (an `ExitCode`),
   * that number is used as-is.
   */
  readonly fallbackExitCode?: number;
}

/**
 * Runs a CLI Effect program on the central CLI runtime and resolves once it
 * settles. The runtime provides:
 *
 * - a **silenced** logger (`QuietLoggerLayer`) — CLIs render their own output;
 * - `NodeContext` — required by `@effect/cli` programs.
 *
 * Exit-code contract: the program surfaces a failure as an `ExitCode` (a
 * `number`) via its own `Effect.fail`. `runEffectCli` catches it and sets
 * `process.exitCode` (numeric code as-is; any other error → `fallbackExitCode`).
 * It never calls `process.exit` itself, letting the event loop drain. The
 * runtime is disposed before returning.
 *
 * @example
 * // bin/atlas-foo.ts
 * import { runEffectCli } from '@univ-lehavre/atlas-cli-toolkit/effect';
 * import { program } from '../commands/index.js';
 * await runEffectCli(program);
 */
export const runEffectCli = async <A, E>(
  program: EffectType.Effect<A, E, NodeContext.NodeContext>,
  options: RunEffectCliOptions = {}
): Promise<void> => {
  const { fallbackExitCode = 1 } = options;
  const runtime = makeRuntime(QuietLoggerLayer);
  try {
    await runtime.runPromise(
      program.pipe(
        Effect.provide(NodeContext.layer),
        Effect.catchAll((error) =>
          Effect.sync(() => {
            process.exitCode = typeof error === 'number' ? error : fallbackExitCode;
          })
        )
      )
    );
  } finally {
    await runtime.dispose();
  }
};
