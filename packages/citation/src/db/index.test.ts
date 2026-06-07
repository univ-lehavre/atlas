import { describe, it, expect } from "@effect/vitest";
import { vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";
import type duckdb from "@duckdb/node-api";

const refs = vi.hoisted(() => ({
  create: vi.fn(),
}));

// `@duckdb/node-api` is a native binding with a single module-level factory
// (DuckDBInstance.create). It has no production consumer to inject a service
// into, and connect/run already take their dependency as an argument, so we
// keep the module mock here and only adopt the it.effect convention (E14,
// ADR 0049) for the Effect-executing assertions.
vi.mock("@duckdb/node-api", () => ({
  default: {
    DuckDBInstance: { create: refs.create },
  },
}));

import { create_instance, connect_to_instance, run } from "./index.js";
import { DuckDBError } from "../errors.js";

type FakeInstance = Pick<duckdb.DuckDBInstance, "connect">;
type FakeConnection = Pick<duckdb.DuckDBConnection, "run">;

beforeEach(() => {
  refs.create.mockReset();
});

describe("create_instance", () => {
  it.effect("returns the DuckDB instance on success", () =>
    Effect.gen(function* () {
      const fakeInstance = { id: "instance" };
      refs.create.mockResolvedValue(fakeInstance);

      const result = yield* create_instance("/tmp/test.duckdb");
      expect(result).toBe(fakeInstance);
      expect(refs.create).toHaveBeenCalledWith("/tmp/test.duckdb");
    }),
  );

  it.effect("fails with a DuckDBError when DuckDBInstance.create rejects", () =>
    Effect.gen(function* () {
      refs.create.mockRejectedValue(new Error("disk full"));

      const exit = yield* Effect.exit(create_instance("/tmp/test.duckdb"));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = exit.cause.toString();
        expect(error).toContain(
          "Impossible d'ouvrir la base de données DuckDB",
        );
      }
    }),
  );
});

describe("connect_to_instance", () => {
  it.effect("returns the connection on success", () =>
    Effect.gen(function* () {
      const connection = { id: "conn" };
      const db: FakeInstance = {
        connect: vi.fn().mockResolvedValue(connection),
      };

      const result = yield* connect_to_instance(db as duckdb.DuckDBInstance);
      expect(result).toBe(connection);
      expect(db.connect).toHaveBeenCalled();
    }),
  );

  it.effect("fails with a DuckDBError when connect rejects", () =>
    Effect.gen(function* () {
      const db: FakeInstance = {
        connect: vi.fn().mockRejectedValue(new Error("conn error")),
      };

      const exit = yield* Effect.exit(
        connect_to_instance(db as duckdb.DuckDBInstance),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});

describe("run", () => {
  it.effect("resolves when the query succeeds", () =>
    Effect.gen(function* () {
      const connection: FakeConnection = {
        run: vi.fn().mockResolvedValue(undefined),
      };

      yield* run(connection as duckdb.DuckDBConnection, "SELECT 1");
      expect(connection.run).toHaveBeenCalledWith("SELECT 1");
    }),
  );

  it.effect("fails with a DuckDBError when run rejects", () =>
    Effect.gen(function* () {
      const connection: FakeConnection = {
        run: vi.fn().mockRejectedValue(new Error("syntax")),
      };

      const exit = yield* Effect.exit(
        run(connection as duckdb.DuckDBConnection, "INVALID"),
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }),
  );
});

describe("DuckDBError", () => {
  it("preserves the cause and message", () => {
    const error = new DuckDBError("oops", { cause: "underlying" });
    expect(error.message).toBe("oops");
    expect(error.cause).toBe("underlying");
  });
});
