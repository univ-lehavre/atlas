import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printHuman, summarizeStatus, type ProjectResult } from "./report.js";

const result = (overrides: Partial<ProjectResult> = {}): ProjectResult => ({
  projectId: 1,
  status: 200,
  statusText: "OK",
  ok: true,
  bodyPreview: "",
  error: null,
  ...overrides,
});

describe("summarizeStatus", () => {
  it("returns an empty object for no results", () => {
    expect(summarizeStatus([])).toEqual({});
  });

  it("counts numeric statuses and ERR for null statuses", () => {
    const summary = summarizeStatus([
      result({ projectId: 1, status: 200 }),
      result({ projectId: 2, status: 200 }),
      result({ projectId: 3, status: 403 }),
      result({ projectId: 4, status: null, ok: false, error: "ETIMEDOUT" }),
    ]);
    expect(summary).toEqual({ "200": 2, "403": 1, ERR: 1 });
  });
});

describe("printHuman", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLog.mockRestore();
  });

  const lines = () =>
    consoleLog.mock.calls.map((c: unknown[]) => String(c[0] ?? ""));

  it("prints one HTTP line per project plus a summary", () => {
    printHuman(
      [
        result({ projectId: 10, status: 200, statusText: "OK" }),
        result({ projectId: 11, status: 500, statusText: "Server Error" }),
      ],
      false,
    );

    const out = lines();
    expect(out).toContain("[redcap] project 10: HTTP 200 OK");
    expect(out).toContain("[redcap] project 11: HTTP 500 Server Error");
    expect(out.some((l: string) => l.startsWith("Résumé:"))).toBe(true);
    expect(out.some((l: string) => l.includes('"200":1'))).toBe(true);
    expect(out.some((l: string) => l.includes('"500":1'))).toBe(true);
  });

  it("prints ERROR line and 'unknown' fallback for null-status results", () => {
    printHuman(
      [
        result({ projectId: 7, status: null, ok: false, error: "ETIMEDOUT" }),
        result({ projectId: 8, status: null, ok: false, error: null }),
      ],
      false,
    );

    const out = lines();
    expect(out).toContain("[redcap] project 7: ERROR ETIMEDOUT");
    expect(out).toContain("[redcap] project 8: ERROR unknown");
  });

  it("emits a normalised body line when showBody is true and bodyPreview is non-empty", () => {
    printHuman(
      [
        result({
          projectId: 1,
          status: 200,
          statusText: "OK",
          bodyPreview: "  hello\n\tworld   ",
        }),
      ],
      true,
    );
    const out = lines();
    expect(out).toContain("  body: hello world");
  });

  it("does not emit a body line when bodyPreview is empty, even with showBody true", () => {
    printHuman([result({ projectId: 1, bodyPreview: "" })], true);
    const out = lines();
    expect(out.some((l: string) => l.startsWith("  body:"))).toBe(false);
  });

  it("does not emit a body line when showBody is false even if preview is non-empty", () => {
    printHuman([result({ projectId: 1, bodyPreview: "data" })], false);
    const out = lines();
    expect(out.some((l: string) => l.startsWith("  body:"))).toBe(false);
  });
});
