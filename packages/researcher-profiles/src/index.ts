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
  CitationSearchError,
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
} from "./services/citation.js";

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

export {
  type NormalizedWork,
  type NormalizedTopic,
  extractNormalizedWorks,
} from "./services/topic-extractor.js";

export {
  type TfidfProfile,
  buildTfidfProfiles,
} from "./services/tfidf-profile.js";

export {
  type EmbeddingProfile,
  buildEmbeddingProfiles,
} from "./services/embedding-profile.js";

export {
  cosineSimilarity,
  embeddingCosineSimilarity,
  complementarityScore,
} from "./services/scorer.js";

export {
  type MatchScore,
  type EnsembleWeights,
  computeEnsembleMatch,
} from "./services/ensemble.js";

export {
  type ResearcherInfo,
  type MatchExplanation,
  type ResearcherMatch,
  buildExplanation,
  buildMatch,
  sortByField,
  topLabels,
} from "./services/match-formatter.js";
