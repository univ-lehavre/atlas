import { vi, describe, it, expect, beforeEach } from "vitest";
import { Effect } from "effect";
import { searchInstitutions } from "./institutions.js";

vi.mock("@univ-lehavre/atlas-fetch-one-api-page", () => ({
  fetchOnePage: vi.fn(),
}));

import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
const mockFetch = vi.mocked(fetchOnePage);

const config = { userAgent: "test/1.0", apiURL: "https://api.openalex.org" };

describe("searchInstitutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result for empty query", async () => {
    const result = await Effect.runPromise(searchInstitutions("", config));
    expect(result.institutions).toHaveLength(0);
    expect(result.meta.count).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty result for whitespace-only query", async () => {
    const result = await Effect.runPromise(searchInstitutions("   ", config));
    expect(result.institutions).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls fetchOnePage and maps response for non-empty query", async () => {
    mockFetch.mockReturnValue(
      Effect.succeed({
        data: {
          meta: { count: 1, db_response_time_ms: 42, page: 1, per_page: 10 },
          results: [
            {
              id: "I123",
              display_name: "Université du Havre",
              hint: "Le Havre, France",
              cited_by_count: 5000,
              works_count: 1200,
              entity_type: "institution",
              external_id: null,
            },
          ],
        },
        rateLimit: undefined,
      }),
    );

    const result = await Effect.runPromise(searchInstitutions("havre", config));

    expect(result.institutions).toHaveLength(1);
    expect(result.institutions[0]).toMatchObject({
      id: "I123",
      displayName: "Université du Havre",
      location: "Le Havre, France",
      citedByCount: 5000,
      worksCount: 1200,
    });
    expect(result.meta.count).toBe(1);
    expect(result.meta.responseTimeMs).toBe(42);
  });

  it("passes apiKey when provided", async () => {
    mockFetch.mockReturnValue(
      Effect.succeed({
        data: {
          meta: { count: 0, db_response_time_ms: 0, page: 1, per_page: 10 },
          results: [],
        },
        rateLimit: undefined,
      }),
    );

    await Effect.runPromise(
      searchInstitutions("test", { ...config, apiKey: "key-123" }),
    );

    const [, params] = mockFetch.mock.calls[0] as [URL, Record<string, string>];
    expect(params["api_key"]).toBe("key-123");
  });
});
