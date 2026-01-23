/**
 * @module adapters/v14
 * @description REDCap adapter for version 14.x.x
 */
import type { RedcapAdapter, RedcapFeatures } from './types.js';
import { createBaseAdapter, extendAdapter } from './base.js';

/**
 * Features available in REDCap 14.x
 */
const V14_FEATURES: RedcapFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
};

/**
 * Base adapter for REDCap 14.x versions.
 */
const baseV14 = createBaseAdapter({
  name: 'REDCap 14.x',
  minVersion: { major: 14, minor: 0, patch: 0 },
  maxVersion: { major: 15, minor: 0, patch: 0 },
});

/**
 * Adapter for REDCap version 14.x.x
 *
 * Supports REDCap versions from 14.0.0 to 14.x.x (before 15.0.0).
 *
 * Key characteristics of v14:
 * - Standard API parameters
 * - All core features available
 */
export const v14Adapter: RedcapAdapter = extendAdapter(baseV14, {
  getFeatures: (): RedcapFeatures => V14_FEATURES,

  // v14 specific endpoint availability
  isEndpointAvailable: (content: string, _action?: string): boolean => {
    // All standard endpoints are available in v14
    const availableContent = [
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
    ];
    return availableContent.includes(content);
  },
});
