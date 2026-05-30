import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import type {
  ResearcherRow,
  ResearcherData,
  ResearcherMatch,
} from "@univ-lehavre/atlas-researcher-profiles";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  outro: vi.fn(),
}));

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-researcher-profiles", () => ({
  fetchResearchers: vi.fn(),
  fetchResearcherData: vi.fn(),
  extractNormalizedWorks: vi.fn(),
  buildTfidfProfiles: vi.fn(),
  buildEmbeddingProfiles: vi.fn(),
  cosineSimilarity: vi.fn(),
  embeddingCosineSimilarity: vi.fn(),
  complementarityScore: vi.fn(),
  computeEnsembleMatch: vi.fn(),
  buildExplanation: vi.fn(),
  buildMatch: vi.fn(),
  sortByField: vi.fn(),
}));

vi.mock("../output/chart.js", () => ({
  generateChart: vi.fn(() => "<html>chart</html>"),
}));

import { writeFileSync } from "node:fs";
import { outro, log } from "@clack/prompts";
import {
  fetchResearchers,
  fetchResearcherData,
  extractNormalizedWorks,
  buildTfidfProfiles,
  buildEmbeddingProfiles,
  cosineSimilarity,
  embeddingCosineSimilarity,
  complementarityScore,
  computeEnsembleMatch,
  buildExplanation,
  buildMatch,
  sortByField,
} from "@univ-lehavre/atlas-researcher-profiles";
import { generateChart } from "../output/chart.js";
import { matchResearchers } from "./match-researchers.js";

const row = (overrides: Partial<ResearcherRow> = {}): ResearcherRow => ({
  userid: "u1",
  last_name: "Doe",
  middle_name: "",
  first_name: "Jane",
  orcid: "",
  oa_imported_at: "",
  oa_locked_at: "",
  openalex_complete: "0",
  ...overrides,
});

const emptyData: ResearcherData = {
  fullnames: [],
  affiliations: [],
  oa_references: [],
  final_references: [],
};

const makeMatch = (
  nameA: string,
  nameB: string,
  sim = 0.5,
  compl = 0.5,
): ResearcherMatch => ({
  researcherA: { id: nameA, name: nameA },
  researcherB: { id: nameB, name: nameB },
  scores: {
    similarity: sim,
    complementarity: compl,
    tfidfSim: sim,
    embeddingSim: sim,
  },
  explanation: {
    sharedDomains: ["dom1", "dom2"],
    sharedFields: ["fld1"],
    sharedSubfields: ["sub1"],
    distinctTopicsA: ["tA"],
    distinctTopicsB: ["tB"],
    sharedKeywords: [],
  },
});

const baseOpts = {
  crfUrl: "http://x",
  crfToken: "tok",
  output: "table" as const,
  sortBy: "similarity" as const,
  keywords: false,
  chart: false,
};

