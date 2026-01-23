/**
 * @module adapters/v16
 * @description REDCap adapter for version 16.x.x
 */
import type { RedcapAdapter, RedcapFeatures } from './types.js';
import { createBaseAdapter, extendAdapter } from './base.js';

/**
 * Features available in REDCap 16.x
 */
const V16_FEATURES: RedcapFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
};

/**
 * Base adapter for REDCap 16.x versions.
 */
const baseV16 = createBaseAdapter({
  name: 'REDCap 16.x',
  minVersion: { major: 16, minor: 0, patch: 0 },
  // No maxVersion - this is the latest supported version
  maxVersion: undefined,
});

/**
 * Adapter for REDCap version 16.x.x
 *
 * Supports REDCap versions from 16.0.0 onwards.
 * This is the latest supported major version.
 *
 * Key characteristics of v16:
 * - Latest API features
 * - Enhanced security options
 * - All previous endpoints available
 */
export const v16Adapter: RedcapAdapter = extendAdapter(baseV16, {
  getFeatures: (): RedcapFeatures => V16_FEATURES,

  // v16 specific endpoint availability
  isEndpointAvailable: (content: string, _action?: string): boolean => {
    // v16 includes all previous endpoints plus any new additions
    const availableContent = [
      // Core endpoints
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
      // v16 additions
      'filesize',
      'fileinfo',
      'project_xml',
    ];
    return availableContent.includes(content);
  },
});
