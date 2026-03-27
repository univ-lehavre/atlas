/**
 * Domain types for researcher-profiles CLI.
 */

/**
 * A researcher record, sourced from REDCap.
 * `userid` maps to `record_id` in the REDCap instrument.
 * File fields (oa_references, final_references) are fetched separately via exportFile.
 */
export interface ResearcherRow {
  readonly userid: string;
  readonly last_name: string;
  readonly middle_name: string;
  readonly first_name: string;
  readonly orcid: string;
  /** ISO datetime of last OpenAlex author ID import, or empty string if never done. */
  readonly oa_author_ids_imported_date: string;
  /** ISO datetime of last OpenAlex works import, or empty string if never done. */
  readonly oa_references_imported_at: string;
  /** ISO datetime of last final references import, or empty string if never done. */
  readonly final_references_imported_at: string;
  /** ISO datetime of last raw references import, or empty string if never done. */
  readonly raw_references_imported_at: string;
  /** REDCap completion status for the references_openalex instrument. "2" = Complete. */
  readonly references_openalex_complete: string;
}
