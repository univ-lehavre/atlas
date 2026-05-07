import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  pipeline: vi.fn(),
  extractor: vi.fn(),
}));

vi.mock("@xenova/transformers", () => ({
  pipeline: mocks.pipeline,
}));

import { buildEmbeddingProfiles } from "./embedding-profile.js";

const fakeVector = (length: number, fill = 0.5): Float32Array => {
  const out = new Float32Array(length);
  out.fill(fill);
  return out;
};

beforeEach(() => {
  mocks.pipeline.mockReset();
  mocks.extractor.mockReset();
  mocks.pipeline.mockResolvedValue(mocks.extractor);
  mocks.extractor.mockImplementation(async () => ({
    data: fakeVector(4, 0.5),
  }));
});

describe("buildEmbeddingProfiles", () => {
  it("returns a zero-vector profile when a researcher has no work text", async () => {
    const profiles = await buildEmbeddingProfiles([
      {
        id: "R1",
        works: [{ topics: [], keywords: [] }],
      },
    ]);

    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.researcherId).toBe("R1");
    expect(profiles[0]?.vector).toBeInstanceOf(Float32Array);
    expect(profiles[0]?.vector.length).toBe(384);
    expect(profiles[0]?.vector.every((x) => x === 0)).toBe(true);
    expect(mocks.extractor).not.toHaveBeenCalled();
  });

  it("computes a normalized mean-pooled vector across works", async () => {
    mocks.extractor
      .mockResolvedValueOnce({ data: fakeVector(4, 1) })
      .mockResolvedValueOnce({ data: fakeVector(4, 3) });

    const works = [
      {
        topics: [
          {
            topicId: "T1",
            topicLabel: "Machine learning",
            subfieldId: "SF1",
            subfieldLabel: "AI",
            fieldId: "F1",
            fieldLabel: "Computer Science",
            domainId: "D1",
            domainLabel: "Physical Sciences",
            score: 0.9,
          },
        ],
        keywords: [{ keywordId: "K1", keywordLabel: "neural", score: 0.8 }],
      },
      {
        topics: [],
        keywords: [{ keywordId: "K2", keywordLabel: "vision", score: 0.7 }],
      },
    ];

    const [profile] = await buildEmbeddingProfiles([{ id: "R1", works }]);

    expect(profile?.vector.length).toBe(4);
    const magnitude = Math.sqrt(
      [...(profile?.vector ?? [])].reduce((s, x) => s + x * x, 0),
    );
    expect(magnitude).toBeCloseTo(1);
    expect(mocks.extractor).toHaveBeenCalledTimes(2);
  });

  it("invokes onProgress after each researcher", async () => {
    const onProgress = vi.fn();
    await buildEmbeddingProfiles(
      [
        { id: "R1", works: [{ topics: [], keywords: [] }] },
        { id: "R2", works: [{ topics: [], keywords: [] }] },
      ],
      onProgress,
    );

    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });
});