describe("matchResearchers", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((_c?: number) => {
      throw new Error("__exit__");
    }) as never);
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {
      /* noop */
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleLog.mockRestore();
  });

  it("exits when fetchResearchers fails", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.fail(new Error("boom")) as never,
    );

    await expect(matchResearchers(baseOpts)).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("outros early when less than 2 researchers", async () => {
    vi.mocked(fetchResearchers).mockReturnValue(
      Effect.succeed([row()]) as never,
    );

    await matchResearchers(baseOpts);

    expect(outro).toHaveBeenCalledWith(
      "Not enough researchers to compute matches",
    );
    expect(fetchResearcherData).not.toHaveBeenCalled();
  });

  it("outros early when fewer than 2 researchers have works", async () => {
    const rs = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(extractNormalizedWorks).mockReturnValue([]);

    await matchResearchers(baseOpts);

    expect(outro).toHaveBeenCalledWith(
      "Not enough researchers with topic data to compute matches",
    );
    expect(buildTfidfProfiles).not.toHaveBeenCalled();
  });

  it("warns when some researchers are skipped (no works)", async () => {
    const rs = [
      row({ userid: "u1", first_name: "A", last_name: "A" }),
      row({ userid: "u2", first_name: "B", last_name: "B" }),
      row({ userid: "u3", first_name: "C", last_name: "C" }),
    ];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    // First two have works, third has none
    vi.mocked(extractNormalizedWorks)
      .mockReturnValueOnce([{ id: "w1" }] as never)
      .mockReturnValueOnce([{ id: "w2" }] as never)
      .mockReturnValueOnce([]);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.5);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.5);
    vi.mocked(complementarityScore).mockReturnValue(0.5);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.5,
      tfidfSim: 0.5,
      embeddingSim: 0.5,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    });
    vi.mocked(buildMatch).mockReturnValue(makeMatch("A A", "B B"));
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers(baseOpts);

    const warns = vi
      .mocked(log.warn)
      .mock.calls.map((c: unknown[]) => String(c[0]));
    expect(warns.some((w) => w.includes("excluded"))).toBe(true);
    expect(outro).toHaveBeenCalled();
  });

  it("prints a JSON payload when output=json", async () => {
    const rs = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(extractNormalizedWorks).mockReturnValue([{ id: "w" }] as never);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.4);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.6);
    vi.mocked(complementarityScore).mockReturnValue(0.3);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.3,
      tfidfSim: 0.4,
      embeddingSim: 0.6,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    });
    const m = makeMatch("Jane Doe", "Jane Doe");
    vi.mocked(buildMatch).mockReturnValue(m);
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers({ ...baseOpts, output: "json", top: 5 });

    const jsonLine = consoleLog.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find(
        (l: string) => l.trim().startsWith("[") || l.trim().startsWith("{"),
      );
    expect(jsonLine).toBeDefined();
  });

  it("prints a top-N table when output=table", async () => {
    const rs = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(extractNormalizedWorks).mockReturnValue([{ id: "w" }] as never);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.5);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.5);
    vi.mocked(complementarityScore).mockReturnValue(0.5);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.5,
      tfidfSim: 0.5,
      embeddingSim: 0.5,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: ["d1"],
      sharedFields: ["f1"],
      sharedSubfields: ["s1"],
      distinctTopicsA: ["tA"],
      distinctTopicsB: ["tB"],
      sharedKeywords: [],
    });
    vi.mocked(buildMatch).mockReturnValue(makeMatch("Alice", "Bob"));
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers({ ...baseOpts, top: 1 });

    const calls = vi
      .mocked(log.message)
      .mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((c) => c.includes("Alice"))).toBe(true);
  });

  it("writes a chart file when chart=true", async () => {
    const rs = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(extractNormalizedWorks).mockReturnValue([{ id: "w" }] as never);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.5);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.5);
    vi.mocked(complementarityScore).mockReturnValue(0.5);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.5,
      tfidfSim: 0.5,
      embeddingSim: 0.5,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    });
    vi.mocked(buildMatch).mockReturnValue(makeMatch("X", "Y"));
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers({ ...baseOpts, chart: true });

    expect(generateChart).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const args = vi.mocked(writeFileSync).mock.calls[0]!;
    expect(String(args[0])).toMatch(/matches\.html$/);
    expect(args[1]).toBe("<html>chart</html>");
  });

  it("forwards keywords flag to TF-IDF and complementarity calls", async () => {
    const rs = [row({ userid: "u1" }), row({ userid: "u2" })];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(extractNormalizedWorks).mockReturnValue([{ id: "w" }] as never);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.5);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.5);
    vi.mocked(complementarityScore).mockReturnValue(0.5);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.5,
      tfidfSim: 0.5,
      embeddingSim: 0.5,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    });
    vi.mocked(buildMatch).mockReturnValue(makeMatch("X", "Y"));
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers({ ...baseOpts, keywords: true });

    expect(buildTfidfProfiles).toHaveBeenCalledWith(expect.anything(), {
      includeKeywords: true,
    });
    expect(complementarityScore).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { includeKeywords: true },
    );
  });

  it("tolerates fetchResearcherData failing for some users (data=null filtered out)", async () => {
    const rs = [
      row({ userid: "u1" }),
      row({ userid: "u2" }),
      row({ userid: "u3" }),
    ];
    vi.mocked(fetchResearchers).mockReturnValue(Effect.succeed(rs) as never);
    vi.mocked(fetchResearcherData)
      .mockReturnValueOnce(Effect.succeed(emptyData) as never)
      .mockReturnValueOnce(Effect.fail(new Error("nope")) as never)
      .mockReturnValueOnce(Effect.succeed(emptyData) as never);
    vi.mocked(extractNormalizedWorks).mockReturnValue([{ id: "w" }] as never);

    const tfidfProfile = { vector: new Map(), labels: new Map() };
    vi.mocked(buildTfidfProfiles).mockReturnValue([
      tfidfProfile,
      tfidfProfile,
    ] as never);
    vi.mocked(buildEmbeddingProfiles).mockResolvedValue([
      { vector: [0, 1] },
      { vector: [1, 0] },
    ] as never);
    vi.mocked(cosineSimilarity).mockReturnValue(0.5);
    vi.mocked(embeddingCosineSimilarity).mockReturnValue(0.5);
    vi.mocked(complementarityScore).mockReturnValue(0.5);
    vi.mocked(computeEnsembleMatch).mockReturnValue({
      similarity: 0.5,
      complementarity: 0.5,
      tfidfSim: 0.5,
      embeddingSim: 0.5,
    });
    vi.mocked(buildExplanation).mockReturnValue({
      sharedDomains: [],
      sharedFields: [],
      sharedSubfields: [],
      distinctTopicsA: [],
      distinctTopicsB: [],
      sharedKeywords: [],
    });
    vi.mocked(buildMatch).mockReturnValue(makeMatch("X", "Y"));
    vi.mocked(sortByField).mockImplementation((arr: ResearcherMatch[]) => arr);

    await matchResearchers(baseOpts);

    // Should have completed without throwing despite the failed fetch
    expect(outro).toHaveBeenCalled();
  });
});
