/**
 * @univ-lehavre/atlas-validate-openalex
 *
 * Interactive validation workflow for OpenAlex author and work data.
 *
 * @remarks
 * Modules:
 * - **actions** — high-level validation steps (check works, actors, filters)
 * - **context** — load and access the validation session context
 * - **events** — build, aggregate, filter and persist validation events
 * - **fetch** — query OpenAlex (authors by name/ORCID, works by author/DOI)
 * - **prompt** — interactive CLI prompts used during validation
 * - **store** — initialise, load, save and update the local event store
 * - **tools** — shared utilities (formatters, helpers)
 */

/** High-level validation steps (checkWork, actor resolution, filtering). */
export * from "./actions/index.js";

/** Load and access the validation session context. */
export * from "./context/index.js";

/** Build, aggregate, filter and persist validation events. */
export * from "./events/index.js";

/** Query OpenAlex: authors by name/ORCID, works by author IDs/ORCID/DOI. */
export * from "./fetch/index.js";

/** Interactive CLI prompts used during the validation workflow. */
export * from "./prompt/index.js";

/** Initialise, load, save and update the local event store. */
export * from "./store/index.js";

/** Shared utilities used across the validation workflow. */
export * from "./tools/index.js";

export type * from "./actions/types.js";
export type * from "./events/types.js";
export type * from "./context/types.js";
