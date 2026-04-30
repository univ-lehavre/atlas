import type { TfidfProfile } from "./tfidf-profile.js";
import type { MatchScore } from "./ensemble.js";

export interface ResearcherInfo {
  readonly id: string;
  readonly name: string;
}

export interface MatchExplanation {
  readonly sharedDomains: string[];
  readonly sharedFields: string[];
  readonly sharedSubfields: string[];
  readonly distinctTopicsA: string[];
  readonly distinctTopicsB: string[];
  readonly sharedKeywords: string[];
}

export interface ResearcherMatch {
  readonly researcherA: ResearcherInfo;
  readonly researcherB: ResearcherInfo;
  readonly scores: MatchScore;
  readonly explanation: MatchExplanation;
}

const TOP_K = 5;

const resolveLabel = (
  key: string,
  labels: ReadonlyMap<string, string>,
): string => labels.get(key) ?? key;

const topLabelsFor = (profile: TfidfProfile, prefix: string): string[] =>
  [...profile.vector.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .toSorted(([, a], [, b]) => b - a)
    .slice(0, TOP_K)
    .map(([k]) => resolveLabel(k, profile.labels));

const sharedLabels = (
  a: TfidfProfile,
  b: TfidfProfile,
  prefix: string,
): string[] => {
  const keysA = new Set(
    [...a.vector.keys()].filter((k) => k.startsWith(prefix)),
  );
  return [...b.vector.keys()]
    .filter((k) => keysA.has(k))
    .toSorted((ka, kb) => (b.vector.get(kb) ?? 0) - (b.vector.get(ka) ?? 0))
    .slice(0, TOP_K)
    .map((k) => resolveLabel(k, b.labels));
};

const distinctLabels = (
  own: TfidfProfile,
  other: TfidfProfile,
  prefix: string,
): string[] =>
  [...own.vector.entries()]
    .filter(([k]) => k.startsWith(prefix) && !other.vector.has(k))
    .toSorted(([, a], [, b]) => b - a)
    .slice(0, TOP_K)
    .map(([k]) => resolveLabel(k, own.labels));

export const buildExplanation = (
  profileA: TfidfProfile,
  profileB: TfidfProfile,
): MatchExplanation => ({
  sharedDomains: sharedLabels(profileA, profileB, "domain::"),
  sharedFields: sharedLabels(profileA, profileB, "field::"),
  sharedSubfields: sharedLabels(profileA, profileB, "subfield::"),
  distinctTopicsA: distinctLabels(profileA, profileB, "topic::"),
  distinctTopicsB: distinctLabels(profileB, profileA, "topic::"),
  sharedKeywords: sharedLabels(profileA, profileB, "keyword::"),
});

export const buildMatch = (
  researcherA: ResearcherInfo,
  researcherB: ResearcherInfo,
  scores: MatchScore,
  explanation: MatchExplanation,
): ResearcherMatch => ({ researcherA, researcherB, scores, explanation });

export const sortByField = (
  matches: ResearcherMatch[],
  field: "similarity" | "complementarity",
): ResearcherMatch[] =>
  matches.toSorted((a, b) => b.scores[field] - a.scores[field]);

export const topLabels = (profile: TfidfProfile, prefix: string): string[] =>
  topLabelsFor(profile, prefix);
