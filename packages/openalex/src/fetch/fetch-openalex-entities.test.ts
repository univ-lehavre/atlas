import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, ConfigProvider } from "effect";

vi.mock("@univ-lehavre/atlas-fetch-one-api-page", () => ({
  fetchOnePage: vi.fn(),
  FetchError: class FetchOnePageError extends Error {},
  ResponseParseError: class ResponseParseError extends Error {},
}));

import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  searchAuthors,
  retrieve_articles,
  retrieve_articles_given_work_ids,
} from "./fetch-openalex-entities.js";

const mockFetch = vi.mocked(fetchOnePage);

const provideConfig = <A, E>(
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> =>
  Effect.withConfigProvider(
    effect,
    ConfigProvider.fromMap(
      new Map([
        ["USER_AGENT", "atlas-test/1.0"],
        ["RATE_LIMIT", '{"limit":100,"interval":"1 seconds"}'],
        ["OPENALEX_API_URL", "https://api.openalex.org"],
        ["PER_PAGE", "5"],
        ["DUCKDB_PATH", "/tmp/test.duckdb"],
      ]),
    ),
  );

const emptyPage = () =>
  Effect.succeed({
    data: { meta: { count: 0, page: 1, per_page: 5 }, results: [] },
    rateLimit: undefined,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReturnValue(emptyPage());
});

describe("searchAuthors", () => {
  it("calls the authors endpoint with the search term", async () => {
    await Effect.runPromise(provideConfig(searchAuthors("alice")));
    const [calledUrl, calledParams] = mockFetch.mock.calls[0]!;
    expect((calledUrl as URL).toString()).toBe(
      "https://api.openalex.org/authors",
    );
    expect((calledParams as Record<string, unknown>)["search"]).toBe("alice");
    expect((calledParams as Record<string, unknown>)["per_page"]).toBe(5);
  });

  it("respects the start_page argument", async () => {
    await Effect.runPromise(provideConfig(searchAuthors("alice", 3)));
    const [, calledParams] = mockFetch.mock.calls[0]!;
    expect((calledParams as Record<string, unknown>)["page"]).toBe(3);
  });
});

describe("retrieve_articles", () => {
  it("builds a filter joining author and institution IDs", async () => {
    await Effect.runPromise(
      provideConfig(retrieve_articles(["A1", "A2"], ["I1"])),
    );
    const [calledUrl, calledParams] = mockFetch.mock.calls[0]!;
    expect((calledUrl as URL).toString()).toBe(
      "https://api.openalex.org/works",
    );
    const filter = (calledParams as Record<string, unknown>)[
      "filter"
    ] as string;
    expect(filter).toContain("author.id:A1|A2");
    expect(filter).toContain("institutions.id:I1");
    expect(filter).toContain("type:article");
  });
});

describe("retrieve_articles_given_work_ids", () => {
  it("builds a filter from work IDs", async () => {
    await Effect.runPromise(
      provideConfig(retrieve_articles_given_work_ids(["W1", "W2"])),
    );
    const [calledUrl, calledParams] = mockFetch.mock.calls[0]!;
    expect((calledUrl as URL).toString()).toBe(
      "https://api.openalex.org/works",
    );
    const filter = (calledParams as Record<string, unknown>)[
      "filter"
    ] as string;
    expect(filter).toBe("ids.openalex:W1|W2");
  });
});
