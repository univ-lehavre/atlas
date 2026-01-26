/**
 * REDCap version adapters
 */

export type {
  RedcapFeatures,
  TransformedParams,
  RedcapAdapter,
  BaseAdapterOptions,
} from './types.js';

export { createBaseAdapter, extendAdapter } from './base.js';

export { v14Adapter } from './v14.js';
export { v15Adapter } from './v15.js';
export { v16Adapter } from './v16.js';

export {
  ADAPTERS,
  selectAdapter,
  getAdapterByName,
  getLatestAdapter,
  isVersionSupported,
} from './select.js';
