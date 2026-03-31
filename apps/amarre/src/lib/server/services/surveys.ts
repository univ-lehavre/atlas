import type { Fetch } from '$lib/types';
import { fetchRedcapJSON, fetchRedcapText, fetchRedcapBuffer } from '$lib/server/redcap';
import { ID } from 'node-appwrite';
import type { TUser } from '$lib/types/api/user';
import type { SurveyRequestItem } from '$lib/types/api/surveys';

/**
 * Escapes special characters in a value to be used in REDCap filterLogic.
 * This prevents injection attacks by escaping double quotes and backslashes.
 * @param value - The value to escape
 * @returns The escaped value safe for use in filterLogic
 */
const escapeFilterLogicValue = (value: string): string => {
  // Escape backslashes first, then double quotes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

export const getSurveyUrl = async (
  record: string,
  instrument: string,
  context: { fetch: Fetch }
): Promise<string> => {
  const result = await fetchRedcapText({ content: 'surveyLink', instrument, record }, context);
  return result;
};

export const downloadSurvey = async (
  userid: string,
  context: { fetch: Fetch }
): Promise<unknown> => {
  const requestData = {
    type: 'flat',
    filterLogic: `[userid] = "${escapeFilterLogicValue(userid)}"`,
    rawOrLabel: 'label',
    rawOrLabelHeaders: 'label',
    exportCheckboxLabel: 'true',
    forms: 'form,validation_finale',
  };
  const result = await fetchRedcapJSON<unknown>(requestData, context);
  return result;
};

export const newRequest = async (user: TUser, { fetch }: { fetch: Fetch }) => {
  const payload = [
    {
      record_id: ID.unique(),
      created_at: new Date().toISOString(),
      userid: user.id,
      email: user.email,
      contact_complete: 1,
    },
  ];
  const requestData = {
    action: 'import',
    type: 'flat',
    overwriteBehavior: 'normal',
    forceAutoNumber: 'false',
    data: JSON.stringify(payload),
    returnContent: 'count',
  };
  const result = await fetchRedcapJSON<{ count: number }>(requestData, { fetch });
  return result;
};

const listRequestsWithCode = async (
  userid: string,
  { fetch }: { fetch: Fetch }
): Promise<SurveyRequestItem[]> => {
  const requestData = {
    type: 'flat',
    filterLogic: `[userid] = "${escapeFilterLogicValue(userid)}"`,
    fields: [
      'record_id',
      'created_at',
      'demandeur_statut',
      'mobilite_type',
      'invite_nom',
      'form_complete',
      'avis_composante_position',
      'demandeur_composante_complete',
      'avis_laboratoire_position',
      'labo_complete',
      'avis_encadrant_position',
      'encadrant_complete',
      'validation_finale_complete',
    ].join(','),
  };
  const result = await fetchRedcapJSON<SurveyRequestItem[]>(requestData, { fetch });
  return result;
};

const listRequestsWithLabel = async (
  userid: string,
  { fetch }: { fetch: Fetch }
): Promise<SurveyRequestItem[]> => {
  const requestData = {
    type: 'flat',
    filterLogic: `[userid] = "${escapeFilterLogicValue(userid)}"`,
    fields: [
      'record_id',
      'mobilite_universite_eunicoast',
      'mobilite_universite_gu8',
      'mobilite_universite_autre',
    ].join(','),
    rawOrLabel: 'label',
  };
  const result = await fetchRedcapJSON<SurveyRequestItem[]>(requestData, { fetch });
  return result;
};

export const listRequests = async (
  userid: string,
  { fetch }: { fetch: Fetch }
): Promise<SurveyRequestItem[]> => {
  const requestsWithCode = await listRequestsWithCode(userid, { fetch });
  const requestsWithLabel = await listRequestsWithLabel(userid, { fetch });
  // Merge the two lists based on record_id
  const result = requestsWithCode.map((requestCode) => {
    const matchingLabel = requestsWithLabel.find(
      (label) => label.record_id === requestCode.record_id
    );
    return { ...requestCode, ...matchingLabel };
  });
  return result;
};

type contactId = { userid: string };

/**
 * Looks up the REDCap contact associated with the given email address and returns its userid.
 *
 * @param email - The email address used to filter REDCap contact records.
 * @param fetch - An object providing a `fetch` implementation used to call the REDCap API.
 * @returns The userid string of the first matching contact, or `null` if no matching user is found.
 */
export const fetchUserId = async (
  email: string,
  { fetch }: { fetch: Fetch }
): Promise<string | null> => {
  const requestData = {
    type: 'flat',
    fields: 'userid',
    rawOrLabel: 'raw',
    rawOrLabelHeaders: 'raw',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
    filterLogic: `[email] = "${escapeFilterLogicValue(email)}"`,
  };
  const contacts: contactId[] = await fetchRedcapJSON<contactId[]>(requestData, { fetch });
  const result = contacts.length > 0 && contacts[0]?.userid ? contacts[0].userid : null;
  return result;
};

/**
 * Downloads the PDF of a form from REDCap for a given record ID.
 *
 * @param recordId - The record ID of the form to download
 * @param context - An object providing a `fetch` implementation used to call the REDCap API
 * @returns An ArrayBuffer containing the PDF data
 */
export const downloadSurveyPdf = async (
  recordId: string,
  context: { fetch: Fetch }
): Promise<ArrayBuffer> => {
  const requestData = {
    content: 'pdf',
    record: recordId,
    instrument: 'form',
    returnFormat: 'json',
  };
  const result = await fetchRedcapBuffer(requestData, context);
  return result;
};
