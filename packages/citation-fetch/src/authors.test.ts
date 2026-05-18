import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect } from "effect";
import {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorID,
  searchWorksByAuthorIDs,
  searchWorksByDOI,
  searchWorksByORCID,
} from "./authors.js";

vi.mock("./api.js", () => ({
  fetchAPIResults: vi.fn(() => Effect.succeed([])),
}));

import { fetchAPIResults } from "./api.js";

const mockFetchAPIResults = vi.mocked(fetchAPIResults);
const config = {
  userAgent: "atlas-test/1.0",
  apiURL: "https://openalex.test",
  apiKey: "key-123",
};

describe("author and author-work searches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAPIResults.mockReturnValue(Effect.succeed([]));
  });

  it("searches authors by display name", async () => {
    await Effect.runPromise(searchAuthorsByName(["Ada", "Grace"], config));

    expect(mockFetchAPIResults).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "authors",
        apiURL: "https://openalex.test",
        userAgent: "atlas-test/1.0",
        perPage: 100,
        fetchAPIOptions: { search: "Ada|Grace", api_key: "key-123" },
      }),
    );
  });

  it("searches authors by ORCID", async () => {
    await Effect.runPromise(
      searchAuthorsByORCID(["0000-0001", "0000-0002"], config),
    );

    expect(mockFetchAPIResults).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "authors",
        fetchAPIOptions: {
          filter: "orcid:0000-0001|0000-0002",
          api_key: "key-123",
        },
      }),
    );
  });

  it("searches works for one or many authors", async () => {
    await Effect.runPromise(searchWorksByAuthorIDs(["A1", "A2"], config));
    await Effect.runPromise(searchWorksByAuthorID("A3", config));

    expect(mockFetchAPIResults).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        endpoint: "works",
        fetchAPIOptions: {
          filter: "author.id:A1|A2",
          api_key: "key-123",
        },
      }),
    );
    expect(mockFetchAPIResults).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        endpoint: "works",
        fetchAPIOptions: {
          filter: "author.id:A3",
          api_key: "key-123",
        },
      }),
    );
  });

  it("passes pagination callbacks for single-author works", async () => {
    const onRateLimit = vi.fn();
    const onPage = vi.fn();

    await Effect.runPromise(
      searchWorksByAuthorID("A1", config, onRateLimit, onPage),
    );

    expect(mockFetchAPIResults).toHaveBeenCalledWith(
      expect.objectContaining({
        onRateLimit,
        onPage,
      }),
    );
  });

  it("searches works by ORCID and DOI without an api key when absent", async () => {
    const configWithoutKey = { userAgent: "atlas-test/1.0" };

    await Effect.runPromise(
      searchWorksByORCID("0000-0001" as never, configWithoutKey),
    );
    await Effect.runPromise(
      searchWorksByDOI(["10.1/a", "10.1/b"], configWithoutKey),
    );

    expect(mockFetchAPIResults).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        apiURL: "https://api.openalex.org",
        fetchAPIOptions: { filter: "author.orcid:0000-0001" },
      }),
    );
    expect(mockFetchAPIResults).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fetchAPIOptions: { filter: "doi:10.1/a|10.1/b" },
      }),
    );
  });
});
