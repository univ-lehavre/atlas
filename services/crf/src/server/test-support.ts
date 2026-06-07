/**
 * Test helpers for the CRF service.
 *
 * Builds a test runtime whose `AppLayer` provides a **mock** `CrfClientService`,
 * so route tests inject the client by layer (ADR 0049) instead of mocking the
 * former `./client.js` module. The runtime is the same shape routes receive in
 * production ([boot.ts](./boot.ts)).
 *
 * @module
 */

import { Layer, LogLevel, Logger } from 'effect';
import { CrfClientService, type CrfClient } from '@univ-lehavre/atlas-crf-client';
import { makeRuntime } from '@univ-lehavre/atlas-effect-socle';
import type { CrfRuntime } from './boot.js';

/**
 * Builds a {@link CrfRuntime} backed by the given (partial) client mock. The
 * logger is silenced so tests stay quiet. Dispose it after the test
 * (`await runtime.dispose()`), as in production shutdown.
 */
export const makeTestRuntime = (client: Partial<CrfClient>): CrfRuntime =>
  makeRuntime(
    Layer.mergeAll(
      Logger.minimumLogLevel(LogLevel.None),
      Layer.succeed(CrfClientService, client as CrfClient)
    )
  );
