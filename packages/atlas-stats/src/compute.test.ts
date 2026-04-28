import { describe, it, expect } from "vitest";
import { computeStats } from "./compute.js";
import type { AtlasStatsCache } from "./types.js";

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};

const makeCache = (
  overrides: Partial<AtlasStatsCache> = {},
): AtlasStatsCache => ({
  savedAt: Date.now(),
  releases: [],
  packages: [],
  downloads: {},
  ...overrides,
});

describe("computeStats", () => {
  it("returns empty stats for empty cache", () => {
    const result = computeStats(makeCache(), "day");
    expect(result.kpi.releases).toBe(0);
    expect(result.kpi.packagesTotal).toBe(0);
    expect(result.kpi.packagesActive).toBe(0);
    expect(result.kpi.downloadsTotal).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("counts releases within the period", () => {
    const cache = makeCache({
      releases: [
        { tag_name: "v1.0", published_at: daysAgo(0) },
        { tag_name: "v0.9", published_at: daysAgo(40) },
      ],
    });
    const result = computeStats(cache, "month");
    expect(result.kpi.releases).toBe(1);
  });

  it("counts packages active within the period", () => {
    const cache = makeCache({
      packages: [
        { name: "pkg-a", version: "1.0.0", date: daysAgo(0) },
        { name: "pkg-b", version: "1.0.0", date: daysAgo(100) },
      ],
      downloads: {},
    });
    const result = computeStats(cache, "month");
    expect(result.kpi.packagesTotal).toBe(2);
    expect(result.kpi.packagesActive).toBe(1);
  });

  it("sums downloads within the period", () => {
    const cache = makeCache({
      packages: [{ name: "pkg-a", version: "1.0.0", date: daysAgo(5) }],
      downloads: {
        "pkg-a": [
          { day: daysAgo(1), downloads: 100 },
          { day: daysAgo(40), downloads: 999 },
        ],
      },
    });
    const result = computeStats(cache, "month");
    expect(result.kpi.downloadsTotal).toBe(100);
    expect(result.packages[0]?.totalDownloads).toBe(100);
  });

  it("sorts packages by total downloads descending", () => {
    const cache = makeCache({
      packages: [
        { name: "low", version: "1.0.0", date: daysAgo(1) },
        { name: "high", version: "1.0.0", date: daysAgo(1) },
      ],
      downloads: {
        low: [{ day: daysAgo(1), downloads: 10 }],
        high: [{ day: daysAgo(1), downloads: 500 }],
      },
    });
    const result = computeStats(cache, "week");
    expect(result.packages[0]?.name).toBe("high");
    expect(result.packages[1]?.name).toBe("low");
  });

  it("sets cachedAt from cache.savedAt", () => {
    const savedAt = 1_234_567_890;
    const result = computeStats(makeCache({ savedAt }), "day");
    expect(result.cachedAt).toBe(savedAt);
  });

  it("preserves period in result", () => {
    expect(computeStats(makeCache(), "quarter").period).toBe("quarter");
    expect(computeStats(makeCache(), "week").period).toBe("week");
  });
});
