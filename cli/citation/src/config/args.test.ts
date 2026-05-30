import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect, Exit } from "effect";

vi.mock("yargs", () => ({
  default: vi.fn(),
}));
vi.mock("yargs/helpers", () => ({
  hideBin: vi.fn((argv: string[]) => argv.slice(2)),
}));

import yargs from "yargs";
import { cmd } from "./args.js";

describe("config/args cmd()", () => {
  let originalArgv: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it("returns the parsed --name argument when provided", async () => {
    const parse = vi.fn().mockResolvedValue({ name: "Marie Curie" });
    vi.mocked(yargs).mockReturnValue({ parse } as never);

    const result = await Effect.runPromise(cmd());

    expect(result).toEqual({ name: "Marie Curie" });
    expect(yargs).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it("returns name: undefined when --name absent", async () => {
    const parse = vi.fn().mockResolvedValue({});
    vi.mocked(yargs).mockReturnValue({ parse } as never);

    const result = await Effect.runPromise(cmd());

    expect(result).toEqual({ name: undefined });
  });

  it("wraps a yargs failure in a CommandLineError", async () => {
    const parse = vi.fn().mockRejectedValue(new Error("yargs boom"));
    vi.mocked(yargs).mockReturnValue({ parse } as never);

    const exit = await Effect.runPromiseExit(cmd());

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const cause = exit.cause;
      const str = JSON.stringify(cause);
      expect(str).toContain("CommandLineError");
    }
  });
});
