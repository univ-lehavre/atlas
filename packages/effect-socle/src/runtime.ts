/**
 * Central Effect runtime helpers (écart E10,
 * [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *
 * A process (service HTTP, CLI, serveur SvelteKit) builds **one** runtime at
 * boot from its `AppLayer` (logger + config + services câblés une fois), and
 * every Effect runs through it. These helpers wrap `ManagedRuntime.make` so a
 * process only writes its `AppLayer`, not the boot/teardown plumbing.
 *
 * The runtime is **process-level**: created once, disposed on shutdown. For a
 * long-running server, {@link makeRuntimeWithShutdown} also registers
 * `SIGTERM`/`SIGINT` handlers so finalizers run on exit.
 *
 * @module
 */

import { ManagedRuntime } from 'effect';
import type { Layer } from 'effect';

/**
 * The runtime type produced from an `AppLayer` providing services `R`.
 * Errors building the layer surface as `E` (default `never` for a layer
 * whose construction cannot fail in a typed way).
 */
export type AppRuntime<R, E = never> = ManagedRuntime.ManagedRuntime<R, E>;

/**
 * Builds the process runtime from its `AppLayer`. One call per process, at
 * the entry point — never inside a library or per request.
 */
export const makeRuntime = <R, E = never>(appLayer: Layer.Layer<R, E>): AppRuntime<R, E> =>
  ManagedRuntime.make(appLayer);

/**
 * Builds the process runtime and registers graceful-shutdown handlers
 * (`SIGTERM`, `SIGINT`) that dispose it — running layer finalizers — before
 * the process exits. For long-running servers (the CRF service, SvelteKit
 * server). Returns the runtime so the caller can also dispose it explicitly
 * (e.g. in tests).
 *
 * `register` defaults to `process.once`; it is injectable so the behaviour
 * is testable without touching the real process.
 */
export const makeRuntimeWithShutdown = <R, E = never>(
  appLayer: Layer.Layer<R, E>,
  register: (signal: NodeJS.Signals, handler: () => void) => void = (signal, handler) => {
    process.once(signal, handler);
  }
): AppRuntime<R, E> => {
  const runtime = ManagedRuntime.make(appLayer);
  const shutdown = (): void => {
    void runtime.dispose();
  };
  register('SIGTERM', shutdown);
  register('SIGINT', shutdown);
  return runtime;
};
