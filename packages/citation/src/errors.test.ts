import { describe, expect, it } from "vitest";
import {
  CommandLineError,
  DuckDBError,
  FetchError,
  ParametersError,
  PromptError,
  StatusError,
} from "./errors.js";

type ErrorCtor = new (
  msg: string,
  opts?: { cause?: unknown },
) => {
  message: string;
  name: string;
  cause?: unknown;
};

const assertError = (cls: ErrorCtor, expectedName: string) => {
  it("sets message and name", () => {
    const err = new cls("oops");
    expect(err.message).toBe("oops");
    expect(err.name).toBe(expectedName);
  });

  it("sets cause when provided", () => {
    const cause = new Error("root");
    const err = new cls("oops", { cause });
    expect(err.cause).toBe(cause);
  });

  it("does not set cause when omitted", () => {
    const err = new cls("oops");
    expect(err.cause).toBeUndefined();
  });
};

describe("DuckDBError", () => {
  assertError(DuckDBError as unknown as ErrorCtor, "DuckDBError");
});

describe("FetchError", () => {
  assertError(FetchError as unknown as ErrorCtor, "FetchError");
});

describe("StatusError", () => {
  assertError(StatusError as unknown as ErrorCtor, "StatusError");
});

describe("CommandLineError", () => {
  assertError(CommandLineError as unknown as ErrorCtor, "CommandLineError");
});

describe("PromptError", () => {
  assertError(PromptError as unknown as ErrorCtor, "PromptError");
});

describe("ParametersError", () => {
  assertError(ParametersError as unknown as ErrorCtor, "ParametersError");
});
