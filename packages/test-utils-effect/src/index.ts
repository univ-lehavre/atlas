/**
 * Shared Effect test helpers for the atlas monorepo (écart E14, ADR 0049).
 *
 * The campaign replaces ad-hoc `vi.mock(...)` of plain function imports with
 * Effect **services** (`Context.Tag`) provided as **test layers**, and the
 * manual `await Effect.runPromise(eff)` dance with `it.effect`. These helpers
 * give every package a single, consistent way to:
 *
 * - silence Effect logs during tests ({@link TestLoggerLayer});
 * - build a recording service double — the layer-native replacement for
 *   `vi.mocked(fn).mock.calls` ({@link recordingLayer}, {@link makeRecorder}).
 *
 * Nothing here is built or published: the package is consumed only by other
 * packages' test files (`main`/`types` point at the TypeScript source).
 *
 * @module
 */

import type { Context } from "effect";
import { Layer } from "effect";
import { QuietLoggerLayer } from "@univ-lehavre/atlas-effect-socle";

/**
 * Logger layer that silences all Effect logs during tests. A re-export of the
 * socle's {@link QuietLoggerLayer} (écart E8) so tests share the one quiet
 * layer instead of re-applying `withMinimumLogLevel(None)` file by file.
 */
export const TestLoggerLayer: Layer.Layer<never> = QuietLoggerLayer;

/**
 * A recorder over the calls made to a service double. Replaces inspecting
 * `vi.mocked(fn).mock.calls`: assertions read {@link Recorder.calls} (every
 * argument tuple, in order) and the convenience accessors below.
 */
export interface Recorder {
  /** Every recorded call, as `[methodName, ...args]`, in invocation order. */
  readonly calls: readonly (readonly [string, ...unknown[]])[];
  /** Calls to a single method, each as its argument tuple. */
  readonly callsTo: (method: string) => readonly (readonly unknown[])[];
  /** How many times `method` was invoked. */
  readonly countTo: (method: string) => number;
  /** Whether `method` was invoked at least once. */
  readonly called: (method: string) => boolean;
  /** Drop all recorded calls (e.g. between phases of one test). */
  readonly reset: () => void;
}

/** Internal: a recorder plus the function that appends to it. */
interface RecorderInternals {
  readonly recorder: Recorder;
  readonly record: (method: string, args: readonly unknown[]) => void;
}

const makeRecorderInternals = (): RecorderInternals => {
  const log: (readonly [string, ...unknown[]])[] = [];
  const recorder: Recorder = {
    get calls() {
      return log;
    },
    callsTo: (method) =>
      log.filter(([m]) => m === method).map(([, ...args]) => args),
    countTo: (method) => log.filter(([m]) => m === method).length,
    called: (method) => log.some(([m]) => m === method),
    reset: () => {
      log.length = 0;
    },
  };
  return {
    recorder,
    record: (method, args) => {
      log.push([method, ...args]);
    },
  };
};

/**
 * Builds a standalone {@link Recorder} plus the `record(method, args)` function
 * that appends to it. Use when a test builds its own double by hand and wants
 * to record calls into it: call `record("name", [arg])` from the stub, assert
 * on `recorder.calls`. (For the common case — wrapping a service impl — prefer
 * {@link recordingLayer}, which does the wrapping for you.)
 */
export const makeRecorder = (): {
  readonly recorder: Recorder;
  readonly record: (method: string, args: readonly unknown[]) => void;
} => makeRecorderInternals();

/**
 * Wraps every function-valued property of a service implementation so each
 * call is recorded, then provides it as a `Layer.succeed(tag, …)`. Returns the
 * layer together with the {@link Recorder} to assert on.
 *
 * This is the layer-native replacement for `vi.fn()` doubles: instead of
 * `vi.mock("…")` + `vi.mocked(fn).mock.calls`, a test provides
 * `recordingLayer(MyService, impl).layer` and asserts on `.recorder.calls`.
 *
 * Non-function properties (constants, refs) are passed through untouched; the
 * recorded arguments are the raw arguments the double received.
 */
export const recordingLayer = <I, S extends object>(
  tag: Context.Tag<I, S>,
  impl: S,
): { readonly layer: Layer.Layer<I>; readonly recorder: Recorder } => {
  const { recorder, record } = makeRecorderInternals();
  const entries = Object.entries(impl as Record<string, unknown>);
  const wrapped = Object.fromEntries(
    entries.map(([key, value]) =>
      typeof value === "function"
        ? [
            key,
            (...args: unknown[]) => {
              record(key, args);
              return (value as (...a: unknown[]) => unknown)(...args);
            },
          ]
        : [key, value],
    ),
  ) as S;
  return { layer: Layer.succeed(tag, wrapped), recorder };
};

/**
 * Like {@link recordingLayer} but for a service whose value is a **bare
 * function** rather than an object of methods (e.g. a `FetchOnePage`-style tag
 * holding a single callable). Each call is recorded under `recordedAs` (default
 * `"call"`) before delegating to `impl`. Returns the layer plus the
 * {@link Recorder}.
 *
 * This is the function-shaped counterpart to `recordingLayer`: the layer-native
 * replacement for `vi.mock` + `vi.mocked(fn).mock.calls` when the mocked thing
 * is a lone function exposed as a service.
 */
export const recordingFnLayer = <I, F extends (...args: never[]) => unknown>(
  tag: Context.Tag<I, F>,
  impl: F,
  recordedAs = "call",
): { readonly layer: Layer.Layer<I>; readonly recorder: Recorder } => {
  const { recorder, record } = makeRecorderInternals();
  const delegate = impl as unknown as (...a: unknown[]) => unknown;
  const wrapped = ((...args: unknown[]) => {
    record(recordedAs, args);
    return delegate(...args);
  }) as unknown as F;
  return { layer: Layer.succeed(tag, wrapped), recorder };
};
