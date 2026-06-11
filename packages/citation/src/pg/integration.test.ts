import { execFileSync, spawnSync } from "node:child_process";
import { createServer } from "node:net";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Effect } from "effect";
import postgres from "postgres";

import { connect, read_migrations, migrate, close } from "./index.js";
import { load_researcher_fts, search_researchers_fts } from "./fts.js";

/**
 * Test d'intégration HERMÉTIQUE de l'index pgvector (étape 4.1).
 *
 * Démarre un PostgreSQL+pgvector épinglé PAR DIGEST (jamais un tag mobile, ADR 0057),
 * applique les migrations réelles et vérifie : l'extension `vector`, le round-trip d'un
 * `vector(384)`, une requête kNN, l'idempotence des migrations. S'auto-saute si Docker
 * est absent (un contributeur sans Docker n'est pas bloqué). La preuve d'intégration
 * réelle (CloudNativePG) reste un jalon banc, hors de ce test.
 *
 * Image épinglée = même majeure que la prod (PG18 + pgvector 0.8.2, ADR 0024).
 */
const PG_IMAGE =
  "pgvector/pgvector:pg18@sha256:42e7f6b4e1eceb02ff14e3e6bc6108bbe259abbe83879dc1845d0da1ddeb555d";

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

function vec(first: number): string {
  const arr = new Array(384).fill(0);
  arr[0] = first;
  return `[${arr.join(",")}]`;
}

describeOrSkip("pgvector integration (épinglé, self-skip sans Docker)", () => {
  let container = "";
  let port = 0;

  beforeAll(async () => {
    port = await freePort();
    container = `citation-pg-test-${port}`;
    execFileSync("docker", [
      "run",
      "-d",
      "--rm",
      "--name",
      container,
      "-p",
      `127.0.0.1:${port}:5432`,
      "-e",
      "POSTGRES_PASSWORD=test",
      "-e",
      "POSTGRES_USER=pgvector",
      "-e",
      "POSTGRES_DB=pgvector",
      PG_IMAGE,
    ]);
    // Attente de disponibilité par une VRAIE requête `SELECT 1` (pas `pg_isready` :
    // l'entrypoint Postgres démarre un serveur TEMPORAIRE pendant l'init, sur lequel
    // pg_isready peut répondre « prêt » avant que le vrai serveur — avec le rôle/base
    // pgvector — soit accessible. On boucle jusqu'à ce que la connexion réelle réussisse.
    const dsn = `postgres://pgvector:test@127.0.0.1:${port}/pgvector`;
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

  it("migrations, vector(384) kNN, FTS lexical, idempotence", async () => {
    const dsn = `postgres://pgvector:test@127.0.0.1:${port}/pgvector`;
    const program = Effect.gen(function* () {
      const sql = yield* connect(dsn);
      const migs = yield* read_migrations();
      const applied = yield* migrate(sql, migs);
      // L'extension `vector`, les tables et la colonne FTS ont été créées.
      expect(applied).toContain("0001_index_schema.sql");
      expect(applied).toContain("0002_researchers_fts.sql");

      // Round-trip d'un vecteur 384 + une paire.
      yield* Effect.tryPromise(
        () =>
          sql`INSERT INTO researchers (researcher_id, embedding, dt, run) VALUES ('A1', ${vec(1)}::vector, '2020-01', 'r1')`,
      );
      yield* Effect.tryPromise(
        () =>
          sql`INSERT INTO researchers (researcher_id, embedding, dt, run) VALUES ('A2', ${vec(0.2)}::vector, '2020-01', 'r1')`,
      );
      yield* Effect.tryPromise(
        () => sql`INSERT INTO pairs VALUES ('A1','A2',3,2,1,'2020-01','r1')`,
      );

      // Recherche kNN (l'index pgvector existe).
      const knn = yield* Effect.tryPromise(
        () =>
          sql<
            { researcher_id: string }[]
          >`SELECT researcher_id FROM researchers ORDER BY embedding <=> ${vec(1)}::vector LIMIT 1`,
      );
      expect(knn.length).toBe(1);

      const pair = yield* Effect.tryPromise(
        () =>
          sql<
            { cross_citations: number }[]
          >`SELECT cross_citations FROM pairs WHERE author_a = 'A1'`,
      );
      expect(Number(pair[0]?.cross_citations)).toBe(3);

      // FTS (4.2) : charge le document lexical par chercheur, l'upsert n'écrase pas
      // l'embedding (A1 a déjà un vecteur), puis recherche par mot-clé.
      const n = yield* load_researcher_fts(sql, "2020-01", "r1", [
        { researcherId: "A1", text: "machine learning, neural networks" },
        { researcherId: "A2", text: "climate ocean modeling" },
      ]);
      expect(n).toBe(2);
      const a1 = yield* Effect.tryPromise(
        () =>
          sql<
            { has_emb: boolean; has_fts: boolean }[]
          >`SELECT (embedding IS NOT NULL) AS has_emb, (fts IS NOT NULL) AS has_fts FROM researchers WHERE researcher_id = 'A1'`,
      );
      expect(a1[0]?.has_emb).toBe(true); // l'upsert FTS a préservé le vecteur
      expect(a1[0]?.has_fts).toBe(true);
      const fts = yield* search_researchers_fts(sql, "2020-01", "r1", "neural");
      expect(fts.map((h) => h.researcher_id)).toEqual(["A1"]);

      // Idempotence : un second migrate n'applique rien.
      const again = yield* migrate(sql, migs);
      expect(again).toEqual([]);

      yield* close(sql);
    });
    await Effect.runPromise(program);
  }, 120_000);
});
