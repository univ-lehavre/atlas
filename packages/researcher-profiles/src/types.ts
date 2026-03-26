/**
 * Domain types for researcher-profiles CLI.
 */

/**
 * A researcher record, sourced from CSV or REDCap.
 * `userid` maps to `record_id` in the REDCap instrument.
 */
export interface ResearcherRow {
  readonly userid: string;
  readonly last_name: string;
  readonly middle_name: string;
  readonly first_name: string;
  readonly orcid: string;
  /** ISO datetime of last OpenAlex author ID import, or empty string if never done. */
  readonly oa_author_ids_imported_date: string;
}

/**
 * Payload written to REDCap — only `oa_references` is updated.
 * `userid` maps to `record_id` in the REDCap API.
 */
export interface OaReferencesRecord {
  readonly userid: string;
  readonly oa_references: string;
}
