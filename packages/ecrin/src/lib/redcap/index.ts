import type { Fetch, Log } from '$lib/types';

interface Properties {
  hasPushedID: boolean;
  hasPushedEmail: boolean;
  hasPushedAccount: boolean;
}

const getProperties = async (fetch: Fetch): Promise<Properties> => {
  const response = await fetch(`/api/has-pushed-account`);
  const log = (await response.json()) as Log;
  const result = log.result as Properties;
  return { ...result };
};

const getURL = async (fetch: Fetch): Promise<string> => {
  const URLResponse = await fetch(`/api/pull-survey-url`);
  const log = (await URLResponse.json()) as Log;
  return log.result as string;
};

const getAll = async (fetch: Fetch): Promise<Properties & { url: string | null }> => {
  const properties = await getProperties(fetch);
  const url = properties.hasPushedAccount ? await getURL(fetch) : null;
  return { ...properties, url };
};

export { getAll };
