import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`__exit__:${String(code ?? 0)}`);
    }) as never);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    exitSpy.mockRestore();
  });

  it("returns the defaults when --all is given alone", () => {
    const opts = parseArgs(["--all"]);
    expect(opts).toEqual({
      projectId: null,
      all: true,
      apiUrl: null,
      tokensFile: "redcap-token.csv",
      content: "log",
      timeoutMs: 12_000,
      showBody: false,
      json: false,
    });
  });

  it("parses --project as a number", () => {
    expect(parseArgs(["--project", "42"]).projectId).toBe(42);
  });

  it("throws when --project value is not a number", () => {
    expect(() => parseArgs(["--project", "abc"])).toThrow(
      /project_id invalide: abc/,
    );
  });

  it("throws when --project has no value", () => {
    expect(() => parseArgs(["--project"])).toThrow(
      /Argument manquant pour --project/,
    );
  });

  it("parses --api-url, --tokens-file and --content with trimming", () => {
    const opts = parseArgs([
      "--all",
      "--api-url",
      "  https://r/api  ",
      "--tokens-file",
      "  custom.csv  ",
      "--content",
      "  record  ",
    ]);
    expect(opts.apiUrl).toBe("https://r/api");
    expect(opts.tokensFile).toBe("custom.csv");
    expect(opts.content).toBe("record");
  });

  it.each([["--api-url"], ["--tokens-file"], ["--content"], ["--timeout-ms"]])(
    "throws when %s has no value",
    (flag) => {
      expect(() => parseArgs(["--all", flag])).toThrow(
        new RegExp(`Argument manquant pour ${flag}`),
      );
    },
  );

  it("parses --timeout-ms as integer", () => {
    expect(parseArgs(["--all", "--timeout-ms", "500"]).timeoutMs).toBe(500);
  });

  it("throws when --timeout-ms is not a number", () => {
    expect(() => parseArgs(["--all", "--timeout-ms", "xx"])).toThrow(
      /timeout invalide: xx/,
    );
  });

  it("flips --show-body and --json", () => {
    const opts = parseArgs(["--all", "--show-body", "--json"]);
    expect(opts.showBody).toBe(true);
    expect(opts.json).toBe(true);
  });

  it("prints usage and exits on --help", () => {
    expect(() => parseArgs(["--help"])).toThrow(/__exit__:0/);
    expect(consoleLog).toHaveBeenCalled();
    const out = String((consoleLog.mock.calls[0] as unknown[])[0]);
    expect(out).toContain("atlas-crf-stats");
    expect(out).toContain("--project");
    expect(out).toContain("--all");
  });

  it("prints usage and exits on -h", () => {
    expect(() => parseArgs(["-h"])).toThrow(/__exit__:0/);
    expect(consoleLog).toHaveBeenCalled();
  });

  it("throws on unknown options", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/Option inconnue: --nope/);
  });

  it("requires either --project or --all", () => {
    expect(() => parseArgs([])).toThrow(/--project <id> ou --all/);
  });

  it("rejects passing both --project and --all", () => {
    expect(() => parseArgs(["--project", "1", "--all"])).toThrow(
      /Utilise soit --project, soit --all/,
    );
  });
});
