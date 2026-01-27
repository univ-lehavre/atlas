import type { SurveyRequestItem, SurveyRequestList } from '$lib/types/api/surveys';

export const allowed_request_creation = (requests: SurveyRequestList | undefined | null): boolean =>
  requests === undefined ||
  requests === null ||
  requests.length === 0 ||
  (requests.length > 0 &&
    requests.filter((r: SurveyRequestItem) => r.form_complete !== '2').length === 0);
