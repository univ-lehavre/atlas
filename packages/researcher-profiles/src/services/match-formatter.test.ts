import { describe, it, expect } from "vitest";
import {
  buildExplanation,
  buildMatch,
  sortByField,
  topLabels,
  type ResearcherMatch,
} from "./match-formatter.js";
import type { TfidfProfile } from "./tfidf-profile.js";
import type { MatchScore } from "./ensemble.js";

const profile = (
  id: string,
  vector: Record<string, number>,
  labels: Record<string, string>,
): TfidfProfile => ({
  researcherId: id,
  vector: new Map(Object.entries(vector)),
  labels: new Map(Object.entries(labels)),
});

describe("buildExplanation", () => {
  it("collects shared and distinct labels by prefix", () => {
    const a = profile(
      "A",
      {
        "domain::D1": 1,
        "field::F1": 1,
        "subfield::SF1": 1,
        "topic::T1": 1,
        "topic::T2": 0.5,
        "keyword::K1": 1,
      },
      {
        "domain::D1": "Computer Science",
        "field::F1": "AI",
        "subfield::SF1": "ML",
        "topic::T1": "Neural Nets",
        "topic::T2": "Vision",
        "keyword::K1": "deep",
      },
    );
    const b = profile(
      "B",
      {
        "domain::D1": 1,
        "field::F1": 1,
        "subfield::SF1": 1,
        "topic::T3": 1,
        "keyword::K1": 1,
      },
      {
        "domain::D1": "Computer Science",
        "field::F1": "AI",
        "subfield::SF1": "ML",
        "topic::T3": "NLP",
        "keyword::K1": "deep",
      },
    );

    const explanation = buildExplanation(a, b);
    expect(explanation.sharedDomains).toContain("Computer Science");
    expect(explanation.sharedFields).toContain("AI");
    expect(explanation.sharedSubfields).toContain("ML");
    expect(explanation.sharedKeywords).toContain("deep");
    expect(explanation.distinctTopicsA).toContain("Neural Nets");
    expect(explanation.distinctTopicsA).toContain("Vision");
    expect(explanation.distinctTopicsB).toContain("NLP");
  });

  it("falls back to the dimension key when no label is available", () => {
    const a = profile("A", { "topic::T1": 1 }, {});
    const b = profile("B", { "topic::T2": 1 }, {});
    const explanation = buildExplanation(a, b);
    expect(explanation.distinctTopicsA).toContain("topic::T1");
  });

  it("limits each list to the top 5 entries", () => {
    const dims: Record<string, number> = {};
    const labels: Record<string, string> = {};
    for (let i = 0; i < 10; i += 1) {
      dims[`topic::T${i}`] = 10 - i;
      labels[`topic::T${i}`] = `Topic ${i}`;
    }
    const a = profile("A", dims, labels);
    const b = profile("B", {}, {});
    const explanation = buildExplanation(a, b);
    expect(explanation.distinctTopicsA).toHaveLength(5);
    expect(explanation.distinctTopicsA[0]).toBe("Topic 0");
  });
});

describe("buildMatch", () => {
  it("aggregates researcher info, scores and explanation", () => {
    const scores: MatchScore = {
      similarity: 0.5,
      complementarity: 0.3,
      tfidfSim: 0.4,
      embeddingSim: 0.6,
    };
    const match = buildMatch(
      { id: "A", name: "Alice" },
      { id: "B", name: "Bob" },
      scores,
      {
        sharedDomains: [],
        sharedFields: [],
        sharedSubfields: [],
        distinctTopicsA: [],
        distinctTopicsB: [],
        sharedKeywords: [],
      },
    );
    expect(match.researcherA.name).toBe("Alice");
    expect(match.scores).toBe(scores);
  });
});

const makeMatch = (s: number, c: number): ResearcherMatch =>
  ({
    researcherA: { id: "A", name: "" },
    researcherB: { id: "B", name: "" },
    scores: { similarity: s, complementarity: c, tfidfSim: 0, embeddingSim: 0 },
    explanation: {
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    },
  }) as ResearcherMatch;

describe("sortByField", () => {
  it("orders matches descending by the chosen field", () => {
    const make = makeMatch;

    const sorted = sortByField(
      [make(0.1, 0.9), make(0.5, 0.2), make(0.3, 0.5)],
      "similarity",
    );
    expect(sorted.map((m) => m.scores.similarity)).toEqual([0.5, 0.3, 0.1]);

    const byComp = sortByField(sorted, "complementarity");
    expect(byComp.map((m) => m.scores.complementarity)).toEqual([
      0.9, 0.5, 0.2,
    ]);
  });
});

describe("topLabels", () => {
  it("returns the highest scoring labels for the prefix", () => {
    const a = profile(
      "A",
      { "topic::T1": 0.4, "topic::T2": 0.9 },
      { "topic::T1": "Low", "topic::T2": "High" },
    );
    expect(topLabels(a, "topic::")).toEqual(["High", "Low"]);
  });
});
