import type { EAV } from '$lib/types';
import { generateGraph } from '$lib/graph';
import { redcapApiToken, redcapUrl } from '$lib/server/env';
import type Graph from 'graphology';

export const fetchRecordsFromCrf = async (params: Record<string, string>) => {
  const requestData = { token: redcapApiToken(), ...params } as Record<string, string>;
  const DATA = new URLSearchParams(requestData).toString();
  const response = await fetch(redcapUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: DATA,
  });
  const data = (await response.json()) as EAV[];
  console.log('Fetched data from REDCap:', data);
  return data;
};

export const fetchGraphForRecord = async (recordId: string) => {
  const params: Record<string, string> = {
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'eav',
    'records[0]': recordId,
    csvDelimiter: '',
    rawOrLabel: 'label',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
  };
  const data: EAV[] = await fetchRecordsFromCrf(params);
  const graph: Graph = generateGraph(data);
  return graph;
};

export const fetchGlobalGraph = async () => {
  const params: Record<string, string> = {
    content: 'record',
    action: 'export',
    format: 'json',
    type: 'eav',
    csvDelimiter: '',
    rawOrLabel: 'label',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
  };
  const data: EAV[] = await fetchRecordsFromCrf(params);
  const graph: Graph = generateGraph(data);
  return graph;
};
