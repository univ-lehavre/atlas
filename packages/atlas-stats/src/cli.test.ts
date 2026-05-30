import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for node:fs and node:fs/promises
// ─────────────────────────────────────────────────────────────────────────────

const readFile = vi.fn();
const readdir = vi.fn();
const existsSync = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFile(...args),
  readdir: (...args: unknown[]) => readdir(...args),
  writeFile: vi.fn().mockResolvedValue(),
}));

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for sibling modules used by cli.ts
// ─────────────────────────────────────────────────────────────────────────────

const fetchReleases = vi.fn();
const fetchNpmPackages = vi.fn();
const fetchAllDownloads = vi.fn();
const writeCache = vi.fn();

vi.mock("./github.js", () => ({
  fetchReleases: (...args: unknown[]) => fetchReleases(...args),
}));
vi.mock("./npm.js", () => ({
  fetchNpmPackages: (...args: unknown[]) => fetchNpmPackages(...args),
  fetchAllDownloads: (...args: unknown[]) => fetchAllDownloads(...args),
}));
vi.mock("./cache.js", () => ({
  writeCache: (...args: unknown[]) => writeCache(...args),
}));

// Re-import after resetting modules so all mocks register.
const importCli = async () => {
  vi.resetModules();
  return import("./cli.js");
};

const originalCwd = process.cwd;
const originalEnvToken = process.env["GITHUB_TOKEN"];

beforeEach(() => {
  vi.clearAllMocks();
  writeCache.mockResolvedValue();
  process.cwd = () => "/workspace";
  delete process.env["GITHUB_TOKEN"];
});

afterEach(() => {
  process.cwd = originalCwd;
  if (originalEnvToken === undefined) {
    delete process.env["GITHUB_TOKEN"];
  } else {
    process.env["GITHUB_TOKEN"] = originalEnvToken;
  }
});

describe("resolveWorkspaceRoot", () => {
  it("returns the directory containing pnpm-workspace.yaml", async () => {
    existsSync.mockImplementation(
      (p: unknown) => String(p) === "/workspace/pnpm-workspace.yaml",
    );
    const { resolveWorkspaceRoot } = await importCli();
    expect(resolveWorkspaceRoot()).toBe("/workspace");
  });

  it("falls back to cwd when no marker is found", async () => {
    existsSync.mockReturnValue(false);
    const { resolveWorkspaceRoot } = await importCli();
    expect(resolveWorkspaceRoot()).toBe("/workspace");
  });
});

describe("resolveToken", () => {
  it("returns the explicit arg when provided", async () => {
    const { resolveToken } = await importCli();
    await expect(resolveToken("explicit", "/workspace")).resolves.toBe(
      "explicit",
    );
  });

  it("returns the GITHUB_TOKEN env var when set", async () => {
    process.env["GITHUB_TOKEN"] = "from-env";
    const { resolveToken } = await importCli();
    await expect(resolveToken(null, "/workspace")).resolves.toBe("from-env");
  });

  it("reads GITHUB_TOKEN from apps/atlas-dashboard/.env", async () => {
    readFile.mockImplementation((p: unknown) => {
      if (String(p).endsWith("apps/atlas-dashboard/.env")) {
        return Promise.resolve(
          `# a comment\nGITHUB_TOKEN="ghp_dashboard"\nOTHER=foo`,
        );
      }
      return Promise.reject(new Error("ENOENT"));
    });
    const { resolveToken } = await importCli();
    await expect(resolveToken(null, "/workspace")).resolves.toBe(
      "ghp_dashboard",
    );
  });

  it("reads GITHUB_TOKEN from the root .env when dashboard env is missing", async () => {
    readFile.mockImplementation((p: unknown) => {
      const s = String(p);
      if (s.endsWith("apps/atlas-dashboard/.env")) {
        return Promise.reject(new Error("ENOENT"));
      }
      if (s.endsWith("/.env")) {
        return Promise.resolve("GITHUB_TOKEN='ghp_root'\n");
      }
      return Promise.reject(new Error("ENOENT"));
    });
    const { resolveToken } = await importCli();
    await expect(resolveToken(null, "/workspace")).resolves.toBe("ghp_root");
  });

  it("returns null when nothing can be resolved", async () => {
    readFile.mockRejectedValue(new Error("ENOENT"));
    const { resolveToken } = await importCli();
    await expect(resolveToken(null, "/workspace")).resolves.toBeNull();
  });

  it("ignores empty-string explicit token and env var", async () => {
    process.env["GITHUB_TOKEN"] = "";
    readFile.mockRejectedValue(new Error("ENOENT"));
    const { resolveToken } = await importCli();
    await expect(resolveToken("", "/workspace")).resolves.toBeNull();
  });

  it("skips blank lines, comments and lines without '='", async () => {
    readFile.mockImplementation((p: unknown) => {
      if (String(p).endsWith("apps/atlas-dashboard/.env")) {
        return Promise.resolve(
          "\n# comment line\nno-equals-here\n  GITHUB_TOKEN=value\n",
        );
      }
      return Promise.reject(new Error("ENOENT"));
    });
    const { resolveToken } = await importCli();
    await expect(resolveToken(null, "/workspace")).resolves.toBe("value");
  });
});

