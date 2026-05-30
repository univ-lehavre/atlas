import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mock the @univ-lehavre/atlas-crf-logs CSV parser
// ─────────────────────────────────────────────────────────────────────────────

const parseTokensCsv = vi.fn();
vi.mock("@univ-lehavre/atlas-crf-logs", () => ({
  parseTokensCsv,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mock node:fs / node:fs/promises so resolveWorkspaceRoot, readEnvFileVar and
// readTokens become deterministic
// ─────────────────────────────────────────────────────────────────────────────

const readFile = vi.fn();
const existsSync = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile,
  default: { readFile },
}));

vi.mock("node:fs", () => ({
  existsSync,
  default: { existsSync },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const importMain = async () => {
  vi.resetModules();
  const mod = await import("./index.js");
  return mod.main;
};

const withArgv = async (args: string[], fn: () => Promise<void>) => {
  const saved = process.argv;
  process.argv = ["node", "atlas-crf-stats", ...args];
  try {
    await fn();
  } finally {
    process.argv = saved;
  }
};

const resetMocks = () => {
  vi.clearAllMocks();
  delete process.env["REDCAP_API_URL"];
  process.exitCode = undefined;
  // Default: workspace root resolves to cwd (no pnpm-workspace.yaml found)
  existsSync.mockReturnValue(false);
  readFile.mockResolvedValue("");
  parseTokensCsv.mockReturnValue([]);
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("crf-stats main()", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetMocks();
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        vi.fn(() =>
          Promise.resolve(
            new Response("ok-body", { status: 200, statusText: "OK" }),
          ),
        ) as never,
      );
  });

  afterEach(() => {
    consoleLog.mockRestore();
    fetchSpy.mockRestore();
    process.exitCode = undefined;
  });

  it("fetches every token in --all and prints a HTTP line + summary", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([
      { project_id: 10, token: "AAA" },
      { project_id: 11, token: "BBB" },
    ]);
    readFile.mockResolvedValue("project_id,token\n10,AAA\n11,BBB\n");

    const main = await importMain();
    await withArgv(["--all"], async () => {
      await main();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const out = consoleLog.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(out.some((l: string) => l.includes("project 10: HTTP 200"))).toBe(
      true,
    );
    expect(out.some((l: string) => l.includes("project 11: HTTP 200"))).toBe(
      true,
    );
    expect(out.some((l: string) => l.startsWith("Résumé:"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("filters by --project and uses the matched token only", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([
      { project_id: 10, token: "AAA" },
      { project_id: 11, token: "BBB" },
    ]);
    readFile.mockResolvedValue("csv");

    const main = await importMain();
    await withArgv(["--project", "11"], async () => {
      await main();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0] as unknown[];
    const init = callArgs[1] as { body: URLSearchParams };
    expect(init.body.get("token")).toBe("BBB");
  });

  it("throws when --project does not match any token", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 10, token: "AAA" }]);
    readFile.mockResolvedValue("csv");

    const main = await importMain();
    await expect(
      withArgv(["--project", "99"], async () => {
        await main();
      }),
    ).rejects.toThrow(/project_id 99 introuvable/);
  });

  it("throws when --all but the CSV is empty", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([]);
    readFile.mockResolvedValue("");

    const main = await importMain();
    await expect(
      withArgv(["--all"], async () => {
        await main();
      }),
    ).rejects.toThrow(/Aucun token trouvé/);
  });

  it("falls back to a non-empty .env file when REDCAP_API_URL is unset", async () => {
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    // First readFile: tokens CSV; Subsequent: env-file reads
    readFile.mockImplementation((path: string) => {
      if (String(path).endsWith(".env")) {
        return Promise.resolve('REDCAP_API_URL="https://from-env-file/api"');
      }
      return Promise.resolve("csv");
    });

    const main = await importMain();
    await withArgv(["--project", "1"], async () => {
      await main();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = (fetchSpy.mock.calls[0] as unknown[])[0];
    expect(String(url)).toContain("from-env-file");
  });

  it("throws when no API URL can be resolved", async () => {
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    // readFile rejects for env-file lookups, succeeds for the CSV
    readFile.mockImplementation((path: string) => {
      if (String(path).endsWith(".env")) {
        return Promise.reject(new Error("ENOENT"));
      }
      return Promise.resolve("csv");
    });

    const main = await importMain();
    await expect(
      withArgv(["--project", "1"], async () => {
        await main();
      }),
    ).rejects.toThrow(/REDCAP_API_URL introuvable/);
  });

  it("prefers --api-url over env and .env files", async () => {
    process.env["REDCAP_API_URL"] = "https://env/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    readFile.mockResolvedValue("csv");

    const main = await importMain();
    await withArgv(
      ["--project", "1", "--api-url", "https://flag/api/"],
      async () => {
        await main();
      },
    );

    const url = String((fetchSpy.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("flag");
  });

  it("emits JSON output when --json is set", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    readFile.mockResolvedValue("csv");

    const main = await importMain();
    await withArgv(["--project", "1", "--json"], async () => {
      await main();
    });

    expect(consoleLog).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      String((consoleLog.mock.calls[0] as unknown[])[0]),
    ) as { tested: number; summary: Record<string, number>; apiUrl: string };
    expect(payload.tested).toBe(1);
    expect(payload.summary).toEqual({ "200": 1 });
    expect(payload.apiUrl).toContain("redcap.example.org");
  });

  it("sets process.exitCode=1 when at least one response is not ok", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    readFile.mockResolvedValue("csv");
    fetchSpy.mockResolvedValueOnce(
      new Response("bad", { status: 500, statusText: "Server Error" }) as never,
    );

    const main = await importMain();
    await withArgv(["--project", "1"], async () => {
      await main();
    });
    expect(process.exitCode).toBe(1);
  });

  it("captures fetch errors as ProjectResult error entries", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    readFile.mockResolvedValue("csv");
    fetchSpy.mockRejectedValueOnce(new Error("network down"));

    const main = await importMain();
    await withArgv(["--project", "1", "--json"], async () => {
      await main();
    });

    const payload = JSON.parse(
      String((consoleLog.mock.calls[0] as unknown[])[0]),
    ) as { results: Array<{ error: string | null; ok: boolean }> };
    expect(payload.results[0]?.error).toBe("network down");
    expect(payload.results[0]?.ok).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it("resolves an absolute tokens-file path as-is", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    readFile.mockResolvedValue("csv-content");

    const main = await importMain();
    await withArgv(
      ["--project", "1", "--tokens-file", "/abs/path/tokens.csv"],
      async () => {
        await main();
      },
    );

    expect(readFile).toHaveBeenCalledWith("/abs/path/tokens.csv", "utf8");
  });

  it("falls back to workspace-relative path when the cwd-relative file is missing", async () => {
    process.env["REDCAP_API_URL"] = "https://redcap.example.org/api/";
    parseTokensCsv.mockReturnValue([{ project_id: 1, token: "T" }]);
    // existsSync returns false for both workspace marker and cwd candidate
    existsSync.mockReturnValue(false);
    readFile.mockResolvedValue("csv");

    const main = await importMain();
    await withArgv(["--project", "1"], async () => {
      await main();
    });
    // Just assert readFile was called with some path ending with redcap-token.csv
    const callPaths = readFile.mock.calls.map((c) =>
      String((c as unknown[])[0]),
    );
    expect(callPaths.some((p) => p.endsWith("redcap-token.csv"))).toBe(true);
  });
});
