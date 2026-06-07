/**
 * Server-only Effect runtime for find-an-expert (écart E10 côté app,
 * [ADR 0045](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0045-runtime-central-effect.md)).
 *
 * A single **process-level** runtime, created once at module load and disposed
 * on `SIGTERM`/`SIGINT`. Server handlers run their `lib/server/*` Effects on it
 * via `runEffectHandler({ runtime })`
 * ([ADR 0046](https://github.com/univ-lehavre/atlas/blob/main/docs/src/content/docs/decisions/0046-frontiere-effect-sveltekit/)).
 * The logger is silenced (`QuietLoggerLayer`): the API returns JSON, not logs.
 *
 * This module lives under `lib/server/` and imports `effect` — it is
 * **server-only** and must never be imported from a `.svelte` component or a
 * shared client module, or `effect` leaks into the client bundle (ADR 0046).
 *
 * @module
 */

import { Match } from 'effect';
import { makeRuntimeWithShutdown, QuietLoggerLayer } from '@univ-lehavre/atlas-effect-socle';
import type { EffectErrorMapper } from '@univ-lehavre/atlas-sveltekit-handler/effect';

/**
 * The find-an-expert server runtime. The `AppLayer` is just the silenced
 * logger today; OpenAlex config is read per call in `lib/server/citation`
 * (12-factor late-binding for `OPENALEX_USER_AGENT`), not frozen here.
 */
export const serverRuntime = makeRuntimeWithShutdown(QuietLoggerLayer);

/** Tagged errors surfaced by the citation (OpenAlex) Effects. */
interface CitationError {
  readonly _tag: 'FetchError' | 'ResponseParseError';
  readonly message: string;
}

/**
 * Maps an OpenAlex citation error to find-an-expert's flat `{ code, message }`
 * shape and an HTTP status. Upstream fetch/parse failures are **502 Bad
 * Gateway** (the typed error no longer collapses to an opaque 500 — écart E6,
 * ADR 0046/0048). Anything else falls back to 500.
 */
export const mapCitationError: EffectErrorMapper<CitationError> = (error) =>
  Match.value(error).pipe(
    Match.when({ _tag: 'FetchError' }, (e) => ({
      body: { code: 'upstream_error', message: e.message },
      status: 502,
    })),
    Match.when({ _tag: 'ResponseParseError' }, (e) => ({
      body: { code: 'upstream_parse_error', message: e.message },
      status: 502,
    })),
    Match.orElse(() => ({
      body: { code: 'unexpected_error', message: 'Unknown error' },
      status: 500,
    }))
  );