describe("collectAtlasStats", () => {
  it("collects releases, packages and downloads and writes the cache", async () => {
    fetchReleases.mockResolvedValue([
      { tag_name: "@univ-lehavre/foo@1.0", published_at: "2024-01-01" },
    ]);
    fetchNpmPackages.mockResolvedValue([
      { name: "@univ-lehavre/foo", version: "1.0", date: "2024-01-01" },
    ]);
    fetchAllDownloads.mockImplementation(
      async (
        _pkgs: unknown,
        _s: Date,
        _e: Date,
        onBatchDone: (d: number, t: number) => void,
      ) => {
        onBatchDone(1, 1);
        return { "@univ-lehavre/foo": [{ day: "2024-01-01", downloads: 5 }] };
      },
    );

    const onProgress = vi.fn();
    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    const cache = await collectAtlasStats("tok", { onProgress, onWarning });

    expect(cache.releases).toHaveLength(1);
    expect(cache.packages).toHaveLength(1);
    expect(cache.downloads["@univ-lehavre/foo"]).toEqual([
      { day: "2024-01-01", downloads: 5 },
    ]);
    expect(writeCache).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalled();
    expect(onWarning).not.toHaveBeenCalled();
  });

  it("continues when GitHub fetch fails (warns) and writes cache from npm", async () => {
    fetchReleases.mockRejectedValue(new Error("gh down"));
    fetchNpmPackages.mockResolvedValue([
      { name: "pkg-a", version: "1", date: "2024-01-01" },
    ]);
    fetchAllDownloads.mockResolvedValue({});

    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    const cache = await collectAtlasStats("tok", { onWarning });
    expect(cache.releases).toEqual([]);
    expect(cache.packages).toHaveLength(1);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("releases GitHub"),
    );
  });

  it("warns when npm packages cannot be fetched", async () => {
    fetchReleases.mockResolvedValue([]);
    fetchNpmPackages.mockRejectedValue(new Error("npm down"));

    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    const cache = await collectAtlasStats("tok", { onWarning });
    expect(cache.packages).toEqual([]);
    expect(cache.downloads).toEqual({});
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("paquets npm"),
    );
    expect(fetchAllDownloads).not.toHaveBeenCalled();
  });

  it("warns when downloads fail but still writes the cache", async () => {
    fetchReleases.mockResolvedValue([]);
    fetchNpmPackages.mockResolvedValue([
      { name: "pkg-a", version: "1", date: "2024-01-01" },
    ]);
    fetchAllDownloads.mockRejectedValue(new Error("dl boom"));

    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    const cache = await collectAtlasStats("tok", { onWarning });
    expect(cache.downloads).toEqual({});
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("téléchargements"),
    );
  });

  it("throws when both GitHub and npm sources fail", async () => {
    fetchReleases.mockRejectedValue(new Error("gh"));
    fetchNpmPackages.mockRejectedValue(new Error("npm"));
    const { collectAtlasStats } = await importCli();
    await expect(collectAtlasStats("tok")).rejects.toThrow(
      /Aucune source réseau/,
    );
  });

  it("formats errors with a cause when present", async () => {
    const inner = new Error("inner");
    const outer = new Error("outer", { cause: inner });
    fetchReleases.mockRejectedValue(outer);
    fetchNpmPackages.mockResolvedValue([]);
    fetchAllDownloads.mockResolvedValue({});

    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    await collectAtlasStats("tok", { onWarning });
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("outer (inner)"),
    );
  });

  it("formats non-Error rejections via String()", async () => {
    fetchReleases.mockRejectedValue("plain-string");
    fetchNpmPackages.mockResolvedValue([]);
    fetchAllDownloads.mockResolvedValue({});

    const onWarning = vi.fn();
    const { collectAtlasStats } = await importCli();
    await collectAtlasStats("tok", { onWarning });
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining("plain-string"),
    );
  });
});

