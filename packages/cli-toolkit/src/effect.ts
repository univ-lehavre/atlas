/**
 * Effect interop helpers shared by the Effect-based atlas CLIs.
 *
 * Several CLIs build an Effect program and run it with terminal logging
 * silenced (the CLI draws its own UI via prompts, so Effect's default logger
 * would be noise). `quiet` factors out that `Logger.withMinimumLogLevel(None)`
 * pipe so the idiom stays identical across CLIs.
 *
 * This module is pure: it transforms an `Effect`, it does not run it. Each CLI
 * keeps its own runner (`Effect.runPromiseExit`, `NodeRuntime.runMain`, …).
 */

import { Logger, LogLevel } from 'effect';
import type { Effect } from 'effect';

/**
 * Silences the default Effect logger for `program` by raising the minimum log
 * level to `None`. Returns a new Effect with the same success/error/context
 * channels; nothing is executed.
 *
 * @example
 * Effect.runPromiseExit(quiet(program));
 * // equivalent to
 * Effect.runPromiseExit(program.pipe(Logger.withMinimumLogLevel(LogLevel.None)));
 */
export const quiet = <A, E, R>(program: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  program.pipe(Logger.withMinimumLogLevel(LogLevel.None));
