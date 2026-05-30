import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for node:fs and node:fs/promises
// ─────────────────────────────────────────────────────────────────────────────

const readFile = vi.fn();
const writeFile = vi.fn();
const existsSync = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFile(...args),
  writeFile: (...args: unknown[]) => writeFile(...args),
}));

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
}));

// Always re-import after resetting modules so mocks are wired.
const importCache = async () => {
  vi.resetModules();
  return import("./cache.js");
};

describe("cache", () => {
  const originalCwd = process.cwd;
  const originalEnv = process.env["ATLAS_STATS_CACHE_PATH"];

  beforeEach(() => {
    vi.clearAllMocks();
    process.cwd = () => "/workspace/packages/foo";
    delete process.env["ATLAS_STATS_CACHE_PATH"];
  });

  afterEach(() => {
    process.cwd = originalCwd;
    if (originalEnv === undefined) {
      delete process.env["ATLAS_STATS_CACHE_PATH"];
    } else {
      process.env["ATLAS_STATS_CACHE_PATH"] = originalEnv;
    }
  });

  describe("readCache", () => {
    it("returns null when the file cannot be read", async () => {
      existsSync.mockReturnValue(true);
      readFile.mockRejectedValue(new Error("ENOENT"));
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toBeNull();
    });

    it("returns null when content is not valid JSON", async () => {
      existsSync.mockReturnValue(true);
      readFile.mockResolvedValue("not-json{");
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toBeNull();
    });

    it("returns null when the parsed cache lacks savedAt", async () => {
      existsSync.mockReturnValue(true);
      readFile.mockResolvedValue(JSON.stringify({ foo: "bar" }));
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toBeNull();
    });

    it("returns null when the parsed value is null", async () => {
      existsSync.mockReturnValue(true);
      readFile.mockResolvedValue("null");
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toBeNull();
    });

    it("returns the parsed cache when valid", async () => {
      const cache = {
        savedAt: 12_345,
        releases: [],
        packages: [],
        downloads: {},
      };
      existsSync.mockReturnValue(true);
      readFile.mockResolvedValue(JSON.stringify(cache));
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toEqual(cache);
    });
  });

  describe("writeCache", () => {
    it("writes JSON-serialised cache to disk", async () => {
      existsSync.mockReturnValue(true);
      writeFile.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 42,
        releases: [],
        packages: [],
        downloads: {},
      });
      expect(writeFile).toHaveBeenCalledTimes(1);
      const [, payload, encoding] = writeFile.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(JSON.parse(payload)).toEqual({
        savedAt: 42,
        releases: [],
        packages: [],
        downloads: {},
      });
      expect(encoding).toBe("utf8");
    });
  });

  describe("isCacheStale", () => {
    it("returns false when savedAt is recent", async () => {
      const { isCacheStale } = await importCache();
      expect(
        isCacheStale({
          savedAt: Date.now() - 1000,
          releases: [],
          packages: [],
          downloads: {},
        }),
      ).toBe(false);
    });

    it("returns true when savedAt is older than 24h", async () => {
      const { isCacheStale } = await importCache();
      expect(
        isCacheStale({
          savedAt: Date.now() - 25 * 60 * 60 * 1000,
          releases: [],
          packages: [],
          downloads: {},
        }),
      ).toBe(true);
    });
  });

  describe("cache path resolution", () => {
    it("uses ATLAS_STATS_CACHE_PATH when set", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = "/tmp/foo.json";
      existsSync.mockReturnValue(true);
      writeFile.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [filePath] = writeFile.mock.calls[0] as [string];
      expect(filePath).toMatch(/foo\.json$/);
    });

    it("falls back to cwd when no workspace marker is found", async () => {
      existsSync.mockReturnValue(false);
      writeFile.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [filePath] = writeFile.mock.calls[0] as [string];
      expect(filePath).toMatch(/\.atlas-stats\.json$/);
    });

    it("walks up to the workspace root when the marker is present", async () => {
      // Marker found two levels above cwd
      existsSync.mockImplementation((p: unknown) => {
        const s = String(p);
        return s === "/workspace/pnpm-workspace.yaml";
      });
      writeFile.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [filePath] = writeFile.mock.calls[0] as [string];
      expect(filePath).toBe("/workspace/.atlas-stats.json");
    });

    it("treats an empty ATLAS_STATS_CACHE_PATH like unset", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = "   ";
      existsSync.mockReturnValue(false);
      writeFile.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [filePath] = writeFile.mock.calls[0] as [string];
      expect(filePath).toMatch(/\.atlas-stats\.json$/);
    });
  });
});
