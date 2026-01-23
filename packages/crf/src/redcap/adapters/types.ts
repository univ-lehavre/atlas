/**
 * @module adapters/types
 * @description Type definitions for REDCap version adapters.
 */
import type { Version } from '../version.js';
import type { ProjectInfo } from '../types.js';

/**
 * Parameters for REDCap API requests after transformation.
 */
export type TransformedParams = Record<string, string>;

/**
 * Interface for adapting REDCap API requests/responses based on server version.
 *
 * Each adapter handles the differences between REDCap versions, including:
 * - Parameter name/format changes
 * - Endpoint availability
 * - Response schema differences
 */
// eslint-disable-next-line functional/no-mixed-types -- Adapter interface needs both data and methods
export interface RedcapAdapter {
  /** Human-readable name for this adapter */
  readonly name: string;

  /** Minimum REDCap version supported by this adapter (inclusive) */
  readonly minVersion: Version;

  /** Maximum REDCap version supported by this adapter (exclusive) */
  readonly maxVersion: Version | undefined;

  /**
   * Transform export records parameters for this version.
   *
   * @param params - The base parameters
   * @returns Transformed parameters suitable for this REDCap version
   */
  readonly transformExportParams: (params: TransformedParams) => TransformedParams;

  /**
   * Transform import records parameters for this version.
   *
   * @param params - The base parameters
   * @returns Transformed parameters suitable for this REDCap version
   */
  readonly transformImportParams: (params: TransformedParams) => TransformedParams;

  /**
   * Parse and normalize the project info response.
   *
   * @param response - Raw response from REDCap
   * @returns Normalized ProjectInfo object
   */
  readonly parseProjectInfo: (response: unknown) => ProjectInfo;

  /**
   * Check if a specific endpoint/content type is available in this version.
   *
   * @param content - The REDCap content type (e.g., 'record', 'metadata')
   * @param action - Optional action (e.g., 'export', 'import')
   * @returns true if the endpoint is available
   */
  readonly isEndpointAvailable: (content: string, action?: string) => boolean;

  /**
   * Get any version-specific default parameters.
   *
   * @returns Default parameters to include in all requests
   */
  readonly getDefaultParams: () => TransformedParams;

  /**
   * Get supported features for this version.
   *
   * @returns Object describing feature availability
   */
  readonly getFeatures: () => RedcapFeatures;
}

/**
 * Feature flags indicating what's available in a REDCap version.
 */
export interface RedcapFeatures {
  /** Supports repeating instruments */
  readonly repeatingInstruments: boolean;
  /** Supports Data Access Groups */
  readonly dataAccessGroups: boolean;
  /** Supports file repository */
  readonly fileRepository: boolean;
  /** Supports MyCap mobile app integration */
  readonly mycap: boolean;
  /** Supports survey queue */
  readonly surveyQueue: boolean;
  /** Supports alerts and notifications */
  readonly alerts: boolean;
}

/**
 * Options for creating an adapter.
 */
export interface AdapterOptions {
  readonly name: string;
  readonly minVersion: Version;
  readonly maxVersion?: Version;
}
