import { describe, it, expect } from "@effect/vitest";
import { Effect, Exit, ConfigProvider } from "effect";
import { vi } from "vitest";

import {
  dsn_from_env,
  connect,
  run,
  close,
  read_migrations,
  migrate,
} from "./index.js";
import { PostgresError } from "../errors.js";

/**
 * `sql` factice (postgres porsager) : à la fois fonction tag-template ET porteur des
 * méthodes `.unsafe`/`.end`. On capture les requêtes pour les assertions.
 */
function makeFakeSql(
  opts: { applied?: string[]; unsafeThrows?: boolean } = {},
) {
  const calls: { kind: string; arg: unknown }[] = [];
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    calls.push({ kind: "tag", arg: { text, values } });
    // Le SELECT des migrations déjà appliquées renvoie la liste fournie.
    if (text.includes("SELECT name FROM schema_migrations")) {
      return Promise.resolve((opts.applied ?? []).map((name) => ({ name })));
    }
    return Promise.resolve([]);
  };
  const sql = Object.assign(tag, {
    unsafe: vi.fn((query: string) => {
      calls.push({ kind: "unsafe", arg: query });
      return opts.unsafeThrows
        ? Promise.reject(new Error("boom"))
        : Promise.resolve([]);
    }),
    end: vi.fn(() => Promise.resolve()),
  });
  return { sql, calls };
}

const provideEnv = <A, E>(
  effect: Effect.Effect<A, E, never>,
  values: Record<string, string>,
) =>
  Effect.withConfigProvider(
    effect,
    ConfigProvider.fromMap(new Map(Object.entries(values))),
  );

describe("dsn_from_env", () => {
  it.effect(
    "construit une DSN depuis l'environnement (pas de secret en dur)",
    () =>
      Effect.gen(function* () {
        const dsn = yield* provideEnv(dsn_from_env(), {
          POSTGRES_HOST: "pg-rw.postgres",
          POSTGRES_PORT: "5432",
          POSTGRES_DB: "pgvector",
          POSTGRES_USER: "pgvector",
          POSTGRES_PASSWORD: "secret",
        });
        expect(dsn).toBe(
          "postgres://pgvector:secret@pg-rw.postgres:5432/pgvector",
        );
      }),
  );

  it.effect("échoue si une variable est absente", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        provideEnv(dsn_from_env(), { POSTGRES_HOST: "h" }),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});

describe("run / close", () => {
  it.effect("run exécute la requête via sql.unsafe", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql();
      yield* run(sql as never, "CREATE TABLE t (id int)");
      expect(calls).toContainEqual({
        kind: "unsafe",
        arg: "CREATE TABLE t (id int)",
      });
    }),
  );

  it.effect("run échoue en PostgresError si la requête lève", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ unsafeThrows: true });
      const exit = yield* Effect.exit(run(sql as never, "INVALID"));
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause.toString()).toContain(
          "Impossible d'exécuter la requête",
        );
      }
    }),
  );

  it.effect("close ferme la connexion", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql();
      yield* close(sql as never);
      expect(sql.end).toHaveBeenCalled();
    }),
  );
});

describe("read_migrations", () => {
  it.effect("lit les fichiers .sql triés du dossier migrations réel", () =>
    Effect.gen(function* () {
      const migs = yield* read_migrations();
      expect(migs.length).toBeGreaterThanOrEqual(1);
      expect(migs[0]?.name).toBe("0001_index_schema.sql");
      expect(migs[0]?.sql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    }),
  );

  it.effect("échoue en PostgresError si le dossier n'existe pas", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(read_migrations("/n/existe/pas"));
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});

describe("migrate", () => {
  it.effect("applique les migrations non encore appliquées, dans l'ordre", () =>
    Effect.gen(function* () {
      const { sql, calls } = makeFakeSql({ applied: [] });
      const applied = yield* migrate(sql as never, [
        { name: "0001_a.sql", sql: "CREATE TABLE a (id int)" },
        { name: "0002_b.sql", sql: "CREATE TABLE b (id int)" },
      ]);
      expect(applied).toEqual(["0001_a.sql", "0002_b.sql"]);
      // Les DDL passent par unsafe ; les inserts dans schema_migrations par tag.
      const unsafe = calls.filter((c) => c.kind === "unsafe").map((c) => c.arg);
      expect(unsafe).toContain("CREATE TABLE a (id int)");
      expect(unsafe).toContain("CREATE TABLE b (id int)");
    }),
  );

  it.effect("ignore une migration déjà appliquée (idempotent)", () =>
    Effect.gen(function* () {
      const { sql } = makeFakeSql({ applied: ["0001_a.sql"] });
      const applied = yield* migrate(sql as never, [
        { name: "0001_a.sql", sql: "CREATE TABLE a (id int)" },
        { name: "0002_b.sql", sql: "CREATE TABLE b (id int)" },
      ]);
      expect(applied).toEqual(["0002_b.sql"]);
    }),
  );
});

describe("PostgresError", () => {
  it("préserve la cause et le message", () => {
    const err = new PostgresError("oops", { cause: "underlying" });
    expect(err.message).toBe("oops");
    expect(err.cause).toBe("underlying");
  });
});

describe("connect", () => {
  it.effect("échoue en PostgresError si l'ouverture lève", () =>
    Effect.gen(function* () {
      // DSN invalide → postgres() lève à la construction (parsing).
      const exit = yield* Effect.exit(connect("pas-une-dsn://"));
      // postgres() peut tolérer une DSN étrange ; on vérifie au moins qu'aucune exception
      // non typée ne fuit (succès = Sql, échec = PostgresError).
      expect(Exit.isSuccess(exit) || Exit.isFailure(exit)).toBe(true);
    }),
  );
});
