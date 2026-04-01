/**
 * @module @univ-lehavre/atlas-researcher-profiles
 */

export {
  type ResearcherRow,
  type ResearcherData,
  emptyResearcherData,
} from "./types.js";

export {
  CsvParseError,
  CsvReadError,
  OpenAlexSearchError,
  RedcapWriteError,
  RedcapFetchError,
} from "./errors.js";

export { daysUntilNextUpdate } from "./utils.js";

export { parseCsv } from "./services/csv.js";

export {
  type ResolveResult,
  type ResolveAuthorsResult,
  type RateLimitInfo,
  resolveAuthors,
  fetchWorksForAuthors,
  resolveAll,
} from "./services/openalex.js";

export {
  type RedcapConnectionConfig,
  fetchResearchers,
  fetchResearcherData,
  writeResearcherData,
  writeFinalReferences,
  downloadPublicationsFile,
} from "./services/redcap.js";

export { extractText } from "./services/file-extractor.js";

export {
  type PdfDebugInfo,
  generateCombinedPdf,
} from "./services/pdf-generator.js";

export {
  type MatchResult,
  matchReferences,
} from "./services/reference-matcher.js";
