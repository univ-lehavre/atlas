import { describe, it, expect } from "@effect/vitest";
import { Effect, Exit } from "effect";

import { load_researcher_vectors, search_researchers_knn } from "./vectors.js";

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

const vec = (first: number): Float32Array => {
  const a = new Float32Array(384);
  a[0] = first;
  return a;
};

describe("load_researcher_vectors", () => {
  it.effect(
    "upsert chaque vecteur (sérialisé pgvector) et renvoie le nombre",
    () =>
      Effect.gen(function* () {
        const { sql, calls } = makeFakeSql();
        const n = yield* load_researcher_vectors(
          sql as never,
          "2020-01",
          "r1",
          [
            { researcherId: "A1", vector: vec(1) },
            { researcherId: "A2", vector: vec(0.2) },
          ],
        );
        expect(n).toBe(2);
        expect(calls).toHaveLength(2);
        expect(calls[0]?.text).toContain("INSERT INTO researchers");
        expect(calls[0]?.text).toContain("ON CONFLICT");
        expect(calls[0]?.text).toContain("::vector");
        // researcherId, literal pgvector, dt, run.
        const [id, literal, dt, run] = calls[0]?.values ?? [];
        expect(id).toBe("A1");
        expect(typeof literal).toBe("string");
        expect(literal as string).toMatch(/^\[1,0,0,/); // [f1,f2,…]
        expect(dt).toBe("2020-01");
        expect(run).toBe("r1");
      }),
  );

  it.effect("accepte aussi un vecteur en number[]", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql();
      const n = yield* load_researcher_vectors(sql as never, "d", "r", [
        { researcherId: "A", vector: new Array(384).fill(0) },
      ]);
      expect(n).toBe(1);
    }),
  );

  it.effect("rejette un vecteur de mauvaise dimension (≠ 384)", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql();
      const exit = yield* Effect.exit(
        load_researcher_vectors(sql as never, "d", "r", [
          { researcherId: "A", vector: [1, 2, 3] },
        ]),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain("dimension 3");
      }
      // Aucune requête émise : on échoue avant l'upsert.
      expect(calls).toHaveLength(0);
    }),
  );

  it.effect("échoue en PostgresError si l'upsert lève", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ throws: true });
      const exit = yield* Effect.exit(
        load_researcher_vectors(sql as never, "d", "r", [
          { researcherId: "A", vector: vec(1) },
        ]),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain(
          "Impossible de charger les vecteurs",
        );
      }
    }),
  );
});

describe("search_researchers_knn", () => {
  it.effect("renvoie les voisins par distance cosinus croissante", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql({
        rows: [{ researcher_id: "A1", distance: 0 }],
      });
      const hits = yield* search_researchers_knn(
        sql as never,
        "2020-01",
        "r1",
        vec(1),
      );
      expect(hits).toEqual([{ researcher_id: "A1", distance: 0 }]);
      expect(calls[0]?.text).toContain("<=>");
      expect(calls[0]?.text).toContain("ORDER BY");
    }),
  );

  it.effect("rejette un vecteur de requête de mauvaise dimension", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql();
      const exit = yield* Effect.exit(
        search_researchers_knn(sql as never, "d", "r", [1, 2]),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(calls).toHaveLength(0);
    }),
  );

  it.effect("échoue en PostgresError si la requête lève", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ throws: true });
      const exit = yield* Effect.exit(
        search_researchers_knn(sql as never, "d", "r", vec(1)),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});
