/**
 * Fuzzy-matches OpenAlex work titles against extracted reference text.
 * Uses Fuse.js with a configurable threshold (default 0.2).
 */

// eslint-disable-next-line n/no-missing-import -- fuse.js is a valid CJS/ESM package
import Fuse from "fuse.js";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

export interface MatchResult {
  readonly work: WorksResult;
  readonly score: number;
}

/**
 * Splits text into candidate reference lines (non-empty lines of reasonable length).
 */
const splitLines = (text: string): readonly string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20);

/**
 * Returns the best Fuse.js score for a single title against all lines, or null if no match.
 */
const bestScore = (fuse: Fuse<string>, title: string): number | null => {
  const results = fuse.search(title);
  const first = results[0];
  return first === undefined ? null : (first.score ?? 1);
};

const toMatchResult = (
  fuse: Fuse<string>,
  work: WorksResult,
): MatchResult | null => {
  const score = bestScore(fuse, work.title);
  return score === null ? null : { work, score };
};

/**
 * Matches OpenAlex works against reference text using fuzzy title matching.
 *
 * @param works - OpenAlex works to match
 * @param text - Plain text extracted from the publications file
 * @param threshold - Fuse.js threshold (0 = exact, 1 = anything). Default 0.2.
 * @returns Matched works with their best score, sorted by score ascending (lower = better match)
 */
export const matchReferences = (
  works: readonly WorksResult[],
  text: string,
  threshold = 0.2,
): readonly MatchResult[] => {
  const lines = splitLines(text);

  const fuse = new Fuse(lines as string[], {
    includeScore: true,
    threshold,
    ignoreLocation: true,
    minMatchCharLength: 10,
  });

  return works
    .filter((w) => w.title !== "")
    .map((work) => toMatchResult(fuse, work))
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => a.score - b.score);
};
