import { fetchRedcap } from '$lib/redcap/server';
import type { Fetch } from '$lib/types';

export interface CheckAccountPushed {
  hasPushedID: boolean;
  hasPushedEmail: boolean;
  hasPushedAccount: boolean;
  isActive: boolean;
}

export const checkAccountPushed = async (
  token: string,
  id: string,
  email: string,
  fetch: Fetch
): Promise<CheckAccountPushed> => {
  const requestData = {
    token,
    'records[0]': id,
    fields: 'id,mail,active',
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    rawOrLabel: 'label',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
  } as const;
  const user = await fetchRedcap<{ id: string; mail: string; active: string }[]>(
    fetch,
    requestData
  );
  const hasPushedID = user.length > 0 && user[0].id === id;
  const hasPushedEmail = user.length > 0 && user[0].mail === email;
  const hasPushedAccount = hasPushedID && hasPushedEmail;
  const isActive = user.length > 0 && (user[0].active === 'Oui' || user[0].active === '1');
  return { hasPushedID, hasPushedEmail, hasPushedAccount, isActive };
};

export const pushAccountToRedcap = async (token: string, payload: unknown, fetch: Fetch) => {
  const requestData = {
    token,
    content: 'record',
    action: 'import',
    format: 'json',
    type: 'flat',
    overwriteBehavior: 'normal',
    forceAutoNumber: 'false',
    data: JSON.stringify(payload),
    returnContent: 'count',
    returnFormat: 'json',
  } as const;
  const result = await fetchRedcap<{ count: number }>(fetch, requestData);
  return result;
};
