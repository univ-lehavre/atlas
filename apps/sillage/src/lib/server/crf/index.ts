import type { Fetch } from '$lib/types';
import { REDCAP_API_TOKEN } from '$env/static/private';
import { PUBLIC_REDCAP_URL } from '$env/static/public';

// Minimal REDCap API wrapper. Cloned from amarre's `server/crf/index.ts`
// to keep the wire-level patterns identical between apps.

const defaultParameters = {
  content: 'record',
  action: 'export',
  format: 'json',
  type: 'flat',
  records: '',
  fields: '',
  forms: '',
  rawOrLabel: 'raw',
  rawOrLabelHeaders: 'raw',
  exportCheckboxLabel: 'false',
  exportSurveyFields: 'false',
  exportDataAccessGroups: 'false',
  returnFormat: 'json',
  filterLogic: '',
};

const fetchCrf = async (
  params: Record<string, string>,
  context: { fetch: Fetch }
): Promise<Response> => {
  const requestData: Record<string, string> = {
    ...defaultParameters,
    ...params,
    token: REDCAP_API_TOKEN,
  };
  const body = new URLSearchParams(requestData).toString();
  return context.fetch(PUBLIC_REDCAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
};

export const fetchCrfJSON = async <T>(
  params: Record<string, string>,
  context: { fetch: Fetch }
): Promise<T> => {
  const response = await fetchCrf(params, context);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REDCap API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // REDCap returns `{ error: "..." }` for API-level errors even with 200.
  if (data && typeof data === 'object' && 'error' in data && !Array.isArray(data)) {
    throw new Error(`REDCap API error: ${(data as { error: string }).error}`);
  }

  return data as T;
};

const FILTER_LOGIC_ESCAPE_PATTERN = /["\\]/g;

/**
 * Escape special chars in a filterLogic value (backslashes first, then
 * double quotes). Mirrors amarre's `escapeFilterLogicValue` ; REDCap's
 * lexer is shaky on `\"` (cf. amarre's skipped filterLogic test) but
 * the escape is the right contract to write.
 */
export const escapeFilterLogicValue = (value: string): string =>
  value.replace(FILTER_LOGIC_ESCAPE_PATTERN, (m) => (m === '\\' ? '\\\\' : '\\"'));
