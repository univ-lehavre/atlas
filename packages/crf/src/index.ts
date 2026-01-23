/**
 * @module crf
 * @description Clinical Research Forms - REDCap client, API server, and CLI tools.
 *
 * @example
 * ```typescript
 * // Import the REDCap client
 * import { createRedcapClient, RedcapUrl, RedcapToken } from '@univ-lehavre/crf/redcap';
 *
 * // Import the server (when available)
 * // import { createServer } from '@univ-lehavre/crf/server';
 * ```
 */

// Re-export redcap module for convenience
export * from './redcap/index.js';
