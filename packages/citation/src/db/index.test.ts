import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";
import type duckdb from "@duckdb/node-api";

const refs = vi.hoisted(() => ({
  create: vi.fn(),
}));

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
  it("returns the DuckDB instance on success", async () => {
    const fakeInstance = { id: "instance" };
    refs.create.mockResolvedValue(fakeInstance);

    const result = await Effect.runPromise(create_instance("/tmp/test.duckdb"));
    expect(result).toBe(fakeInstance);
    expect(refs.create).toHaveBeenCalledWith("/tmp/test.duckdb");
  });

  it("fails with a DuckDBError when DuckDBInstance.create rejects", async () => {
    refs.create.mockRejectedValue(new Error("disk full"));

    const exit = await Effect.runPromiseExit(
      create_instance("/tmp/test.duckdb"),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = exit.cause.toString();
      expect(error).toContain("Impossible d'ouvrir la base de données DuckDB");
    }
  });
});

describe("connect_to_instance", () => {
  it("returns the connection on success", async () => {
    const connection = { id: "conn" };
    const db: FakeInstance = {
      connect: vi.fn().mockResolvedValue(connection),
    };

    const result = await Effect.runPromise(
      connect_to_instance(db as duckdb.DuckDBInstance),
    );
    expect(result).toBe(connection);
    expect(db.connect).toHaveBeenCalled();
  });

  it("fails with a DuckDBError when connect rejects", async () => {
    const db: FakeInstance = {
      connect: vi.fn().mockRejectedValue(new Error("conn error")),
    };

    const exit = await Effect.runPromiseExit(
      connect_to_instance(db as duckdb.DuckDBInstance),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("run", () => {
  it("resolves when the query succeeds", async () => {
    const connection: FakeConnection = {
      run: vi.fn().mockResolvedValue(undefined),
    };

    await Effect.runPromise(
      run(connection as duckdb.DuckDBConnection, "SELECT 1"),
    );
    expect(connection.run).toHaveBeenCalledWith("SELECT 1");
  });

  it("fails with a DuckDBError when run rejects", async () => {
    const connection: FakeConnection = {
      run: vi.fn().mockRejectedValue(new Error("syntax")),
    };

    const exit = await Effect.runPromiseExit(
      run(connection as duckdb.DuckDBConnection, "INVALID"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("DuckDBError", () => {
  it("preserves the cause and message", () => {
    const error = new DuckDBError("oops", { cause: "underlying" });
    expect(error.message).toBe("oops");
    expect(error.cause).toBe("underlying");
  });
});
