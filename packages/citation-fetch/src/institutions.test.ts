import { describe, it, expect } from "@effect/vitest";
import { Effect, type Layer, type Schema } from "effect";
import {
  FetchOnePage,
  type PageResult,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  recordingFnLayer,
  type Recorder,
} from "@univ-lehavre/atlas-test-utils-effect";
import { searchInstitutions } from "./institutions.js";

const config = { userAgent: "test/1.0", apiURL: "https://api.openalex.org" };

// FetchOnePage test layer (écart E14, ADR 0049): one canned page, with each
// call recorded by the shared recordingFnLayer helper (layer-native
// replacement for vi.mock + vi.mocked(fn).mock.calls). The recorder's
// `callsTo("call")` yields the [url, params, userAgent, schema] tuples.
const makeFetchLayer = (
  response: PageResult<unknown>,
): { layer: Layer.Layer<FetchOnePage>; recorder: Recorder } =>
  recordingFnLayer(FetchOnePage, (<A>(
    _url: URL,
    _params: Record<string, unknown>,
    _userAgent: string,
    _schema: Schema.Schema<A>,
  ) =>
    Effect.succeed(response as PageResult<A>)) as typeof FetchOnePage.Service);

describe("searchInstitutions", () => {
  it.effect("returns empty result for empty query", () =>
    Effect.gen(function* () {
      const { layer, recorder } = makeFetchLayer({
        data: { meta: { count: 0, db_response_time_ms: 0 }, results: [] },
        rateLimit: undefined,
      });
      const result = yield* searchInstitutions("", config).pipe(
        Effect.provide(layer),
      );
      expect(result.institutions).toHaveLength(0);
      expect(result.meta.count).toBe(0);
      expect(recorder.calls).toHaveLength(0);
    }),
  );

  it.effect("returns empty result for whitespace-only query", () =>
    Effect.gen(function* () {
      const { layer, recorder } = makeFetchLayer({
        data: { meta: { count: 0, db_response_time_ms: 0 }, results: [] },
        rateLimit: undefined,
      });
      const result = yield* searchInstitutions("   ", config).pipe(
        Effect.provide(layer),
      );
      expect(result.institutions).toHaveLength(0);
      expect(recorder.calls).toHaveLength(0);
    }),
  );

  it.effect("calls fetchOnePage and maps response for non-empty query", () =>
    Effect.gen(function* () {
      const { layer } = makeFetchLayer({
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
      });

      const result = yield* searchInstitutions("havre", config).pipe(
        Effect.provide(layer),
      );

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
    }),
  );

  it.effect(
    "falls back to the default base URL when apiURL is not provided",
    () =>
      Effect.gen(function* () {
        const { layer, recorder } = makeFetchLayer({
          data: { meta: { count: 0, db_response_time_ms: 0 }, results: [] },
          rateLimit: undefined,
        });

        yield* searchInstitutions("havre", { userAgent: "test/1.0" }).pipe(
          Effect.provide(layer),
        );

        const [url] = recorder.callsTo("call")[0]! as [URL];
        expect(url.toString()).toContain("https://api.openalex.org");
      }),
  );

  it.effect("passes apiKey when provided", () =>
    Effect.gen(function* () {
      const { layer, recorder } = makeFetchLayer({
        data: { meta: { count: 0, db_response_time_ms: 0 }, results: [] },
        rateLimit: undefined,
      });

      yield* searchInstitutions("test", { ...config, apiKey: "key-123" }).pipe(
        Effect.provide(layer),
      );

      const [, params] = recorder.callsTo("call")[0]! as [
        URL,
        Record<string, unknown>,
      ];
      expect(params["api_key"]).toBe("key-123");
    }),
  );
});
