import { describe, it, expect } from "@effect/vitest";
import { Effect, Layer, Schema, ConfigProvider } from "effect";
import {
  FetchOnePage,
  type PageResult,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  searchAuthors,
  retrieve_articles,
  retrieve_articles_given_work_ids,
} from "./fetch-citation-entities.js";

// FetchOnePage test layer (écart E14, ADR 0049): one empty page, with each
// call recorded for URL/params assertions — replaces the former vi.mock.
const makeFetchLayer = (): {
  layer: Layer.Layer<FetchOnePage>;
  calls: Array<[URL, Record<string, unknown>]>;
} => {
  const calls: Array<[URL, Record<string, unknown>]> = [];
  const layer = Layer.succeed(FetchOnePage, (<A>(
    url: URL,
    params: Record<string, unknown>,
    _userAgent: string,
    _schema: Schema.Schema<A>,
  ) => {
    calls.push([url, { ...params }]);
    return Effect.succeed({
      data: { meta: { count: 0, page: 1, per_page: 5 }, results: [] },
      rateLimit: undefined,
    } as PageResult<A>);
  }) as typeof FetchOnePage.Service);
  return { layer, calls };
};

const provideConfig = <A, E>(
  effect: Effect.Effect<A, E, FetchOnePage>,
  fetchLayer: Layer.Layer<FetchOnePage>,
): Effect.Effect<A, E, never> =>
  Effect.withConfigProvider(
    effect.pipe(Effect.provide(fetchLayer)),
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

describe("searchAuthors", () => {
  it.effect("calls the authors endpoint with the search term", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer();
      yield* provideConfig(searchAuthors("alice"), layer);
      const [calledUrl, calledParams] = calls[0]!;
      expect(calledUrl.toString()).toBe("https://api.openalex.org/authors");
      expect(calledParams["search"]).toBe("alice");
      expect(calledParams["per_page"]).toBe(5);
    }),
  );

  it.effect("respects the start_page argument", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer();
      yield* provideConfig(searchAuthors("alice", 3), layer);
      const [, calledParams] = calls[0]!;
      expect(calledParams["page"]).toBe(3);
    }),
  );
});

describe("retrieve_articles", () => {
  it.effect("builds a filter joining author and institution IDs", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer();
      yield* provideConfig(retrieve_articles(["A1", "A2"], ["I1"]), layer);
      const [calledUrl, calledParams] = calls[0]!;
      expect(calledUrl.toString()).toBe("https://api.openalex.org/works");
      const filter = calledParams["filter"] as string;
      expect(filter).toContain("author.id:A1|A2");
      expect(filter).toContain("institutions.id:I1");
      expect(filter).toContain("type:article");
    }),
  );
});

describe("retrieve_articles_given_work_ids", () => {
  it.effect("builds a filter from work IDs", () =>
    Effect.gen(function* () {
      const { layer, calls } = makeFetchLayer();
      yield* provideConfig(
        retrieve_articles_given_work_ids(["W1", "W2"]),
        layer,
      );
      const [calledUrl, calledParams] = calls[0]!;
      expect(calledUrl.toString()).toBe("https://api.openalex.org/works");
      const filter = calledParams["filter"] as string;
      expect(filter).toBe("ids.openalex:W1|W2");
    }),
  );
});
