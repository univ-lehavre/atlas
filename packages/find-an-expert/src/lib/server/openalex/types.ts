import { z } from 'zod';

/**
 * OpenAlex institution from autocomplete response.
 */
export const OpenAlexInstitution = z.object({
  id: z.string(),
  display_name: z.string(),
  hint: z.string().nullable(),
  cited_by_count: z.number().int().nonnegative(),
  works_count: z.number().int().nonnegative().nullable(),
  entity_type: z.literal('institution'),
  external_id: z.string().nullable(),
});

export type TOpenAlexInstitution = z.infer<typeof OpenAlexInstitution>;

/**
 * OpenAlex autocomplete response metadata.
 */
export const OpenAlexAutocompleteMeta = z.object({
  count: z.number().int().nonnegative(),
  db_response_time_ms: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
});

export type TOpenAlexAutocompleteMeta = z.infer<typeof OpenAlexAutocompleteMeta>;

/**
 * OpenAlex autocomplete response for institutions.
 */
export const OpenAlexAutocompleteResponse = z.object({
  meta: OpenAlexAutocompleteMeta,
  results: z.array(OpenAlexInstitution),
});

export type TOpenAlexAutocompleteResponse = z.infer<typeof OpenAlexAutocompleteResponse>;

/**
 * Simplified institution for client-side use.
 */
export const Institution = z.object({
  id: z.string(),
  displayName: z.string(),
  location: z.string().nullable(),
  citedByCount: z.number().int().nonnegative(),
  worksCount: z.number().int().nonnegative().nullable(),
});

export type TInstitution = z.infer<typeof Institution>;

/**
 * Institution search result response.
 */
export const InstitutionSearchResponse = z.object({
  institutions: z.array(Institution),
  meta: z.object({
    count: z.number().int().nonnegative(),
    responseTimeMs: z.number().int().nonnegative(),
  }),
});

export type TInstitutionSearchResponse = z.infer<typeof InstitutionSearchResponse>;

/**
 * OpenAlex works endpoint meta response.
 */
export const OpenAlexWorksMeta = z.object({
  count: z.number().int().nonnegative(),
  db_response_time_ms: z.number().int().nonnegative(),
});

export type TOpenAlexWorksMeta = z.infer<typeof OpenAlexWorksMeta>;

/**
 * OpenAlex works response (minimal, only meta needed for counting).
 */
export const OpenAlexWorksResponse = z.object({
  meta: OpenAlexWorksMeta,
});

export type TOpenAlexWorksResponse = z.infer<typeof OpenAlexWorksResponse>;

/**
 * Works count response for client.
 */
export const WorksCountResponse = z.object({
  count: z.number().int().nonnegative(),
  responseTimeMs: z.number().int().nonnegative(),
  fromDate: z.string(),
  institutionCount: z.number().int().nonnegative(),
});

export type TWorksCountResponse = z.infer<typeof WorksCountResponse>;

/**
 * OpenAlex authors endpoint meta response.
 */
export const OpenAlexAuthorsMeta = z.object({
  count: z.number().int().nonnegative(),
  db_response_time_ms: z.number().int().nonnegative(),
});

export type TOpenAlexAuthorsMeta = z.infer<typeof OpenAlexAuthorsMeta>;

/**
 * OpenAlex authors response (minimal, only meta needed for counting).
 */
export const OpenAlexAuthorsResponse = z.object({
  meta: OpenAlexAuthorsMeta,
});

export type TOpenAlexAuthorsResponse = z.infer<typeof OpenAlexAuthorsResponse>;

/**
 * Article count for a specific year or "before" for older articles.
 */
export const YearlyArticleCount = z.object({
  /** The year (e.g., 2024) or 'before' for articles older than the displayed range */
  year: z.union([z.number().int(), z.literal('before')]),
  /** Number of articles published in that year/period */
  count: z.number().int().nonnegative(),
});

export type TYearlyArticleCount = z.infer<typeof YearlyArticleCount>;

/**
 * OpenAlex group_by item for publication year.
 */
export const OpenAlexGroupByItem = z.object({
  key: z.string(),
  key_display_name: z.string(),
  count: z.number().int().nonnegative(),
});

export type TOpenAlexGroupByItem = z.infer<typeof OpenAlexGroupByItem>;

/**
 * OpenAlex works response with group_by (for year statistics).
 */
export const OpenAlexWorksGroupByResponse = z.object({
  meta: OpenAlexWorksMeta,
  group_by: z.array(OpenAlexGroupByItem),
});

export type TOpenAlexWorksGroupByResponse = z.infer<typeof OpenAlexWorksGroupByResponse>;

/**
 * Institution statistics response for client.
 * Includes works count, articles count, and authors count.
 */
export const InstitutionStatsResponse = z.object({
  /** Total number of works (all types) */
  worksCount: z.number().int().nonnegative(),
  /** Number of articles (type:article only) */
  articlesCount: z.number().int().nonnegative(),
  /** Articles count broken down by year */
  articlesByYear: z.array(YearlyArticleCount),
  /** Number of distinct authors affiliated with the institutions */
  authorsCount: z.number().int().nonnegative(),
  /** Total response time in milliseconds */
  responseTimeMs: z.number().int().nonnegative(),
  /** Number of institutions queried */
  institutionCount: z.number().int().nonnegative(),
});

export type TInstitutionStatsResponse = z.infer<typeof InstitutionStatsResponse>;
