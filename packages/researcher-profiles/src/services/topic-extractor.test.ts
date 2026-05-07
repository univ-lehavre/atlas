import { describe, it, expect } from "vitest";
import { extractNormalizedWorks } from "./topic-extractor.js";
import type { ResearcherData } from "../types.js";

const makeWork = (
  overrides: Partial<{
    topics: unknown[];
    keywords: unknown[];
  }> = {},
) =>
  ({
    id: "W1",
    topics: overrides.topics,
    keywords: overrides.keywords,
  }) as never;

const makeTopic = (score: number, suffix = "1") => ({
  id: `T${suffix}`,
  display_name: `Topic ${suffix}`,
  score,
  subfield: { id: `SF${suffix}`, display_name: `Subfield ${suffix}` },
  field: { id: `F${suffix}`, display_name: `Field ${suffix}` },
  domain: { id: `D${suffix}`, display_name: `Domain ${suffix}` },
});

const makeData = (works: unknown[]): ResearcherData =>
  ({ final_references: works }) as never;

describe("extractNormalizedWorks", () => {
  it("returns an empty array when there are no works", () => {
    expect(extractNormalizedWorks(makeData([]))).toEqual([]);
  });

  it("filters out topics below the MIN_TOPIC_SCORE threshold", () => {
    const work = makeWork({
      topics: [makeTopic(0.5, "high"), makeTopic(0.1, "low")],
      keywords: [],
    });

    const [normalized] = extractNormalizedWorks(makeData([work]));

    expect(normalized?.topics).toHaveLength(1);
    expect(normalized?.topics[0]?.topicId).toBe("Thigh");
  });

  it("normalizes topic and keyword fields", () => {
    const work = makeWork({
      topics: [makeTopic(0.9, "x")],
      keywords: [{ id: "K1", display_name: "ml", score: 0.8 }],
    });

    const [normalized] = extractNormalizedWorks(makeData([work]));
    expect(normalized?.topics[0]).toEqual({
      topicId: "Tx",
      topicLabel: "Topic x",
      subfieldId: "SFx",
      subfieldLabel: "Subfield x",
      fieldId: "Fx",
      fieldLabel: "Field x",
      domainId: "Dx",
      domainLabel: "Domain x",
      score: 0.9,
    });
    expect(normalized?.keywords[0]).toEqual({
      keywordId: "K1",
      keywordLabel: "ml",
      score: 0.8,
    });
  });

  it("treats missing topics/keywords arrays as empty", () => {
    const [normalized] = extractNormalizedWorks(
      makeData([makeWork({ topics: undefined, keywords: undefined })]),
    );
    expect(normalized?.topics).toEqual([]);
    expect(normalized?.keywords).toEqual([]);
  });
});
