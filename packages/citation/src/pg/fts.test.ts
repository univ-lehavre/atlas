import { describe, it, expect } from "@effect/vitest";
import { Effect, Exit } from "effect";

import { load_researcher_fts, search_researchers_fts } from "./fts.js";

/**
 * `sql` factice : fonction tag-template capturant les requêtes et renvoyant un résultat
 * paramétrable. Permet de couvrir le loader/search sans Postgres réel (le round-trip
 * to_tsvector / @@ est prouvé par le test d'intégration épinglé).
 */
function makeFakeSql(opts: { rows?: unknown[]; throws?: boolean } = {}) {
  const calls: { text: string; values: unknown[] }[] = [];
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("?"), values });
    return opts.throws
      ? Promise.reject(new Error("boom"))
      : Promise.resolve(opts.rows ?? []);
  };
  return { sql: tag, calls };
}

describe("load_researcher_fts", () => {
  it.effect("upsert chaque document et renvoie le nombre chargé", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql();
      const n = yield* load_researcher_fts(sql as never, "2020-01", "r1", [
        { researcherId: "A1", text: "machine learning" },
        { researcherId: "A2", text: "climate" },
      ]);
      expect(n).toBe(2);
      // Deux INSERT ... ON CONFLICT, avec to_tsvector et les bonnes valeurs.
      expect(calls).toHaveLength(2);
      expect(calls[0]?.text).toContain("INSERT INTO researchers");
      expect(calls[0]?.text).toContain("ON CONFLICT");
      expect(calls[0]?.text).toContain("to_tsvector");
      // Tout est paramétré : id, config FTS, texte, dt, run (config `simple`).
      expect(calls[0]?.values).toEqual([
        "A1",
        "simple",
        "machine learning",
        "2020-01",
        "r1",
      ]);
    }),
  );

  it.effect("ne fait aucune requête pour une liste vide", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql();
      const n = yield* load_researcher_fts(sql as never, "2020-01", "r1", []);
      expect(n).toBe(0);
      expect(calls).toHaveLength(0);
    }),
  );

  it.effect("échoue en PostgresError si l'upsert lève", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ throws: true });
      const exit = yield* Effect.exit(
        load_researcher_fts(sql as never, "2020-01", "r1", [
          { researcherId: "A1", text: "x" },
        ]),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("Impossible de charger le FTS");
      }
    }),
  );
});

describe("search_researchers_fts", () => {
  it.effect("renvoie les chercheurs matchant la requête, par pertinence", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql({
        rows: [{ researcher_id: "A1", rank: 0.3 }],
      });
      const hits = yield* search_researchers_fts(
        sql as never,
        "2020-01",
        "r1",
        "neural",
      );
      expect(hits).toEqual([{ researcher_id: "A1", rank: 0.3 }]);
      expect(calls[0]?.text).toContain("fts @@ to_tsquery");
      expect(calls[0]?.text).toContain("ts_rank");
      // config, query (ts_rank), dt, run, config, query (@@), limit (défaut 20).
      expect(calls[0]?.values).toEqual([
        "simple",
        "neural",
        "2020-01",
        "r1",
        "simple",
        "neural",
        20,
      ]);
    }),
  );

  it.effect("échoue en PostgresError si la requête lève", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ throws: true });
      const exit = yield* Effect.exit(
        search_researchers_fts(sql as never, "2020-01", "r1", "x"),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
