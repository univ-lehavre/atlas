import { vi, describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { getWorksCount, getInstitutionStats } from "./works.js";

vi.mock("@univ-lehavre/atlas-fetch-one-api-page", () => ({
  fetchOnePage: vi.fn(),
}));

import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
const mockFetch = vi.mocked(fetchOnePage);

const config = { userAgent: "test/1.0", apiURL: "https://api.openalex.org" };

const metaResponse = (count: number) =>
  Effect.succeed({
    data: { meta: { count, db_response_time_ms: 10 } },
    rateLimit: undefined,
  });

describe("getWorksCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero count for empty institutionIds", async () => {
    const result = await Effect.runPromise(getWorksCount([], config));
    expect(result.count).toBe(0);
    expect(result.institutionCount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches works count for given institution IDs", async () => {
    mockFetch.mockReturnValue(metaResponse(42));

    const result = await Effect.runPromise(getWorksCount(["I1", "I2"], config));
    expect(result.count).toBe(42);
    expect(result.institutionCount).toBe(2);
    expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getInstitutionStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zeroed stats for empty institutionIds", async () => {
    const result = await Effect.runPromise(getInstitutionStats([], config));
    expect(result.worksCount).toBe(0);
    expect(result.articlesCount).toBe(0);
    expect(result.authorsCount).toBe(0);
    expect(result.institutionCount).toBe(0);
    expect(result.articlesByYear).toContainEqual({ year: "before", count: 0 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches stats in parallel and aggregates results", async () => {
    const groupByResponse = Effect.succeed({
      data: {
        meta: { count: 3, db_response_time_ms: 5 },
        group_by: [
          {
            key: String(new Date().getFullYear()),
            key_display_name: "Current year",
            count: 10,
          },
          {
            key: String(new Date().getFullYear() - 1),
            key_display_name: "Last year",
            count: 20,
          },
          { key: "1990", key_display_name: "Before range", count: 5 },
        ],
      },
      rateLimit: undefined,
    });

    mockFetch
      .mockReturnValueOnce(metaResponse(100)) // works
      .mockReturnValueOnce(groupByResponse) // articles group_by
      .mockReturnValueOnce(metaResponse(50)); // authors

    const result = await Effect.runPromise(getInstitutionStats(["I1"], config));

    expect(result.worksCount).toBe(100);
    expect(result.authorsCount).toBe(50);
    expect(result.institutionCount).toBe(1);
    expect(result.articlesByYear.find((y) => y.year === "before")?.count).toBe(
      5,
    );
    expect(result.articlesCount).toBeGreaterThan(0);
  });
});
