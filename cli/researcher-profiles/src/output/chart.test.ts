import { describe, it, expect } from "vitest";
import type { ResearcherMatch } from "@univ-lehavre/atlas-researcher-profiles";
import { generateChart } from "./chart.js";

const makeMatch = (
  overrides: Partial<{
    nameA: string;
    nameB: string;
    similarity: number;
    complementarity: number;
    tfidfSim: number;
    embeddingSim: number;
    sharedDomains: string[];
    sharedFields: string[];
    sharedSubfields: string[];
    distinctTopicsA: string[];
    distinctTopicsB: string[];
    sharedKeywords: string[];
  }> = {},
): ResearcherMatch => ({
  researcherA: { id: "a1", name: overrides.nameA ?? "Alice" },
  researcherB: { id: "b2", name: overrides.nameB ?? "Bob" },
  scores: {
    similarity: overrides.similarity ?? 0.5,
    complementarity: overrides.complementarity ?? 0.5,
    tfidfSim: overrides.tfidfSim ?? 0.4,
    embeddingSim: overrides.embeddingSim ?? 0.6,
  },
  explanation: {
    sharedDomains: overrides.sharedDomains ?? [],
    sharedFields: overrides.sharedFields ?? [],
    sharedSubfields: overrides.sharedSubfields ?? [],
    distinctTopicsA: overrides.distinctTopicsA ?? [],
    distinctTopicsB: overrides.distinctTopicsB ?? [],
    sharedKeywords: overrides.sharedKeywords ?? [],
  },
});

describe("generateChart", () => {
  it("emits a self-contained HTML document", () => {
    const html = generateChart([makeMatch()]);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("</html>");
    expect(html).toContain("<svg");
    expect(html).toContain("</svg>");
    expect(html).toContain("<script>");
  });

  it("renders one <circle> per match", () => {
    const matches = [
      makeMatch({ nameA: "A", nameB: "B" }),
      makeMatch({ nameA: "C", nameB: "D", similarity: 0.8 }),
      makeMatch({ nameA: "E", nameB: "F", complementarity: 0.9 }),
    ];
    const html = generateChart(matches);
    const circles = html.match(/<circle /g);
    expect(circles).toHaveLength(3);
    expect(html).toContain("3 pairs");
  });

  it("uses green dot color for high similarity AND complementarity", () => {
    const html = generateChart([
      makeMatch({ similarity: 0.8, complementarity: 0.8 }),
    ]);
    expect(html).toContain('fill="#059669"');
  });

  it("uses orange dot color for high complementarity only", () => {
    const html = generateChart([
      makeMatch({ similarity: 0.2, complementarity: 0.8 }),
    ]);
    expect(html).toContain('fill="#d97706"');
  });

  it("uses grey-ish dot for high similarity only", () => {
    const html = generateChart([
      makeMatch({ similarity: 0.8, complementarity: 0.2 }),
    ]);
    expect(html).toContain('fill="#6b7280"');
  });

  it("uses pale dot for low similarity and low complementarity", () => {
    const html = generateChart([
      makeMatch({ similarity: 0.1, complementarity: 0.1 }),
    ]);
    expect(html).toContain('fill="#d1d5db"');
  });

  it("embeds a JSON DATA payload with formatted scores", () => {
    const html = generateChart([
      makeMatch({
        nameA: "Alice",
        nameB: "Bob",
        similarity: 0.5,
        complementarity: 0.5,
        tfidfSim: 0.4,
        embeddingSim: 0.6,
      }),
    ]);
    const m = /const DATA = (\[.*?\]);/s.exec(html);
    expect(m).not.toBeNull();
    const data = JSON.parse(m![1]!) as {
      nameA: string;
      nameB: string;
      sim: string;
      compl: string;
      tfidf: string;
      emb: string;
    }[];
    expect(data).toHaveLength(1);
    expect(data[0]!.nameA).toBe("Alice");
    expect(data[0]!.nameB).toBe("Bob");
    expect(data[0]!.sim).toBe("50.0");
    expect(data[0]!.compl).toBe("50.0");
    expect(data[0]!.tfidf).toBe("40.0");
    expect(data[0]!.emb).toBe("60.0");
  });

  it("escapes HTML in quadrant labels (well-known safe content)", () => {
    const html = generateChart([makeMatch()]);
    // The quadrant texts contain "&" entities only if we escape them.
    expect(html).toContain("Similar &amp; complementary");
    expect(html).toContain("Different &amp; complementary");
    expect(html).toContain("Similar &amp; redundant");
    expect(html).toContain("Different &amp; redundant");
  });

  it("renders 11 grid lines per axis (0..10)", () => {
    const html = generateChart([makeMatch()]);
    // Each axis tick generates labels like "0%", "10%", … "100%".
    expect(html).toContain(">0%<");
    expect(html).toContain(">50%<");
    expect(html).toContain(">100%<");
  });

  it("propagates shared/distinct lists into the DATA payload", () => {
    const html = generateChart([
      makeMatch({
        sharedDomains: ["dom1", "dom2"],
        sharedFields: ["fld1"],
        sharedSubfields: ["sub1"],
        distinctTopicsA: ["tA"],
        distinctTopicsB: ["tB"],
        sharedKeywords: ["kw1", "kw2"],
      }),
    ]);
    const m = /const DATA = (\[.*?\]);/s.exec(html);
    expect(m).not.toBeNull();
    const data = JSON.parse(m![1]!) as {
      sharedDomains: string[];
      sharedFields: string[];
      sharedSubfields: string[];
      distinctA: string[];
      distinctB: string[];
      sharedKeywords: string[];
    }[];
    expect(data[0]!.sharedDomains).toEqual(["dom1", "dom2"]);
    expect(data[0]!.sharedFields).toEqual(["fld1"]);
    expect(data[0]!.sharedSubfields).toEqual(["sub1"]);
    expect(data[0]!.distinctA).toEqual(["tA"]);
    expect(data[0]!.distinctB).toEqual(["tB"]);
    expect(data[0]!.sharedKeywords).toEqual(["kw1", "kw2"]);
  });

  it("emits an empty DATA array when there are no matches", () => {
    const html = generateChart([]);
    expect(html).toContain("const DATA = [];");
    expect(html).toContain("0 pairs");
    expect(html.match(/<circle /g)).toBeNull();
  });
});
