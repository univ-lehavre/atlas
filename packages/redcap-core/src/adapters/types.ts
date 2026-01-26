/**
 * REDCap adapter types
 *
 * Adapters encapsulate version-specific behavior.
 */

import type { Version } from '../version/types.js';
import type { ApiAction } from '../content-types/endpoints.js';

/** Feature flags for REDCap capabilities */
export interface RedcapFeatures {
  /** Supports repeating instruments/events */
  readonly repeatingInstruments: boolean;
  /** Supports Data Access Groups */
  readonly dataAccessGroups: boolean;
  /** Supports file repository */
  readonly fileRepository: boolean;
  /** Supports MyCap mobile app */
  readonly mycap: boolean;
  /** Supports survey queue */
  readonly surveyQueue: boolean;
  /** Supports alerts */
  readonly alerts: boolean;
  /** Supports project_settings endpoint */
  readonly projectSettings: boolean;
  /** Supports filesize/fileinfo endpoints */
  readonly fileInfo: boolean;
  /** Supports project_xml endpoint */
  readonly projectXml: boolean;
}

/** Transformed parameters after adapter processing */
export interface TransformedParams {
  readonly params: Record<string, string>;
  readonly headers?: Record<string, string>;
}

/** REDCap version adapter interface */
export interface RedcapAdapter {
  /** Adapter name (e.g., 'v14', 'v15', 'v16') */
  readonly name: string;

  /** Minimum supported version */
  readonly minVersion: Version;

  /** Maximum supported version (undefined = no max) */
  readonly maxVersion: Version | undefined;

  /** Transform export parameters for this version */
  transformExportParams(params: Record<string, string>): TransformedParams;

  /** Transform import parameters for this version */
  transformImportParams(params: Record<string, string>): TransformedParams;

  /** Check if an endpoint is available */
  isEndpointAvailable(content: string, action?: ApiAction): boolean;

  /** Get default parameters for this version */
  getDefaultParams(): Record<string, string>;

  /** Get feature flags for this version */
  getFeatures(): RedcapFeatures;
}

/** Options for creating a base adapter */
export interface BaseAdapterOptions {
  readonly name: string;
  readonly minVersion: Version;
  readonly maxVersion?: Version;
  readonly features: RedcapFeatures;
  readonly defaultParams?: Record<string, string>;
}
