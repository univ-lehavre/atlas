import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for @clack/prompts (interactive UI)
// ─────────────────────────────────────────────────────────────────────────────

const spinnerStart = vi.fn();
const spinnerStop = vi.fn();
const spinnerMessage = vi.fn();
const intro = vi.fn();
const outro = vi.fn();
const text = vi.fn();
const select = vi.fn();
const confirm = vi.fn();
const cancel = vi.fn();
const logWarn = vi.fn();
const logInfo = vi.fn();
const logMessage = vi.fn();
const isCancel = vi.fn((_v: unknown) => false);

vi.mock("@clack/prompts", () => ({
  intro,
  outro,
  spinner: () => ({
    start: spinnerStart,
    stop: spinnerStop,
    message: spinnerMessage,
  }),
  text,
  select,
  confirm,
  cancel,
  isCancel,
  log: { warn: logWarn, info: logInfo, message: logMessage },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for @univ-lehavre/atlas-stats (business logic)
// ─────────────────────────────────────────────────────────────────────────────

const readCache = vi.fn();
const isCacheStale = vi.fn();
const computeStats = vi.fn();
const resolveWorkspaceRoot = vi.fn(() => "/workspace");
const resolveToken = vi.fn();
const collectAtlasStatsWithFallback = vi.fn();
const buildAtlasCliReport = vi.fn();

vi.mock("@univ-lehavre/atlas-stats", () => ({
  readCache,
  isCacheStale,
  computeStats,
  resolveWorkspaceRoot,
  resolveToken,
  collectAtlasStatsWithFallback,
  buildAtlasCliReport,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseCache = (overrides: Record<string, unknown> = {}) => ({
  savedAt: Date.now() - 60_000,
  packages: [],
  releases: [],
  ...overrides,
});

const baseReport = (overrides: Record<string, unknown> = {}) => ({
  warnings: [],
  summary: {
    githubReleasesForPeriod: 0,
    githubReleasesApiTotal: 0,
    githubReleasesMappedTotal: 0,
    npmReleasesTotalLabel: "0",
    packagesTotal: 0,
    packagesActive: 0,
    downloadsTotal: 0,
  },
  rows: [],
  splitIndex: 0,
  totals: { npmReleasesLabel: "0", ghReleasesTotal: 0, downloadsTotal: 0 },
  ...overrides,
});

const importMain = async () => {
  vi.resetModules();
  const mod = await import("./index.js");
  return mod.main;
};

const withArgv = async (args: string[], fn: () => Promise<void>) => {
  const saved = process.argv;
  process.argv = ["node", "atlas-stats", ...args];
  try {
    await fn();
  } finally {
    process.argv = saved;
  }
};

const resetMocks = () => {
  vi.clearAllMocks();
  isCancel.mockReturnValue(false);
  resolveWorkspaceRoot.mockReturnValue("/workspace");
  readCache.mockResolvedValue(null);
  isCacheStale.mockReturnValue(true);
  resolveToken.mockResolvedValue(null);
  computeStats.mockReturnValue({ result: "stats" });
  collectAtlasStatsWithFallback.mockResolvedValue(baseCache());
  buildAtlasCliReport.mockResolvedValue(baseReport());
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("atlas-stats main()", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetMocks();
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`__exit__:${String(code ?? 0)}`);
    }) as never);
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    exitSpy.mockRestore();
  });

  it("prints help and returns when --help is passed", async () => {
    const main = await importMain();
    await withArgv(["--help"], async () => {
      await main();
    });
    expect(consoleLog).toHaveBeenCalledTimes(1);
    const firstCall = consoleLog.mock.calls[0] as unknown[];
    expect(String(firstCall[0])).toContain("atlas-stats");
    expect(intro).not.toHaveBeenCalled();
    expect(readCache).not.toHaveBeenCalled();
  });

  it("--json: refreshes the cache when stale and prints JSON stats", async () => {
    resolveToken.mockResolvedValue("ghp_xyz");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockResolvedValue(
      baseCache({ tag: "fresh" }),
    );
    computeStats.mockReturnValue({ ok: true, period: "week" });

    const main = await importMain();
    await withArgv(["--json"], async () => {
      await main();
    });

    expect(intro).not.toHaveBeenCalled();
    expect(collectAtlasStatsWithFallback).toHaveBeenCalledTimes(1);
    expect(computeStats).toHaveBeenCalledTimes(1);
    expect(consoleLog).toHaveBeenCalledTimes(1);
    const payload = String((consoleLog.mock.calls[0] as unknown[])[0]);
    expect(payload).toContain('"ok": true');
    expect(payload).toContain('"period": "week"');
  });

  it("--json: reuses the cache when fresh and not forced", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(baseCache({ tag: "cached" }));
    isCacheStale.mockReturnValue(false);

    const main = await importMain();
    await withArgv(["--json", "--period", "month"], async () => {
      await main();
    });

    expect(collectAtlasStatsWithFallback).not.toHaveBeenCalled();
    expect(computeStats).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "cached" }),
      "month",
    );
  });

  it("--json --force: refreshes even when the cache is fresh", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(baseCache());
    isCacheStale.mockReturnValue(false);
    collectAtlasStatsWithFallback.mockResolvedValue(
      baseCache({ tag: "forced" }),
    );

    const main = await importMain();
    await withArgv(["--json", "--force"], async () => {
      await main();
    });

    expect(collectAtlasStatsWithFallback).toHaveBeenCalledTimes(1);
  });

  it("--json: throws when no token can be resolved", async () => {
    resolveToken.mockResolvedValue(null);

    const main = await importMain();
    await expect(
      withArgv(["--json"], async () => {
        await main();
      }),
    ).rejects.toThrow(/GITHUB_TOKEN introuvable/);
  });

  it("--json: forwards onWarning / onFallback to console.error via mocked hooks", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockImplementation(
      (
        _token: string,
        _cache: unknown,
        hooks: {
          onWarning?: (m: string) => void;
          onFallback?: (m: string) => void;
        },
      ) => {
        hooks.onWarning?.("warning!");
        hooks.onFallback?.("fallback!");
        return Promise.resolve(baseCache());
      },
    );

    const main = await importMain();
    await withArgv(["--json"], async () => {
      await main();
    });

    expect(consoleError).toHaveBeenCalledWith("warning!");
    expect(consoleError).toHaveBeenCalledWith("fallback!");
  });

  it("interactive: prompts for token when resolveToken returns null", async () => {
    resolveToken.mockResolvedValue(null);
    text.mockResolvedValue("  ghp_typed  ");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockResolvedValue(baseCache());

    const main = await importMain();
    await withArgv(["--period", "day"], async () => {
      await main();
    });

    expect(intro).toHaveBeenCalledWith("Atlas Stats");
    expect(text).toHaveBeenCalledTimes(1);
    expect(collectAtlasStatsWithFallback).toHaveBeenCalledWith(
      "ghp_typed",
      null,
      expect.any(Object),
    );
    expect(buildAtlasCliReport).toHaveBeenCalledTimes(1);
    expect(outro).toHaveBeenCalledWith("Terminé");
    expect(logInfo).toHaveBeenCalled();
    expect(logMessage).toHaveBeenCalled();
  });

  it("interactive: cancels gracefully when token prompt is aborted", async () => {
    resolveToken.mockResolvedValue(null);
    text.mockResolvedValue(Symbol("cancel"));
    isCancel.mockImplementation((v: unknown) => typeof v === "symbol");

    const main = await importMain();
    await expect(
      withArgv([], async () => {
        await main();
      }),
    ).rejects.toThrow(/__exit__:0/);
    expect(cancel).toHaveBeenCalledWith("Annulé.");
  });

  it("interactive: reuses cache when user confirms 'use cache'", async () => {
    resolveToken.mockResolvedValue("tok");
    const cache = baseCache();
    readCache.mockResolvedValue(cache);
    isCacheStale.mockReturnValue(false);
    confirm.mockResolvedValue(true);

    const main = await importMain();
    await withArgv(["--period", "week"], async () => {
      await main();
    });

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(collectAtlasStatsWithFallback).not.toHaveBeenCalled();
    expect(buildAtlasCliReport).toHaveBeenCalledWith(
      cache,
      "week",
      "/workspace",
    );
  });

  it("interactive: refetches when user declines the cache", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(baseCache());
    isCacheStale.mockReturnValue(false);
    confirm.mockResolvedValue(false);
    collectAtlasStatsWithFallback.mockImplementation(
      (
        _t: string,
        _c: unknown,
        hooks: {
          onProgress?: (m: string) => void;
          onWarning?: (m: string) => void;
          onFallback?: (m: string) => void;
        },
      ) => {
        hooks.onProgress?.("collecting…");
        hooks.onWarning?.("a warning");
        hooks.onFallback?.("falling back");
        return Promise.resolve(baseCache({ tag: "fresh" }));
      },
    );

    const main = await importMain();
    await withArgv(["--period", "quarter"], async () => {
      await main();
    });

    expect(spinnerStart).toHaveBeenCalled();
    expect(spinnerMessage).toHaveBeenCalledWith("collecting…");
    expect(spinnerStop).toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalledWith("a warning");
    expect(logWarn).toHaveBeenCalledWith("falling back");
  });

  it("interactive: prompts for period when none was passed", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockResolvedValue(baseCache());
    select.mockResolvedValue("month");

    const main = await importMain();
    await withArgv([], async () => {
      await main();
    });

    expect(select).toHaveBeenCalledTimes(1);
    expect(buildAtlasCliReport).toHaveBeenCalledWith(
      expect.any(Object),
      "month",
      "/workspace",
    );
  });

  it("interactive: cancels gracefully when period prompt is aborted", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockResolvedValue(baseCache());
    const sym = Symbol("cancel-period");
    select.mockResolvedValue(sym);
    isCancel.mockImplementation((v: unknown) => v === sym);

    const main = await importMain();
    await expect(
      withArgv([], async () => {
        await main();
      }),
    ).rejects.toThrow(/__exit__:0/);
    expect(cancel).toHaveBeenCalledWith("Annulé.");
  });

  it("interactive: emits report warnings through log.warn", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockResolvedValue(baseCache());
    buildAtlasCliReport.mockResolvedValue(
      baseReport({ warnings: ["W1", "W2"] }),
    );

    const main = await importMain();
    await withArgv(["--period", "week"], async () => {
      await main();
    });

    expect(logWarn).toHaveBeenCalledWith("W1");
    expect(logWarn).toHaveBeenCalledWith("W2");
  });

  it("interactive: propagates spinner errors after stopping the spinner", async () => {
    resolveToken.mockResolvedValue("tok");
    readCache.mockResolvedValue(null);
    collectAtlasStatsWithFallback.mockRejectedValue(new Error("boom"));

    const main = await importMain();
    await expect(
      withArgv(["--period", "day"], async () => {
        await main();
      }),
    ).rejects.toThrow(/boom/);
    expect(spinnerStop).toHaveBeenCalledWith("Collecte interrompue");
  });
});
