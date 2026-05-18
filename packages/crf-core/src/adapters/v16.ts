/**
 * REDCap v16 adapter
 */

import { createVersion } from '../version/compare.js';
import { createBaseAdapter } from './base.js';
import type { CrfAdapter, CrfFeatures } from './types.js';

/** v16 features */
const V16_FEATURES: CrfFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
  projectSettings: true,
  fileInfo: true,
  projectXml: true,
};

/** REDCap v16 adapter (16.0.0+) */
export const v16Adapter: CrfAdapter = createBaseAdapter({
  name: 'v16',
  minVersion: createVersion(16, 0, 0),
  maxVersion: undefined, // No max, latest
  features: V16_FEATURES,
});
