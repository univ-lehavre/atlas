import type { NormalizedWork } from "./topic-extractor.js";

export interface TfidfProfile {
  readonly researcherId: string;
  readonly vector: ReadonlyMap<string, number>;
  readonly labels: ReadonlyMap<string, string>;
}

interface RawEntry {
  readonly id: string;
  readonly works: NormalizedWork[];
}

export interface TfidfOptions {
  readonly includeKeywords?: boolean;
}

const dimensionEntries = (
  work: NormalizedWork,
  includeKeywords: boolean,
): [string, number, string][] => [
  ...work.topics.flatMap((t): [string, number, string][] => [
    [`topic::${t.topicId}`, t.score, t.topicLabel],
    [`subfield::${t.subfieldId}`, t.score, t.subfieldLabel],
    [`field::${t.fieldId}`, t.score, t.fieldLabel],
    [`domain::${t.domainId}`, t.score, t.domainLabel],
  ]),
  ...(includeKeywords
    ? work.keywords.map((k): [string, number, string] => [
        `keyword::${k.keywordId}`,
        k.score,
        k.keywordLabel,
      ])
    : []),
];

type DimRecord = Record<string, [number, string]>;

const accumulateWorks = (
  works: NormalizedWork[],
  includeKeywords: boolean,
): DimRecord =>
  works
    .flatMap((w) => dimensionEntries(w, includeKeywords))
    .reduce<DimRecord>(
      (acc, [key, score, label]) => ({
        ...acc,
        [key]: [(acc[key]?.[0] ?? 0) + score, label],
      }),
      {},
    );

const l2NormalizeRecord = (
  rec: Record<string, number>,
): Record<string, number> => {
  const norm = Math.sqrt(Object.values(rec).reduce((s, v) => s + v * v, 0));
  return norm === 0
    ? rec
    : Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v / norm]));
};

export const buildTfidfProfiles = (
  researchers: RawEntry[],
  options: TfidfOptions = {},
): TfidfProfile[] => {
  const includeKeywords = options.includeKeywords ?? false;

  const rawEntries = researchers.map(({ id, works }) => ({
    id,
    dims: accumulateWorks(works, includeKeywords),
  }));

  const df = rawEntries.reduce<Record<string, number>>((acc, { dims }) => {
    return Object.keys(dims).reduce<Record<string, number>>(
      (inner, key) => ({ ...inner, [key]: (inner[key] ?? 0) + 1 }),
      acc,
    );
  }, {});

  const N = researchers.length;

  return rawEntries.map(({ id, dims }) => {
    const tfidf = Object.fromEntries(
      Object.entries(dims).map(([key, [tf]]) => {
        const idf = Math.log(N / ((df[key] ?? 0) + 1) + 1);
        return [key, tf * idf];
      }),
    );
    const normalized = l2NormalizeRecord(tfidf);
    return {
      researcherId: id,
      vector: new Map(Object.entries(normalized)),
      labels: new Map(
        Object.entries(dims).map(([key, [, label]]) => [key, label]),
      ),
    };
  });
};
