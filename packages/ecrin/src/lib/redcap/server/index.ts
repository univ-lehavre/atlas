import { REDCAP_URL } from '$env/static/private';
import type { Fetch } from '$lib/types';

export const fetchRedcap = async <T>(
  fetch: Fetch,
  requestData: Record<string, string>
): Promise<T> => {
  const DATA = new URLSearchParams(requestData).toString();
  const response = await fetch(REDCAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  return response.json() as T;
};
