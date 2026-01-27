import { REDCAP_API_TOKEN } from '$env/static/private';
import { fetchRedcap } from '$lib/redcap/server';
import type { Fetch } from '$lib/types';
import { transformToName } from '../../transformers/build-name';

interface Contact {
  id: string;
  last_name: string;
  first_name: string;
  middle_name: string;
}

export const listUsersFromRedcap = async (
  fetch: Fetch
): Promise<{ id: string; name: string }[]> => {
  const requestData = {
    token: REDCAP_API_TOKEN,
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    'fields[0]': 'last_name',
    'fields[1]': 'first_name',
    'fields[2]': 'middle_name',
    'fields[3]': 'id',
    rawOrLabel: 'raw',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
  };
  const contacts = await fetchRedcap<Contact[]>(fetch, requestData);
  const result = contacts.map((item) => ({
    id: item.id,
    name: transformToName(item.first_name, item.middle_name, item.last_name),
  }));
  return result;
};

export const fetchUserId = async (fetch: Fetch, email: string): Promise<string | null> => {
  const requestData = {
    token: REDCAP_API_TOKEN,
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    'fields[0]': 'id',
    'forms[0]': 'contact',
    rawOrLabel: 'raw',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
    filterLogic: `[mail] = "${email}"`,
  };
  const contacts = await fetchRedcap<{ id: string }[]>(fetch, requestData);
  const result = contacts.length === 1 ? contacts[0].id : null;
  return result;
};

export const mapAppwriteUserToProfile = (
  user: Record<string, unknown> | null,
  fallbackId?: string
) => {
  if (!user) return { id: fallbackId ?? null, email: null, name: null };
  const result = {
    id: (user['$id'] as string) ?? fallbackId ?? null,
    email: (user['email'] as string) ?? null,
    labels: (user['labels'] as string[]) ?? [],
  };
  return result;
};
