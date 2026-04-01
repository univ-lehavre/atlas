/**
 * Domain types for researcher-profiles CLI.
 */

import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

/**
 * A researcher record, sourced from REDCap.
 * `userid` maps to `record_id` in the REDCap instrument.
 * File fields (oa_data, oa_pdf) are fetched separately via exportFile.
 */
export interface ResearcherRow {
  readonly userid: string;
  readonly last_name: string;
  readonly middle_name: string;
  readonly first_name: string;
  readonly orcid: string;
  /** ISO datetime of last import, or empty string if never done. */
  readonly oa_imported_at: string;
  /** ISO datetime of lock, or empty string if not locked. */
  readonly oa_locked_at: string;
  /** REDCap completion status for the openalex instrument. "2" = Complete. */
  readonly openalex_complete: string;
}

/**
 * All researcher data stored as a single JSON file in REDCap (`oa_data`).
 */
export interface ResearcherData {
  readonly fullnames: readonly {
    name: string;
    authorId: string;
    selected: boolean;
  }[];
  readonly affiliations: readonly {
    affiliation: string;
    selected: boolean;
  }[];
  readonly oa_references: readonly WorksResult[];
  readonly final_references: readonly WorksResult[];
}

export const emptyResearcherData: ResearcherData = {
  fullnames: [],
  affiliations: [],
  oa_references: [],
  final_references: [],
};
