/**
 * @module adapters/base
 * @description Base adapter with default behavior for REDCap API.
 */
import type { ProjectInfo } from '../types.js';
import type { RedcapAdapter, RedcapFeatures, TransformedParams, AdapterOptions } from './types.js';

/**
 * Default features - most features are available in recent versions.
 */
const DEFAULT_FEATURES: RedcapFeatures = {
  repeatingInstruments: true,
  dataAccessGroups: true,
  fileRepository: true,
  mycap: true,
  surveyQueue: true,
  alerts: true,
};

/**
 * Parse project info response with basic validation.
 * Returns the response cast as ProjectInfo (assumes valid structure from REDCap).
 */
const parseProjectInfoDefault = (response: unknown): ProjectInfo =>
  response !== null && typeof response === 'object'
    ? (response as ProjectInfo)
    : ({} as ProjectInfo);

/**
 * Create a base adapter with default passthrough behavior.
 *
 * This can be extended by version-specific adapters to override
 * only the methods that need version-specific handling.
 *
 * @param options - Adapter configuration
 * @returns A RedcapAdapter with default behavior
 */
export const createBaseAdapter = (options: AdapterOptions): RedcapAdapter => ({
  name: options.name,
  minVersion: options.minVersion,
  maxVersion: options.maxVersion,

  transformExportParams: (params: TransformedParams): TransformedParams => params,

  transformImportParams: (params: TransformedParams): TransformedParams => params,

  parseProjectInfo: parseProjectInfoDefault,

  isEndpointAvailable: (_content: string, _action?: string): boolean => true,

  getDefaultParams: (): TransformedParams => ({}),

  getFeatures: (): RedcapFeatures => DEFAULT_FEATURES,
});

/**
 * Create a partial adapter that can override specific methods.
 *
 * @param base - The base adapter to extend
 * @param overrides - Methods to override
 * @returns A new adapter with the overrides applied
 */
export const extendAdapter = (
  base: RedcapAdapter,
  overrides: Partial<RedcapAdapter>
): RedcapAdapter => ({
  ...base,
  ...overrides,
});
