import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("./run.js", () => ({ run: vi.fn() }));
vi.mock("./from-crf.js", () => ({ fromCrf: vi.fn() }));
vi.mock("./match-references.js", () => ({
  matchReferencesCommand: vi.fn(),
}));
vi.mock("./match-researchers.js", () => ({
  matchResearchers: vi.fn(),
}));

import { run } from "./run.js";
import { fromCrf } from "./from-crf.js";
import { matchReferencesCommand } from "./match-references.js";
import { matchResearchers } from "./match-researchers.js";
import { main } from "./index.js";

const setArgv = (...args: string[]): void => {
  process.argv = ["node", "atlas-researcher-profiles", ...args];
};

describe("main (CLI dispatcher)", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  const originalArgv = process.argv;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["REDCAP_API_URL"] = "http://x";
    process.env["REDCAP_API_TOKEN"] = "tok";
    delete process.env["OPENALEX_USER_AGENT"];
    delete process.env["OPENALEX_API_TOKEN"];
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((_c?: number) => {
      throw new Error("__exit__");
    }) as never);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* noop */
    });
    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    vi.mocked(run).mockResolvedValue();
    vi.mocked(fromCrf).mockResolvedValue([] as never);
    vi.mocked(matchReferencesCommand).mockResolvedValue();
    vi.mocked(matchResearchers).mockResolvedValue();
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = { ...originalEnv };
    exitSpy.mockRestore();
    logSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it("prints help on --help and exits successfully", async () => {
    setArgv("--help");
    await main();
    const text = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(text).toContain("atlas-researcher-profiles");
    expect(text).toContain("Usage:");
    expect(run).not.toHaveBeenCalled();
  });

  it("prints help on -h", async () => {
    setArgv("-h");
    await main();
    const text = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join("\n");
    expect(text).toContain("Usage:");
  });

  it("prints version on --version", async () => {
    setArgv("--version");
    await main();
    expect(logSpy).toHaveBeenCalledWith("1.0.0");
  });

  it("prints version on -v", async () => {
    setArgv("-v");
    await main();
    expect(logSpy).toHaveBeenCalledWith("1.0.0");
  });

  it("rejects unknown commands and exits 1", async () => {
    setArgv("bogus-command");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 if required env vars are missing", async () => {
    setArgv();
    delete process.env["REDCAP_API_URL"];
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("dispatches to run() when no command is provided", async () => {
    setArgv();
    await main();
    expect(run).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(run).mock.calls[0]?.[0];
    expect(opts?.threshold).toBe(0.2);
    expect(opts?.crfUrl).toBe("http://x");
    expect(opts?.crfToken).toBe("tok");
  });

  it("forwards --batch / --yes to from-crf via shared opts", async () => {
    setArgv("from-crf", "--batch");
    await main();
    expect(vi.mocked(fromCrf).mock.calls[0]?.[0].batch).toBe(true);

    vi.clearAllMocks();
    setArgv("from-crf", "--yes");
    await main();
    expect(vi.mocked(fromCrf).mock.calls[0]?.[0].batch).toBe(true);
  });

  it("dispatches to fromCrf() on 'from-crf'", async () => {
    setArgv("from-crf");
    await main();
    expect(fromCrf).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown options for from-crf", async () => {
    setArgv("from-crf", "--bogus");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fromCrf).not.toHaveBeenCalled();
  });

  it("dispatches to matchReferencesCommand on 'match-references' with default threshold", async () => {
    setArgv("match-references");
    await main();
    expect(matchReferencesCommand).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(matchReferencesCommand).mock.calls[0]?.[0];
    expect(opts?.threshold).toBe(0.2);
  });

  it("parses --threshold value for match-references", async () => {
    setArgv("match-references", "--threshold", "0.35");
    await main();
    const opts = vi.mocked(matchReferencesCommand).mock.calls[0]?.[0];
    expect(opts?.threshold).toBe(0.35);
  });

  it("exits 1 when --threshold has a non-numeric value", async () => {
    setArgv("match-references", "--threshold", "abc");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when --threshold has no value", async () => {
    setArgv("match-references", "--threshold");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("rejects unknown options for match-references", async () => {
    setArgv("match-references", "--bogus");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(matchReferencesCommand).not.toHaveBeenCalled();
  });

  it("dispatches to matchResearchers with defaults", async () => {
    setArgv("match-researchers");
    await main();
    expect(matchResearchers).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(matchResearchers).mock.calls[0]?.[0];
    expect(opts?.output).toBe("table");
    expect(opts?.sortBy).toBe("similarity");
    expect(opts?.keywords).toBe(false);
    expect(opts?.chart).toBe(false);
    expect(opts?.top).toBeUndefined();
  });

  it("parses --top, --output, --complementarity, --keywords, --chart", async () => {
    setArgv(
      "match-researchers",
      "--top",
      "10",
      "--output",
      "json",
      "--complementarity",
      "--keywords",
      "--chart",
    );
    await main();
    const opts = vi.mocked(matchResearchers).mock.calls[0]?.[0];
    expect(opts?.top).toBe(10);
    expect(opts?.output).toBe("json");
    expect(opts?.sortBy).toBe("complementarity");
    expect(opts?.keywords).toBe(true);
    expect(opts?.chart).toBe(true);
  });

  it("exits 1 on invalid --top value", async () => {
    setArgv("match-researchers", "--top", "abc");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 on invalid --output value", async () => {
    setArgv("match-researchers", "--output", "xml");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("rejects unknown options for match-researchers", async () => {
    setArgv("match-researchers", "--bogus");
    await expect(main()).rejects.toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(matchResearchers).not.toHaveBeenCalled();
  });

  it("uses OPENALEX_USER_AGENT when set, otherwise the default", async () => {
    process.env["OPENALEX_USER_AGENT"] = "custom-ua";
    setArgv();
    await main();
    expect(vi.mocked(run).mock.calls[0]?.[0].citationUserAgent).toBe(
      "custom-ua",
    );
  });

  it("passes OPENALEX_API_TOKEN through when set", async () => {
    process.env["OPENALEX_API_TOKEN"] = "secret";
    setArgv();
    await main();
    expect(vi.mocked(run).mock.calls[0]?.[0].citationApiKey).toBe("secret");
  });
});
