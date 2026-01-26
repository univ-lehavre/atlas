/**
 * REDCap v15 adapter
 */

import { createVersion } from '../version/compare.js';
import { createBaseAdapter } from './base.js';
import type { RedcapAdapter, RedcapFeatures } from './types.js';

/** v15 features */
const V15_FEATURES: RedcapFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
  projectSettings: true,
  fileInfo: false,
  projectXml: false,
};

/** REDCap v15 adapter (15.0.0 - 15.x.x) */
export const v15Adapter: RedcapAdapter = createBaseAdapter({
  name: 'v15',
  minVersion: createVersion(15, 0, 0),
  maxVersion: createVersion(15, 99, 99),
  features: V15_FEATURES,
});
