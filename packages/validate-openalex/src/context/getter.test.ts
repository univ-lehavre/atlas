import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { getContext, isAuthorContext, getORCID } from "./getter.js";
import { ContextStore } from "../store/init.js";
import type { IContext } from "./types.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";

const orcid = "0000-0001-2345-6789" as unknown as ORCID;

const makeContext = (overrides: Partial<IContext> = {}): IContext => ({
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
  ...overrides,
});

describe("getContext", () => {
  it.effect("returns the context from store", () =>
    Effect.gen(function* () {
      const context = makeContext();
      const result = yield* getContext().pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(context)),
      );
      expect(result).toEqual(context);
    }),
  );

  it.effect("returns context with type none when not set as author", () =>
    Effect.gen(function* () {
      const context = makeContext({ type: "none", id: undefined });
      const result = yield* getContext().pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(context)),
      );
      expect(result.type).toBe("none");
    }),
  );
});

describe("isAuthorContext", () => {
  it.effect("returns true when context type is author", () =>
    Effect.gen(function* () {
      const result = yield* isAuthorContext().pipe(
        Effect.provideServiceEffect(
          ContextStore,
          Ref.make(makeContext({ type: "author" })),
        ),
      );
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when context type is not author", () =>
    Effect.gen(function* () {
      const result = yield* isAuthorContext().pipe(
        Effect.provideServiceEffect(
          ContextStore,
          Ref.make(makeContext({ type: "none" })),
        ),
      );
      expect(result).toBe(false);
    }),
  );
});

describe("getORCID", () => {
  it.effect("returns the orcid when context type is author and id is set", () =>
    Effect.gen(function* () {
      const result = yield* getORCID().pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(makeContext())),
      );
      expect(result).toBe(orcid);
    }),
  );

  it.effect("throws when context type is not author", () =>
    Effect.gen(function* () {
      const result = yield* getORCID().pipe(
        Effect.provideServiceEffect(
          ContextStore,
          Ref.make(makeContext({ type: "none" })),
        ),
        Effect.sandbox,
        Effect.either,
      );
      expect(result._tag).toBe("Left");
    }),
  );

  it.effect("throws when context type is author but id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* getORCID().pipe(
        Effect.provideServiceEffect(
          ContextStore,
          Ref.make(makeContext({ id: undefined })),
        ),
        Effect.sandbox,
        Effect.either,
      );
      expect(result._tag).toBe("Left");
    }),
  );
});
