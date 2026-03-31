/**
 * @univ-lehavre/atlas-redcap-openapi
 *
 * Tools for analyzing REDCap PHP source code, extracting OpenAPI 3.1.0
 * specifications, comparing spec versions, and serving documentation.
 *
 * @remarks
 * Three main modules are exposed:
 * - **extractor** — parses REDCap PHP source to produce an OpenAPI YAML spec
 * - **comparator** — diffs two spec versions and detects breaking changes
 * - **server** — serves Swagger UI / Redoc documentation over HTTP
 *
 * @example
 * ```typescript
 * import { extract, compare, serve } from '@univ-lehavre/atlas-redcap-openapi';
 * ```
 */

/** Analyzes REDCap PHP source to extract an OpenAPI 3.1.0 specification. */
export * from './extractor/index.js';

/** Compares two REDCap OpenAPI specs and reports breaking changes. */
export * from './comparator/index.js';

/** Serves OpenAPI documentation via Swagger UI and Redoc. */
export * from './server/index.js';
