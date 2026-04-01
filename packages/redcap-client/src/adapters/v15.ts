/**
 * @module adapters/v15
 * @description REDCap adapter for version 15.x.x
 */
import type { RedcapAdapter, RedcapFeatures } from './types.js';
import { createBaseAdapter, extendAdapter } from './base.js';

/**
 * Features available in REDCap 15.x
 */
const V15_FEATURES: RedcapFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
};

/**
 * Base adapter for REDCap 15.x versions.
 */
const baseV15 = createBaseAdapter({
  name: 'REDCap 15.x',
  minVersion: { major: 15, minor: 0, patch: 0 },
  maxVersion: { major: 16, minor: 0, patch: 0 },
});

/**
 * Adapter for REDCap version 15.x.x
 *
 * Supports REDCap versions from 15.0.0 to 15.x.x (before 16.0.0).
 *
 * Key characteristics of v15:
 * - Enhanced API responses
 * - Additional content types
 */
export const v15Adapter: RedcapAdapter = extendAdapter(baseV15, {
  getFeatures: (): RedcapFeatures => V15_FEATURES,

  // v15 specific endpoint availability
  isEndpointAvailable: (content: string, _action?: string): boolean => {
    // v15 includes all v14 endpoints plus additional ones
    const availableContent = [
      // Core endpoints (same as v14)
      'record',
      'metadata',
      'file',
      'fileRepository',
      'instrument',
      'event',
      'arm',
      'user',
      'project',
      'version',
      'pdf',
      'surveyLink',
      'surveyQueueLink',
      'surveyReturnCode',
      'participantList',
      'exportFieldNames',
      'formEventMapping',
      'repeatingFormsEvents',
      'report',
      'dag',
      'userRole',
      'userRoleMapping',
      'userDagMapping',
      'log',
      'generateNextRecordName',
      // v15 additions
      'project_settings',
      'fieldValidation',
    ];
    return availableContent.includes(content);
  },
});
