export const getSurveyUrl = async (
  token: string,
  url: string,
  record: string,
  instrument = ''
): Promise<string> => {
  const requestData = {
    token,
    content: 'surveyLink',
    format: 'json',
    instrument,
    event: '',
    record,
    returnFormat: 'json',
  } as const;
  const DATA = new URLSearchParams(requestData as Record<string, string>).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  const text = await response.text();
  return text;
};

export const deleteSurveyRecord = async (token: string, url: string, record: string) => {
  const requestData = {
    token,
    action: 'delete',
    content: 'record',
    'records[0]': record,
    instrument: '',
    returnFormat: 'json',
  } as const;
  const DATA = new URLSearchParams(requestData as Record<string, string>).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  const result = await response.text();
  return result;
};

export const downloadSurvey = async (token: string, url: string, record: string) => {
  const requestData = {
    token,
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'flat',
    csvDelimiter: '',
    'records[0]': record,
    rawOrLabel: 'label',
    rawOrLabelHeaders: 'label',
    exportCheckboxLabel: 'true',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
  } as const;
  const DATA = new URLSearchParams(requestData as Record<string, string>).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  const result = await response.json();
  return result;
};
