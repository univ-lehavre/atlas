import { Brand } from "effect";
import type { OpenAlexID, ORCID } from "./branded.js";

const asORCID = Brand.refined<ORCID>(
  (s) =>
    s.length > 0 &&
    /^(?:https:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}(?:\d|X)$/.test(s),
  (s) => Brand.error(`Invalid ORCID format: ${s}`),
);

const asOpenAlexID = Brand.refined<OpenAlexID>(
  (s) =>
    s.length > 0 &&
    s.startsWith("https://openalex.org/") &&
    /^[A-Z]\d+$/.test(s.slice(21)),
  (s) => Brand.error(`Invalid OpenAlex ID format: ${s}`),
);

export { asORCID, asOpenAlexID };
