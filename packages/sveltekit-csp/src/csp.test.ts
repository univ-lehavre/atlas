import { describe, expect, it } from "vitest";
import {
  defaultCspDirectives,
  serialiseCsp,
  type CspDirectives,
} from "./csp.js";

describe("defaultCspDirectives", () => {
  it("returns the conservative defaults shared by every app when no extra is passed", () => {
    const directives = defaultCspDirectives();
    expect(directives).toEqual({
      "default-src": ["self"],
      "script-src": ["self"],
      "style-src": ["self", "unsafe-inline"],
      "img-src": ["self", "data:", "blob:"],
      "font-src": ["self"],
      "connect-src": ["self"],
      "frame-ancestors": ["none"],
      "form-action": ["self"],
      "base-uri": ["self"],
      "object-src": ["none"],
    });
  });

  it("keeps style-src 'unsafe-inline' so Svelte and Bootstrap inline styles still render (ADR 0019)", () => {
    const { "style-src": styleSrc } = defaultCspDirectives();
    expect(styleSrc).toContain("unsafe-inline");
  });

  it("appends extra sources to an existing directive without losing the defaults", () => {
    const directives = defaultCspDirectives({
      "connect-src": ["https://baas.example.org"],
    });
    expect(directives["connect-src"]).toEqual([
      "self",
      "https://baas.example.org",
    ]);
    // Other defaults left untouched.
    expect(directives["default-src"]).toEqual(["self"]);
  });

  it("dedups when an extra source repeats a default", () => {
    const directives = defaultCspDirectives({
      "img-src": ["self", "https://images.example.org"],
    });
    expect(directives["img-src"]).toEqual([
      "self",
      "data:",
      "blob:",
      "https://images.example.org",
    ]);
  });

  it("introduces extra sources on a directive that the defaults already cover", () => {
    const directives = defaultCspDirectives({
      "script-src": ["https://cdn.example.org"],
    } as Partial<CspDirectives>);
    expect(directives["script-src"]).toEqual([
      "self",
      "https://cdn.example.org",
    ]);
  });

  it("returns a fresh object on each call (no shared mutable state across apps)", () => {
    const first = defaultCspDirectives();
    const second = defaultCspDirectives({ "img-src": ["https://x.test"] });
    expect(first["img-src"]).toEqual(["self", "data:", "blob:"]);
    expect(second["img-src"]).toEqual([
      "self",
      "data:",
      "blob:",
      "https://x.test",
    ]);
    // Mutating the first result must not leak into the next call.
    first["img-src"]?.push("mutated");
    const third = defaultCspDirectives();
    expect(third["img-src"]).toEqual(["self", "data:", "blob:"]);
  });
});

describe("serialiseCsp", () => {
  it("serialises directives in the Content-Security-Policy header format", () => {
    const value = serialiseCsp({
      "default-src": ["self"],
      "object-src": ["none"],
    });
    expect(value).toBe("default-src 'self'; object-src 'none'");
  });

  it("quotes CSP keywords (self, none, unsafe-inline…) automatically", () => {
    const value = serialiseCsp({
      "style-src": ["self", "unsafe-inline", "https://fonts.example.org"],
    });
    expect(value).toBe(
      "style-src 'self' 'unsafe-inline' https://fonts.example.org",
    );
  });

  it("quotes nonces and hashes per CSP grammar", () => {
    const value = serialiseCsp({
      "script-src": ["self", "nonce-abc123", "sha256-xyz"],
    });
    expect(value).toBe("script-src 'self' 'nonce-abc123' 'sha256-xyz'");
  });

  it("skips empty directives so they don't pollute the header", () => {
    const value = serialiseCsp({
      "default-src": ["self"],
      "script-src": [],
    });
    expect(value).toBe("default-src 'self'");
  });

  it("round-trips the curated defaults into a parseable header", () => {
    const value = serialiseCsp(defaultCspDirectives());
    expect(value).toContain("default-src 'self'");
    expect(value).toContain("style-src 'self' 'unsafe-inline'");
    expect(value).toContain("frame-ancestors 'none'");
    expect(value).toContain("object-src 'none'");
  });
});
