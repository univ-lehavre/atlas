import { describe, it, expect } from "vitest";
import { parseArgs, requireValue } from "./args.js";

describe("parseArgs", () => {
  it("returns defaults when no argv is provided", () => {
    const opts = parseArgs([]);
    expect(opts).toEqual({
      token: null,
      period: null,
      force: false,
      json: false,
      help: false,
    });
  });

  it("parses --token and trims its value", () => {
    const opts = parseArgs(["--token", "  ghp_abc  "]);
    expect(opts.token).toBe("ghp_abc");
  });

  it("throws when --token has no value", () => {
    expect(() => parseArgs(["--token"])).toThrow(
      /Argument manquant pour --token/,
    );
  });

  it("parses --period for each accepted value", () => {
    for (const p of ["day", "week", "month", "quarter"] as const) {
      expect(parseArgs(["--period", p]).period).toBe(p);
    }
  });

  it("throws when --period has no value", () => {
    expect(() => parseArgs(["--period"])).toThrow(
      /Argument manquant pour --period/,
    );
  });

  it("throws when --period value is invalid", () => {
    expect(() => parseArgs(["--period", "century"])).toThrow(
      /Période invalide: century/,
    );
  });

  it("flips --force and --json", () => {
    const opts = parseArgs(["--force", "--json"]);
    expect(opts.force).toBe(true);
    expect(opts.json).toBe(true);
  });

  it("recognises --help and -h", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("throws on unknown options", () => {
    expect(() => parseArgs(["--unknown"])).toThrow(
      /Option inconnue: --unknown/,
    );
  });

  it("combines several flags in one call", () => {
    const opts = parseArgs([
      "--token",
      "t",
      "--period",
      "month",
      "--force",
      "--json",
    ]);
    expect(opts).toEqual({
      token: "t",
      period: "month",
      force: true,
      json: true,
      help: false,
    });
  });
});

describe("requireValue", () => {
  it("returns the value when not null/undefined", () => {
    expect(requireValue("ok", "msg")).toBe("ok");
    expect(requireValue(0, "msg")).toBe(0);
    expect(requireValue(false, "msg")).toBe(false);
  });

  it("throws the given message when value is null", () => {
    expect(() => requireValue(null, "boom")).toThrow(/boom/);
  });

  it("throws when value is undefined", () => {
    expect(() => requireValue(undefined, "boom")).toThrow(/boom/);
  });
});