describe("collectAtlasStatsWithFallback", () => {
  it("returns the freshly collected cache on success", async () => {
    fetchReleases.mockResolvedValue([]);
    fetchNpmPackages.mockResolvedValue([]);
    fetchAllDownloads.mockResolvedValue({});
    const { collectAtlasStatsWithFallback } = await importCli();
    const cache = await collectAtlasStatsWithFallback("tok", null);
    expect(cache.savedAt).toBeTypeOf("number");
  });

  it("returns the fallback cache when collection throws", async () => {
    fetchReleases.mockRejectedValue(new Error("gh"));
    fetchNpmPackages.mockRejectedValue(new Error("npm"));
    const onFallback = vi.fn();
    const fallback = {
      savedAt: Date.now() - 5 * 60_000,
      releases: [],
      packages: [],
      downloads: {},
    };
    const { collectAtlasStatsWithFallback } = await importCli();
    const result = await collectAtlasStatsWithFallback("tok", fallback, {
      onFallback,
    });
    expect(result).toBe(fallback);
    expect(onFallback).toHaveBeenCalledWith(expect.stringContaining("min"));
  });

  it("rethrows when collection fails and no fallback is provided", async () => {
    fetchReleases.mockRejectedValue(new Error("gh"));
    fetchNpmPackages.mockRejectedValue(new Error("npm"));
    const { collectAtlasStatsWithFallback } = await importCli();
    await expect(collectAtlasStatsWithFallback("tok", null)).rejects.toThrow(
      /Aucune source réseau/,
    );
  });
});

// Build a synthetic directory tree entry for readWorkspacePackageNames.
const dirEntry = (name: string, isDir: boolean) => ({
  name,
  isDirectory: () => isDir,
  isFile: () => !isDir,
});

// Configure fs mocks with a synthetic workspace tree under `/workspace`.
const setupWorkspaceTree = (
  pkgJson: Record<string, { name?: string }>,
): void => {
  readdir.mockImplementation((dir: unknown) => {
    const s = String(dir);
    if (s === "/workspace") {
      return Promise.resolve([
        dirEntry("packages", true),
        dirEntry("README.md", false),
      ]);
    }
    if (s === "/workspace/packages") {
      return Promise.resolve(
        Object.keys(pkgJson).map((p) => dirEntry(p, true)),
      );
    }
    const pkgName = s.split("/").pop();
    if (pkgName !== undefined && pkgName in pkgJson) {
      return Promise.resolve([dirEntry("package.json", false)]);
    }
    return Promise.resolve([]);
  });

  readFile.mockImplementation((p: unknown) => {
    const s = String(p);
    const match = /\/workspace\/packages\/([^/]+)\/package\.json$/.exec(s);
    if (match === null) {
      return Promise.reject(new Error("ENOENT"));
    }
    const pkgName = match[1] as string;
    const meta = pkgJson[pkgName];
    if (meta === undefined) return Promise.reject(new Error("ENOENT"));
    return Promise.resolve(JSON.stringify(meta));
  });
};

