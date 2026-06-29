import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it, expect } from "@effect/vitest";
import { Effect } from "effect";

import { CacheStore } from "./store.js";
import { FileCacheLayer } from "./file.js";

interface Payload {
  readonly n: number;
}

const withDir = <A, E>(
  run: (dir: string) => Effect.Effect<A, E, CacheStore>,
): Effect.Effect<A, E> => {
  const dir = mkdtempSync(path.join(tmpdir(), "atlas-cache-"));
  return run(dir).pipe(
    Effect.provide(FileCacheLayer(dir)),
    Effect.ensuring(
      Effect.sync(() => rmSync(dir, { recursive: true, force: true })),
    ),
  );
};

describe("FileCacheLayer", () => {
  it.effect("returns null for a missing key", () =>
    withDir((_dir) =>
      Effect.gen(function* () {
        const store = yield* CacheStore;
        const got = yield* store.get<Payload>("absent");
        expect(got).toBeNull();
      }),
    ),
  );

  it.effect("round-trips a payload and stamps savedAt", () =>
    withDir((_dir) =>
      Effect.gen(function* () {
        const store = yield* CacheStore;
        yield* store.set<Payload>("k", { n: 42 });
        const got = yield* store.get<Payload>("k");
        expect(got?.data).toEqual({ n: 42 });
        expect(typeof got?.savedAt).toBe("number");
      }),
    ),
  );

  it.effect("overwrites an existing key (last write wins)", () =>
    withDir((_dir) =>
      Effect.gen(function* () {
        const store = yield* CacheStore;
        yield* store.set<Payload>("k", { n: 1 });
        yield* store.set<Payload>("k", { n: 2 });
        const got = yield* store.get<Payload>("k");
        expect(got?.data).toEqual({ n: 2 });
      }),
    ),
  );

  it.effect("returns null for a corrupted file (invalid JSON)", () =>
    Effect.gen(function* () {
      const dir = mkdtempSync(path.join(tmpdir(), "atlas-cache-"));
      writeFileSync(path.join(dir, "bad.json"), "{ not json", "utf8");
      const program = Effect.gen(function* () {
        const store = yield* CacheStore;
        return yield* store.get<Payload>("bad");
      });
      const got = yield* program.pipe(Effect.provide(FileCacheLayer(dir)));
      rmSync(dir, { recursive: true, force: true });
      expect(got).toBeNull();
    }),
  );

  it.effect("returns null for a structurally invalid entry", () =>
    Effect.gen(function* () {
      const dir = mkdtempSync(path.join(tmpdir(), "atlas-cache-"));
      writeFileSync(
        path.join(dir, "nodata.json"),
        JSON.stringify({ savedAt: 1 }),
        "utf8",
      );
      const program = Effect.gen(function* () {
        const store = yield* CacheStore;
        return yield* store.get<Payload>("nodata");
      });
      const got = yield* program.pipe(Effect.provide(FileCacheLayer(dir)));
      rmSync(dir, { recursive: true, force: true });
      expect(got).toBeNull();
    }),
  );
});
