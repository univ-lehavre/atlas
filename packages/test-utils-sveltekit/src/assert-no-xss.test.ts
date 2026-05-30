import { describe, it, expect } from "vitest";
import { assertNoXss, xssPayloads } from "./assert-no-xss.js";

describe("assertNoXss", () => {
  it("resolves when the response body does not contain the payload", async () => {
    const res = Response.json({ ok: true });
    await expect(
      assertNoXss(res, '<script>alert("xss")</script>'),
    ).resolves.toBeUndefined();
  });

  it("throws when the body reflects the payload verbatim", async () => {
    const payload = '<script>alert("xss")</script>';
    const res = new Response(`hello ${payload} world`);
    await expect(assertNoXss(res, payload)).rejects.toThrow(
      /reflects XSS payload verbatim/,
    );
  });

  it("clones the response so the original body can still be read", async () => {
    const res = new Response("safe");
    await assertNoXss(res, '<script>alert("xss")</script>');
    await expect(res.text()).resolves.toBe("safe");
  });
});

describe("xssPayloads", () => {
  it("returns a non-empty list", () => {
    const list = xssPayloads();
    expect(list.length).toBeGreaterThan(0);
  });

  it("includes the classic <script> payload", () => {
    expect(xssPayloads()).toContain('<script>alert("xss")</script>');
  });

  it("returns a list of unique payloads", () => {
    const list = xssPayloads();
    expect(new Set(list).size).toBe(list.length);
  });
});
