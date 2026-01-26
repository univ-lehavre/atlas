/**
 * API parameter builders
 *
 * Pure functions for building REDCap API request parameters.
 */

import type { ExportRecordsOptions, ImportRecordsOptions } from '../types/config.js';

/**
 * Build parameters for record export
 *
 * @example
 * ```ts
 * buildExportParams({ fields: ['record_id', 'name'], type: 'flat' })
 * // { content: 'record', format: 'json', type: 'flat', 'fields[0]': 'record_id', 'fields[1]': 'name' }
 * ```
 */
export const buildExportParams = (
  options: ExportRecordsOptions = {}
): Record<string, string | undefined> => {
  const params: Record<string, string | undefined> = {
    content: 'record',
    format: 'json',
    type: options.type ?? 'flat',
    rawOrLabel: options.rawOrLabel ?? 'raw',
    rawOrLabelHeaders: options.rawOrLabelHeaders ?? 'raw',
    exportCheckboxLabel: options.exportCheckboxLabel ? 'true' : undefined,
    exportSurveyFields: options.exportSurveyFields ? 'true' : undefined,
    exportDataAccessGroups: options.exportDataAccessGroups ? 'true' : undefined,
    returnFormat: 'json',
  };

  // Add array parameters with indexed keys
  if (options.records?.length) {
    for (const [i, record] of options.records.entries()) {
      params[`records[${i}]`] = record;
    }
  }

  if (options.fields?.length) {
    for (const [i, field] of options.fields.entries()) {
      params[`fields[${i}]`] = field;
    }
  }

  if (options.forms?.length) {
    for (const [i, form] of options.forms.entries()) {
      params[`forms[${i}]`] = form;
    }
  }

  if (options.events?.length) {
    for (const [i, event] of options.events.entries()) {
      params[`events[${i}]`] = event;
    }
  }

  if (options.filterLogic) {
    params['filterLogic'] = options.filterLogic;
  }

  if (options.dateRangeBegin) {
    params['dateRangeBegin'] = options.dateRangeBegin;
  }

  if (options.dateRangeEnd) {
    params['dateRangeEnd'] = options.dateRangeEnd;
  }

  return params;
};

/**
 * Build parameters for record import
 *
 * @example
 * ```ts
 * buildImportParams([{ record_id: '1', name: 'Test' }], { overwriteBehavior: 'overwrite' })
 * // { content: 'record', format: 'json', data: '[{"record_id":"1","name":"Test"}]', overwriteBehavior: 'overwrite' }
 * ```
 */
export const buildImportParams = (
  records: readonly Record<string, unknown>[],
  options: ImportRecordsOptions = {}
): Record<string, string | undefined> => ({
  content: 'record',
  format: 'json',
  data: JSON.stringify(records),
  type: options.type ?? 'flat',
  overwriteBehavior: options.overwriteBehavior ?? 'normal',
  forceAutoNumber: options.forceAutoNumber ? 'true' : undefined,
  returnContent: options.returnContent ?? 'count',
  returnFormat: 'json',
  dateFormat: options.dateFormat ?? 'YMD',
});

/**
 * Build parameters for metadata export
 */
export const buildMetadataExportParams = (
  options: { forms?: readonly string[]; fields?: readonly string[] } = {}
): Record<string, string | undefined> => {
  const params: Record<string, string | undefined> = {
    content: 'metadata',
    format: 'json',
    returnFormat: 'json',
  };

  if (options.forms?.length) {
    for (const [i, form] of options.forms.entries()) {
      params[`forms[${i}]`] = form;
    }
  }

  if (options.fields?.length) {
    for (const [i, field] of options.fields.entries()) {
      params[`fields[${i}]`] = field;
    }
  }

  return params;
};

/**
 * Build parameters for project info export
 */
export const buildProjectInfoParams = (): Record<string, string> => ({
  content: 'project',
  format: 'json',
  returnFormat: 'json',
});

/**
 * Build parameters for user export
 */
export const buildUserExportParams = (): Record<string, string> => ({
  content: 'user',
  format: 'json',
  returnFormat: 'json',
});

/**
 * Build parameters for instrument export
 */
export const buildInstrumentExportParams = (): Record<string, string> => ({
  content: 'instrument',
  format: 'json',
  returnFormat: 'json',
});

/**
 * Build parameters for version export
 */
export const buildVersionParams = (): Record<string, string> => ({
  content: 'version',
});

/**
 * Clean undefined values from params object
 */
export const cleanParams = (params: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
