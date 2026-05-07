import { describe, it, expect } from "vitest";
import { buildTfidfProfiles } from "./tfidf-profile.js";
import type { NormalizedWork } from "./topic-extractor.js";

const makeTopic = (suffix: string, score = 1) => ({
  topicId: `T${suffix}`,
  topicLabel: `Topic ${suffix}`,
  subfieldId: `SF${suffix}`,
  subfieldLabel: `Subfield ${suffix}`,
  fieldId: `F${suffix}`,
  fieldLabel: `Field ${suffix}`,
  domainId: `D${suffix}`,
  domainLabel: `Domain ${suffix}`,
  score,
});

const makeWork = (
  topics: ReturnType<typeof makeTopic>[],
  keywords: { keywordId: string; keywordLabel: string; score: number }[] = [],
): NormalizedWork => ({ topics, keywords });

describe("buildTfidfProfiles", () => {
  it("returns one normalized profile per researcher", () => {
    const profiles = buildTfidfProfiles([
      { id: "R1", works: [makeWork([makeTopic("a")])] },
      { id: "R2", works: [makeWork([makeTopic("b")])] },
    ]);

    expect(profiles).toHaveLength(2);
    for (const p of profiles) {
      const magnitude = Math.sqrt(
        [...p.vector.values()].reduce((s, v) => s + v * v, 0),
      );
      expect(magnitude).toBeCloseTo(1);
    }
  });

  it("returns an unnormalized empty vector when a researcher has no works", () => {
    const [profile] = buildTfidfProfiles([{ id: "R1", works: [] }]);
    expect(profile?.vector.size).toBe(0);
  });

  it("includes keyword dimensions only when option is enabled", () => {
    const work = makeWork(
      [makeTopic("a")],
      [{ keywordId: "K1", keywordLabel: "ml", score: 0.7 }],
    );

    const without = buildTfidfProfiles([{ id: "R1", works: [work] }]);
    const withKw = buildTfidfProfiles([{ id: "R1", works: [work] }], {
      includeKeywords: true,
    });

    expect([...(without[0]?.vector.keys() ?? [])]).not.toContain("keyword::K1");
    expect([...(withKw[0]?.vector.keys() ?? [])]).toContain("keyword::K1");
  });

  it("populates labels with the human readable display names", () => {
    const [profile] = buildTfidfProfiles([
      { id: "R1", works: [makeWork([makeTopic("a")])] },
    ]);
    expect(profile?.labels.get("topic::Ta")).toBe("Topic a");
    expect(profile?.labels.get("subfield::SFa")).toBe("Subfield a");
  });

  it("aggregates scores across multiple works", () => {
    const profiles = buildTfidfProfiles([
      {
        id: "R1",
        works: [
          makeWork([makeTopic("a", 0.5)]),
          makeWork([makeTopic("a", 0.5)]),
        ],
      },
      { id: "R2", works: [makeWork([makeTopic("b")])] },
    ]);
    const r1 = profiles[0];
    expect(r1?.vector.has("topic::Ta")).toBe(true);
  });
});
