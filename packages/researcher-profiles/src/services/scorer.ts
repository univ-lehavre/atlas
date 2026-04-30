import type { TfidfProfile } from "./tfidf-profile.js";

export const cosineSimilarity = (
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number =>
  [...a.entries()].reduce((dot, [key, va]) => {
    const vb = b.get(key);
    return vb === undefined ? dot : dot + va * vb;
  }, 0);

export const embeddingCosineSimilarity = (
  a: Float32Array,
  b: Float32Array,
): number => [...a].reduce((dot, va, i) => dot + va * (b[i] ?? 0), 0);

const subVector = (
  vector: ReadonlyMap<string, number>,
  prefix: string,
): ReadonlyMap<string, number> =>
  new Map([...vector.entries()].filter(([k]) => k.startsWith(prefix)));

const l2Norm = (v: ReadonlyMap<string, number>): number =>
  Math.sqrt([...v.values()].reduce((sum, val) => sum + val * val, 0));

const normalizedCosine = (
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>,
): number => {
  const na = l2Norm(a);
  const nb = l2Norm(b);
  return na === 0 || nb === 0
    ? 0
    : [...a.entries()].reduce((dot, [key, va]) => {
        const vb = b.get(key);
        return vb === undefined ? dot : dot + va * vb;
      }, 0) /
        (na * nb);
};

export interface ComplementarityOptions {
  readonly includeKeywords?: boolean;
}

export const complementarityScore = (
  a: TfidfProfile,
  b: TfidfProfile,
  options: ComplementarityOptions = {},
): number => {
  const domainSim = normalizedCosine(
    subVector(a.vector, "domain::"),
    subVector(b.vector, "domain::"),
  );
  const fieldSim = normalizedCosine(
    subVector(a.vector, "field::"),
    subVector(b.vector, "field::"),
  );
  const subfieldSim = normalizedCosine(
    subVector(a.vector, "subfield::"),
    subVector(b.vector, "subfield::"),
  );
  const topicSim = normalizedCosine(
    subVector(a.vector, "topic::"),
    subVector(b.vector, "topic::"),
  );

  const sharedContext =
    options.includeKeywords === true
      ? (() => {
          const keywordSim = normalizedCosine(
            subVector(a.vector, "keyword::"),
            subVector(b.vector, "keyword::"),
          );
          return (
            0.2 * domainSim +
            0.25 * fieldSim +
            0.45 * subfieldSim +
            0.1 * keywordSim
          );
        })()
      : 0.2 * domainSim + 0.3 * fieldSim + 0.5 * subfieldSim;

  return sharedContext * (1 - topicSim);
};
