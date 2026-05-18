/**
 * Base adapter implementation
 */

import type { ApiAction } from '../content-types/endpoints.js';
import { isContentTypeAvailable, isActionAvailable } from '../content-types/endpoints.js';
import type { CrfAdapter, CrfFeatures, TransformedParams, BaseAdapterOptions } from './types.js';

/**
 * Create a base adapter with common functionality
 */
export const createBaseAdapter = (options: BaseAdapterOptions): CrfAdapter => ({
  name: options.name,
  minVersion: options.minVersion,
  maxVersion: options.maxVersion,

  transformExportParams(params: Record<string, string>): TransformedParams {
    return { params };
  },

  transformImportParams(params: Record<string, string>): TransformedParams {
    return { params };
  },

  isEndpointAvailable(content: string, action?: ApiAction): boolean {
    if (!isContentTypeAvailable(content, options.minVersion)) {
      return false;
    }
    if (action && !isActionAvailable(content, action)) {
      return false;
    }
    return true;
  },

  getDefaultParams(): Record<string, string> {
    return options.defaultParams ?? {};
  },

  getFeatures(): CrfFeatures {
    return options.features;
  },
});

/**
 * Extend an adapter with additional behavior
 */
export const extendAdapter = (
  base: CrfAdapter,
  overrides: Partial<Omit<CrfAdapter, 'name' | 'minVersion' | 'maxVersion'>>
): CrfAdapter => ({
  ...base,
  ...overrides,
});
