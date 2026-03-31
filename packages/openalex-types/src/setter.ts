import { Brand } from "effect";
import type { OpenAlexID, ORCID } from "./branded.js";

/**
 * Branded constructor for ORCID identifiers.
 *
 * Accepts bare ORCID format (`0000-0000-0000-0000`) or the full URI
 * (`https://orcid.org/0000-0000-0000-0000`). The last segment may end with `X`.
 *
 * @example
 * ```typescript
 * const id = asORCID("0000-0001-2345-6789");
 * ```
 */
const asORCID = Brand.refined<ORCID>(
  (s) =>
    s.length > 0 &&
    /^(?:https:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}(?:\d|X)$/.test(s),
  (s) => Brand.error(`Invalid ORCID format: ${s}`),
);

/**
 * Branded constructor for OpenAlex entity identifiers.
 *
 * Expects a full URI of the form `https://openalex.org/<Letter><Digits>`,
 * e.g. `https://openalex.org/A1234567890`.
 *
 * @example
 * ```typescript
 * const id = asOpenAlexID("https://openalex.org/W2741809807");
 * ```
 */
const asOpenAlexID = Brand.refined<OpenAlexID>(
  (s) =>
    s.length > 0 &&
    s.startsWith("https://openalex.org/") &&
    /^[A-Z]\d+$/.test(s.slice(21)),
  (s) => Brand.error(`Invalid OpenAlex ID format: ${s}`),
);

export { asORCID, asOpenAlexID };
