import { Effect } from 'effect';
import { openalexApiToken } from '$lib/server/env';
import { env as dynamicEnv } from '$env/dynamic/private';
import {
  searchInstitutions as searchInstitutionsEffect,
  getWorksCount as getWorksCountEffect,
  getInstitutionStats as getInstitutionStatsEffect,
  FetchOnePageLive,
  type CitationConfig,
  type InstitutionSearchResult,
  type WorksCountResult,
  type InstitutionStatsResult,
} from '@univ-lehavre/atlas-citation-fetch';

// OpenAlex ToS asks consumers in the "polite pool" to identify themselves
// via a User-Agent containing a contact (mailto or URL). We accept a
// config from env so the institutional mailto isn't hardcoded in a
// public repository.
const DEFAULT_USER_AGENT = 'find-an-expert/1.0 (https://github.com/univ-lehavre/atlas)';

// Read per call (not captured) so OPENALEX_USER_AGENT can be re-bound at
// runtime — 12-factor late-binding, the explicit guard of ADR 0045.
const getConfig = (): CitationConfig => ({
  userAgent: dynamicEnv.OPENALEX_USER_AGENT || DEFAULT_USER_AGENT,
  apiKey: openalexApiToken(),
});

// Effect errors surfaced by the citation functions (FetchError |
// ResponseParseError). Inferred from the upstream signatures. The upstream now
// carries a FetchOnePage requirement (écart E14) which these wrappers discharge
// via FetchOnePageLive, so the alias keeps `R = never` for the handler.
type CitationEffect<A> =
  ReturnType<typeof searchInstitutionsEffect> extends Effect.Effect<unknown, infer E, infer _R>
    ? Effect.Effect<A, E>
    : never;

/**
 * The `lib/server/*` functions return the **raw Effect** (ADR 0046): the
 * handler executes it on the server runtime via `runEffectHandler`, so a typed
 * upstream failure keeps its error channel instead of being flattened. Config
 * is read at call time (above) for 12-factor late-binding.
 */
// FetchOnePage enters here, at the server citation frontier (écart E14,
// ADR 0049) : the real network fetch is provided via FetchOnePageLive so the
// raw Effect returned to the SvelteKit handler (ADR 0046) carries no service
// requirement.
export const searchInstitutions = (query: string): CitationEffect<InstitutionSearchResult> =>
  searchInstitutionsEffect(query, getConfig()).pipe(Effect.provide(FetchOnePageLive));

export const getWorksCount = (institutionIds: string[]): CitationEffect<WorksCountResult> =>
  getWorksCountEffect(institutionIds, getConfig()).pipe(Effect.provide(FetchOnePageLive));

export const getInstitutionStats = (
  institutionIds: string[]
): CitationEffect<InstitutionStatsResult> =>
  getInstitutionStatsEffect(institutionIds, getConfig()).pipe(Effect.provide(FetchOnePageLive));

// Type aliases for backward compatibility with SvelteKit components
export type TInstitution = InstitutionSearchResult['institutions'][number];
export type TInstitutionStatsResponse = InstitutionStatsResult;
