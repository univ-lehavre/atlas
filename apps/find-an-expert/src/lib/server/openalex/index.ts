import { Effect } from 'effect';
import { OPENALEX_API_TOKEN } from '$env/static/private';
import {
  searchInstitutions as searchInstitutionsEffect,
  getWorksCount as getWorksCountEffect,
  getInstitutionStats as getInstitutionStatsEffect,
  type OpenAlexConfig,
  type InstitutionSearchResult,
  type WorksCountResult,
  type InstitutionStatsResult,
} from '@univ-lehavre/atlas-fetch-openalex';

const getConfig = (): OpenAlexConfig => ({
  userAgent: 'find-an-expert (https://github.com/univ-lehavre/atlas)',
  apiKey: OPENALEX_API_TOKEN || undefined,
});

export const searchInstitutions = (query: string): Promise<InstitutionSearchResult> =>
  Effect.runPromise(searchInstitutionsEffect(query, getConfig()));

export const getWorksCount = (institutionIds: string[]): Promise<WorksCountResult> =>
  Effect.runPromise(getWorksCountEffect(institutionIds, getConfig()));

export const getInstitutionStats = (institutionIds: string[]): Promise<InstitutionStatsResult> =>
  Effect.runPromise(getInstitutionStatsEffect(institutionIds, getConfig()));

// Type aliases for backward compatibility with SvelteKit components
export type TInstitution = InstitutionSearchResult['institutions'][number];
export type TInstitutionStatsResponse = InstitutionStatsResult;
