/**
 * REDCap v14 adapter
 */

import { createVersion } from '../version/compare.js';
import { createBaseAdapter } from './base.js';
import type { CrfAdapter, CrfFeatures } from './types.js';

/** v14 features */
const V14_FEATURES: CrfFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
  projectSettings: false,
  fileInfo: false,
  projectXml: false,
};

/** REDCap v14 adapter (14.0.0 - 14.x.x) */
export const v14Adapter: CrfAdapter = createBaseAdapter({
  name: 'v14',
  minVersion: createVersion(14, 0, 0),
  maxVersion: createVersion(14, 99, 99),
  features: V14_FEATURES,
});
