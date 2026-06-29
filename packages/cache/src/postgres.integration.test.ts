import { execFileSync, spawnSync } from "node:child_process";
import { createServer } from "node:net";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Effect } from "effect";
import postgres from "postgres";

import { CacheStore } from "./store.js";
import { PostgresCacheLayer } from "./postgres.js";
import { createPgRefreshState } from "./refresh.js";

/**
 * Test d'intégration HERMÉTIQUE du back-end Postgres du cache (ADR 0083).
 *
 * Démarre un PostgreSQL épinglé PAR DIGEST (jamais un tag mobile, ADR 0057),
 * et vérifie : la DDL idempotente (deux Layers successifs ne cassent pas), le
 * round-trip JSONB, l'UPSERT (dernier écrivain gagne), l'horodatage `saved_at`,
 * et l'absence (clé non écrite → null). S'auto-saute si Docker est absent (un
 * contributeur sans Docker n'est pas bloqué). Le cache n'a pas besoin de
 * pgvector : une image Postgres standard suffit.
 */
const PG_IMAGE =
  "postgres:18-alpine@sha256:3f0182f7f06d949972a1d1901ff774e6d0b7c03ca95a27a12958d713fe5ea153";

const dockerAvailable = spawnSync("docker", ["--version"]).status === 0;
const describeOrSkip = dockerAvailable ? describe : describe.skip;

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

interface Payload {
  readonly label: string;
  readonly count: number;
}

describeOrSkip(
  "Postgres cache integration (épinglé, self-skip sans Docker)",
  () => {
    let container = "";
    let dsn = "";

    beforeAll(async () => {
      const port = await freePort();
      container = `atlas-cache-pg-test-${String(port)}`;
      dsn = `postgres://cache:test@127.0.0.1:${String(port)}/cache`;
      execFileSync("docker", [
        "run",
        "-d",
        "--rm",
        "--name",
        container,
        "-p",
        `127.0.0.1:${String(port)}:5432`,
        "-e",
        "POSTGRES_PASSWORD=test",
        "-e",
        "POSTGRES_USER=cache",
        "-e",
        "POSTGRES_DB=cache",
        PG_IMAGE,
      ]);
      // Attente par une VRAIE requête (pas pg_isready : faux positif pendant l'init).
      for (let i = 0; i < 90; i++) {
        try {
          const probe = postgres(dsn, { onnotice: () => {}, max: 1 });
          await probe`SELECT 1`;
          await probe.end();
          break;
        } catch {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }, 180_000);

    afterAll(() => {
      if (container) spawnSync("docker", ["rm", "-f", container]);
    });

    it("creates the table, round-trips JSONB, upserts, and stamps saved_at", async () => {
      const program = Effect.gen(function* () {
        const store = yield* CacheStore;

        // Clé absente → null.
        expect(yield* store.get<Payload>("missing")).toBeNull();

        // Écriture + relecture (round-trip JSONB).
        yield* store.set<Payload>("k", { label: "a", count: 1 });
        const first = yield* store.get<Payload>("k");
        expect(first?.data).toEqual({ label: "a", count: 1 });
        expect(typeof first?.savedAt).toBe("number");

        // UPSERT : dernier écrivain gagne, pas de doublon de clé.
        yield* store.set<Payload>("k", { label: "b", count: 2 });
        const second = yield* store.get<Payload>("k");
        expect(second?.data).toEqual({ label: "b", count: 2 });
      });
      await Effect.runPromise(
        program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
      );
    });

    it("is idempotent on table creation (a second Layer does not fail)", async () => {
      const program = Effect.gen(function* () {
        const store = yield* CacheStore;
        yield* store.set<Payload>("again", { label: "z", count: 9 });
        const got = yield* store.get<Payload>("again");
        expect(got?.data).toEqual({ label: "z", count: 9 });
      });
      await Effect.runPromise(
        program.pipe(Effect.scoped, Effect.provide(PostgresCacheLayer(dsn))),
      );
    });

    it("partage lastRefreshAt via createPgRefreshState (bridage multi-instance)", async () => {
      const state = createPgRefreshState(dsn, "test:lastRefreshAt");
      // Jamais écrit → 0.
      expect(await state.getLastRefreshAt()).toBe(0);
      // Écrit puis relu (visible par toute instance partageant la table).
      await state.setLastRefreshAt(1_700_000_000_000);
      expect(await state.getLastRefreshAt()).toBe(1_700_000_000_000);
    });
  },
);
