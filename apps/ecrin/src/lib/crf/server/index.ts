import { redcapUrl } from '$lib/server/env';
import type { Fetch } from '$lib/types';

export const fetchCrf = async <T>(
  fetch: Fetch,
  requestData: Record<string, string>
): Promise<T> => {
  const DATA = new URLSearchParams(requestData).toString();
  const response = await fetch(redcapUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  return response.json() as T;
};
