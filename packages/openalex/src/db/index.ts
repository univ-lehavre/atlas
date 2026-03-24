import duckdb from "@duckdb/node-api";
import { Effect } from "effect";
import { DuckDBError } from "../errors.js";

const create_instance = (
  path: string,
): Effect.Effect<duckdb.DuckDBInstance, DuckDBError, never> =>
  Effect.tryPromise({
    try: () => duckdb.DuckDBInstance.create(path),
    catch: (cause: unknown) =>
      new DuckDBError(
        `Impossible d'ouvrir la base de données DuckDB : ${path}`,
        { cause },
      ),
  });

const connect_to_instance = (
  db: duckdb.DuckDBInstance,
): Effect.Effect<duckdb.DuckDBConnection, DuckDBError, never> =>
  Effect.tryPromise({
    try: () => db.connect(),
    catch: (cause: unknown) =>
      new DuckDBError(`Impossible de se connecter à la base de données`, {
        cause,
      }),
  });

const run = (
  connection: duckdb.DuckDBConnection,
  query: string,
): Effect.Effect<void, DuckDBError, never> =>
  Effect.tryPromise({
    try: () => connection.run(query),
    catch: (cause: unknown) =>
      new DuckDBError(`Impossible d’exécuter la requête`, { cause }),
  });

export { create_instance, run, connect_to_instance };
