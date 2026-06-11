import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Config, Effect } from "effect";
import type { ConfigError } from "effect/ConfigError";
import postgres from "postgres";

import { PostgresError } from "../errors.js";

type Sql = postgres.Sql;

/**
 * Accès à l'index PostgreSQL/pgvector (étape 4.1).
 *
 * L'index est DÉRIVÉ du mart servi (jamais l'autorité du contrat) ; ce module fournit
 * l'accès Effect (connexion, exécution, migrations). Il suit le patron du module DuckDB
 * (`../db/index.js`) : des fonctions enveloppées dans `Effect.tryPromise`, la connexion
 * passée en argument (pas d'état global), une erreur `PostgresError` typée.
 *
 * Les identifiants ne sont JAMAIS en clair : `dsn_from_env` construit la chaîne de
 * connexion depuis l'environnement (mêmes variables que le contrat cluster : POSTGRES_*,
 * issues du Secret `pg-role-pgvector`).
 */

/** Construit la DSN PostgreSQL depuis l'environnement (Secret cluster, pas de secret en dur). */
const dsn_from_env = (): Effect.Effect<string, ConfigError, never> =>
  Effect.gen(function* () {
    const host = yield* Config.string("POSTGRES_HOST");
    const port = yield* Config.string("POSTGRES_PORT");
    const db = yield* Config.string("POSTGRES_DB");
    const user = yield* Config.string("POSTGRES_USER");
    const password = yield* Config.string("POSTGRES_PASSWORD");
    return `postgres://${user}:${password}@${host}:${port}/${db}`;
  });

/** Ouvre une connexion postgres (porsager). `sql.end()` (cf. `close`) la libère. */
const connect = (dsn: string): Effect.Effect<Sql, PostgresError, never> =>
  Effect.try({
    try: () => postgres(dsn, { onnotice: () => {} }),
    catch: (cause: unknown) =>
      new PostgresError(`Impossible d'ouvrir la connexion PostgreSQL`, {
        cause,
      }),
  });

/** Exécute une requête SQL brute (DDL/DML) sur la connexion. */
const run = (
  sql: Sql,
  query: string,
): Effect.Effect<void, PostgresError, never> =>
  Effect.tryPromise({
    try: async () => {
      await sql.unsafe(query);
    },
    catch: (cause: unknown) =>
      new PostgresError(`Impossible d'exécuter la requête PostgreSQL`, {
        cause,
      }),
  });

/** Ferme la connexion (libère le pool). */
const close = (sql: Sql): Effect.Effect<void, PostgresError, never> =>
  Effect.tryPromise({
    try: () => sql.end(),
    catch: (cause: unknown) =>
      new PostgresError(`Impossible de fermer la connexion PostgreSQL`, {
        cause,
      }),
  });

const _MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "migrations",
);

/** Lit les migrations `NNNN_*.sql` du dossier, triées par nom (ordre d'application). */
const read_migrations = (
  dir: string = _MIGRATIONS_DIR,
): Effect.Effect<{ name: string; sql: string }[], PostgresError, never> =>
  Effect.try({
    try: () =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") })),
    catch: (cause: unknown) =>
      new PostgresError(`Impossible de lire les migrations (${dir})`, {
        cause,
      }),
  });

/**
 * Applique les migrations non encore appliquées, dans l'ordre, en suivant l'état dans une
 * table `schema_migrations`. Idempotent : une migration déjà appliquée est ignorée.
 */
const migrate = (
  sql: Sql,
  migrations: { name: string; sql: string }[],
): Effect.Effect<string[], PostgresError, never> =>
  Effect.gen(function* () {
    yield* run(
      sql,
      "CREATE TABLE IF NOT EXISTS schema_migrations (" +
        "name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const applied = yield* Effect.tryPromise({
      try: () => sql<{ name: string }[]>`SELECT name FROM schema_migrations`,
      catch: (cause: unknown) =>
        new PostgresError(`Impossible de lire schema_migrations`, { cause }),
    });
    const done = new Set(applied.map((r) => r.name));
    const newlyApplied: string[] = [];
    for (const migration of migrations) {
      if (done.has(migration.name)) continue;
      yield* run(sql, migration.sql);
      yield* Effect.tryPromise({
        try: () =>
          sql`INSERT INTO schema_migrations (name) VALUES (${migration.name})`,
        catch: (cause: unknown) =>
          new PostgresError(
            `Impossible d'enregistrer la migration ${migration.name}`,
            {
              cause,
            },
          ),
      });
      newlyApplied.push(migration.name);
    }
    return newlyApplied;
  });

export { dsn_from_env, connect, run, close, read_migrations, migrate };
