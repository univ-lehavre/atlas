import { Effect, Layer } from "effect";
import postgres from "postgres";

import { CacheError } from "./errors.js";
import { CacheStore } from "./store.js";
import type { CacheEntry } from "./store.js";

/**
 * Back-end **Postgres** du cache (ADR 0083 ; infra CNPG fournie par le cluster,
 * ADR cluster 0093). Table clé-valeur horodatée, UPSERT atomique
 * (`INSERT … ON CONFLICT DO UPDATE`), DDL idempotente protégée par
 * `pg_advisory_xact_lock` (pas de course multi-pod au démarrage).
 *
 * La connexion est ouverte/fermée dans le scope du `Layer`. Le SQL utilise les
 * templates de `postgres.js` (paramétrés, jamais d'interpolation de chaîne).
 */

type Sql = postgres.Sql;

/** Identifiant constant du verrou d'advisory pour la création de table (clé arbitraire stable). */
const _DDL_LOCK_ID = 4_823_641_077;

const TABLE = "flux_cache";

/**
 * Compose la DSN depuis l'environnement (`POSTGRES_CACHE_*`, Secret `pg-role-cache`
 * du cluster). `HOST` = nom court `pg-rw.postgres`, jamais le FQDN (timeout prod,
 * ADR cluster 0093). Aucun secret en dur.
 */
export const dsnFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): string | null => {
  const host = env["POSTGRES_CACHE_HOST"];
  const port = env["POSTGRES_CACHE_PORT"];
  const db = env["POSTGRES_CACHE_DB"];
  const user = env["POSTGRES_CACHE_USER"];
  const password = env["POSTGRES_CACHE_PASSWORD"];
  if (!host || !port || !db || !user || !password) return null;
  return `postgres://${user}:${password}@${host}:${port}/${db}`;
};

/** Mappe toute erreur du driver en `CacheError` typée (jamais une fuite brute). */
const cacheError =
  (message: string) =>
  (cause: unknown): CacheError =>
    new CacheError({ message, cause });

const connect = (dsn: string): Effect.Effect<Sql, CacheError> =>
  Effect.try({
    try: () => postgres(dsn, { onnotice: () => {} }),
    catch: cacheError("connect failed"),
  });

const close = (sql: Sql): Effect.Effect<void> =>
  Effect.promise(() => sql.end());

/** Crée la table si absente, sous advisory lock transactionnel (idempotent, sans course). */
const ensureTable = (sql: Sql): Effect.Effect<void, CacheError> =>
  Effect.tryPromise({
    try: () =>
      sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${_DDL_LOCK_ID})`;
        await tx`
          CREATE TABLE IF NOT EXISTS ${tx(TABLE)} (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `;
      }),
    catch: cacheError("ensure table failed"),
  });

const makePgStore = (sql: Sql): CacheStore => ({
  get: <T>(key: string) =>
    Effect.tryPromise({
      try: () =>
        sql<{ value: T; saved_at: Date }[]>`
          SELECT value, saved_at FROM ${sql(TABLE)} WHERE key = ${key}
        `,
      catch: cacheError("read failed"),
    }).pipe(
      Effect.map((rows) => {
        const row = rows[0];
        if (row === undefined) return null;
        const entry: CacheEntry<T> = {
          savedAt: row.saved_at.getTime(),
          data: row.value,
        };
        return entry;
      }),
    ),

  set: <T>(key: string, data: T) =>
    Effect.tryPromise({
      try: async () => {
        await sql`
          INSERT INTO ${sql(TABLE)} (key, value, saved_at)
          VALUES (${key}, ${sql.json(data as postgres.JSONValue)}, now())
          ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, saved_at = EXCLUDED.saved_at
        `;
      },
      catch: cacheError("write failed"),
    }),
});

/**
 * Layer du back-end Postgres : ouvre la connexion, crée la table au démarrage du
 * scope, et la ferme à la fin (acquire/release). `dsn` composée par `dsnFromEnv`.
 */
export const PostgresCacheLayer = (
  dsn: string,
): Layer.Layer<CacheStore, CacheError> =>
  Layer.scoped(
    CacheStore,
    Effect.gen(function* () {
      const sql = yield* Effect.acquireRelease(connect(dsn), (s) => close(s));
      yield* ensureTable(sql);
      return makePgStore(sql);
    }),
  );
