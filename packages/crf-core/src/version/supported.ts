/**
 * Supported REDCap versions
 */

import type { Version } from './types.js';
import { createVersion } from './compare.js';

/** Known supported REDCap versions */
export const SUPPORTED_VERSIONS: readonly string[] = ['14.5.10', '15.5.32', '16.0.8'] as const;

/** Minimum supported version */
export const MIN_SUPPORTED_VERSION: Version = createVersion(14, 0, 0);

/** Latest known version */
export const LATEST_KNOWN_VERSION: Version = createVersion(16, 0, 8);

/** Version that introduced project_settings endpoint */
export const PROJECT_SETTINGS_MIN_VERSION: Version = createVersion(15, 0, 0);

/** Version that introduced filesize/fileinfo endpoints */
export const FILE_INFO_MIN_VERSION: Version = createVersion(16, 0, 0);

/** Version that introduced project_xml endpoint */
export const PROJECT_XML_MIN_VERSION: Version = createVersion(16, 0, 0);

/** Version that introduced repeating instruments */
export const REPEATING_INSTRUMENTS_MIN_VERSION: Version = createVersion(8, 0, 0);

/** Version that introduced Data Access Groups */
export const DAG_MIN_VERSION: Version = createVersion(6, 0, 0);

/** Version that introduced file repository */
export const FILE_REPOSITORY_MIN_VERSION: Version = createVersion(9, 0, 0);