describe("buildAtlasCliReport", () => {
  it("builds a report with monorepo + non-monorepo packages and totals", async () => {
    setupWorkspaceTree({
      foo: { name: "@univ-lehavre/foo" },
    });

    const today = new Date().toISOString().slice(0, 10);
    const { buildAtlasCliReport } = await importCli();
    const cache = {
      savedAt: Date.now(),
      releases: [
        { tag_name: "@univ-lehavre/foo@1.0", published_at: today },
        { tag_name: "@univ-lehavre/foo@1.1", published_at: today },
        { tag_name: "no-at-here", published_at: today },
        { tag_name: "@@bad", published_at: today },
      ],
      packages: [
        {
          name: "@univ-lehavre/foo",
          version: "1.1",
          date: today,
          publishDates: [today, today],
        },
        {
          name: "@univ-lehavre/bar",
          version: "0.1",
          date: today,
        },
        {
          name: "@univ-lehavre/empty",
          version: "0.0.0",
          date: "",
        },
      ],
      downloads: {
        "@univ-lehavre/foo": [{ day: today, downloads: 10 }],
        "@univ-lehavre/bar": [{ day: today, downloads: 3 }],
      },
    };

    const report = await buildAtlasCliReport(cache, "month", "/workspace");
    expect(report.warnings).toEqual([]);
    // foo is monorepo-present → sorted first; bar / empty after.
    expect(report.rows[0]?.packageName).toBe("@univ-lehavre/foo");
    expect(report.rows[0]?.monorepoPresent).toBe(true);
    expect(report.rows[0]?.ghReleaseCount).toBe(2);
    expect(report.rows[0]?.npmReleaseCount).toBe(2);
    expect(report.splitIndex).toBe(1);
    // bar uses date-only (no publishDates) → npmReleaseCount=null → label uses ">="
    expect(report.totals.npmReleasesLabel.startsWith(">=")).toBe(true);
    expect(report.totals.downloadsTotal).toBe(13);
    expect(report.summary.githubReleasesMappedTotal).toBe(2);
    expect(report.summary.githubReleasesApiTotal).toBe(4);
  });

  it("records a warning when workspace tree cannot be read", async () => {
    readdir.mockRejectedValue(new Error("perm denied"));
    const { buildAtlasCliReport } = await importCli();
    const cache = {
      savedAt: Date.now(),
      releases: [],
      packages: [
        { name: "@univ-lehavre/foo", version: "1", date: "2024-01-01" },
      ],
      downloads: {},
    };
    const report = await buildAtlasCliReport(cache, "month", "/workspace");
    expect(report.warnings[0]).toMatch(/Impossible de lire/);
    expect(report.rows[0]?.monorepoPresent).toBe(false);
    expect(report.splitIndex).toBe(0);
  });

  it("uses the numeric label when every package has known publishDates", async () => {
    setupWorkspaceTree({});
    const { buildAtlasCliReport } = await importCli();
    const cache = {
      savedAt: Date.now(),
      releases: [],
      packages: [
        {
          name: "@univ-lehavre/foo",
          version: "1",
          date: "2024-01-01",
          publishDates: ["2024-01-01", "2024-01-02"],
        },
      ],
      downloads: {},
    };
    const report = await buildAtlasCliReport(cache, "month", "/workspace");
    expect(report.totals.npmReleasesLabel).toBe("2");
  });

  it("resolves an unscoped tag against known packages (with scope)", async () => {
    setupWorkspaceTree({});
    const { buildAtlasCliReport } = await importCli();
    const cache = {
      savedAt: Date.now(),
      releases: [
        { tag_name: "foo@1.0", published_at: "2024-01-02" },
        { tag_name: "univ-lehavre/foo@1.1", published_at: "2024-01-03" },
      ],
      packages: [
        { name: "@univ-lehavre/foo", version: "1.1", date: "2024-01-03" },
      ],
      downloads: {},
    };
    const report = await buildAtlasCliReport(cache, "month", "/workspace");
    expect(report.rows[0]?.ghReleaseCount).toBe(2);
  });

  it("ignores invalid package.json files during workspace walk", async () => {
    readdir.mockImplementation((dir: unknown) => {
      const s = String(dir);
      if (s === "/workspace") {
        return Promise.resolve([
          dirEntry("packages", true),
          dirEntry("node_modules", true),
          dirEntry(".git", true),
        ]);
      }
      if (s === "/workspace/packages") {
        return Promise.resolve([entry("foo", true), dirEntry("bar", true)]);
      }
      return Promise.resolve([entry("package.json", false)]);
    });
    readFile.mockImplementation((p: unknown) => {
      if (String(p).endsWith("/foo/package.json")) {
        return Promise.resolve("not-json");
      }
      if (String(p).endsWith("/bar/package.json")) {
        return Promise.resolve(JSON.stringify({ name: "" }));
      }
      return Promise.reject(new Error("ENOENT"));
    });

    const { buildAtlasCliReport } = await importCli();
    const report = await buildAtlasCliReport(
      {
        savedAt: Date.now(),
        releases: [],
        packages: [],
        downloads: {},
      },
      "month",
      "/workspace",
    );
    expect(report.rows).toEqual([]);
  });
});
