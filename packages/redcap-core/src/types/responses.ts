/**
 * REDCap API response types
 */

/** Error response from REDCap API */
export interface ErrorResponse {
  readonly error: string;
  readonly code?: string;
}

/** Check if response is an error */
export const isErrorResponse = (response: unknown): response is ErrorResponse =>
  typeof response === 'object' && response !== null && 'error' in response;

/** Version response (just a string) */
export type VersionResponse = string;

/** Count response */
export interface CountResponse {
  readonly count: number;
}

/** IDs response */
export interface IdsResponse {
  readonly ids: readonly string[];
}

/** Auto IDs response */
export interface AutoIdsResponse {
  readonly auto_ids: readonly string[];
}

/** File info response */
export interface FileInfoResponse {
  readonly doc_id: number;
  readonly doc_name: string;
  readonly doc_size: number;
}

/** Survey link response */
export interface SurveyLinkResponse {
  readonly survey_link: string;
}

/** Survey queue link response */
export interface SurveyQueueLinkResponse {
  readonly survey_queue_link: string;
}

/** Survey return code response */
export interface SurveyReturnCodeResponse {
  readonly return_code: string;
}

/** Next record name response */
export interface NextRecordNameResponse {
  readonly record_name: string;
}
