import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for node:fs and node:fs/promises
// ─────────────────────────────────────────────────────────────────────────────

const readFile = vi.fn();
// `writeFile` est appelé sur le FileHandle retourné par `open` (écriture
// atomique par descripteur exclusif). On capture ses arguments via le handle.
const handleWriteFile = vi.fn();
const handleClose = vi.fn();
const open = vi.fn(() => ({ writeFile: handleWriteFile, close: handleClose }));
const rename = vi.fn();
const existsSync = vi.fn();

vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFile(...args),
  open: (...args: unknown[]) => open(...args),
  rename: (...args: unknown[]) => rename(...args),
}));

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
}));

// Back-end Postgres mocké : on teste l'AIGUILLAGE (DSN → délègue au package),
// pas le SQL réel (couvert par l'intégration hermétique de @univ-lehavre/atlas-cache).
const storeGet = vi.fn();
const storeSet = vi.fn();
vi.mock("@univ-lehavre/atlas-cache", async () => {
  const { Effect, Context, Layer } = await import("effect");
  const Tag = Context.GenericTag<{
    readonly get: (k: string) => unknown;
    readonly set: (k: string, d: unknown) => unknown;
  }>("test/CacheStore");
  return {
    CacheStore: Tag,
    PostgresCacheLayer: () =>
      Layer.succeed(Tag, {
        get: (k: string) => Effect.sync(() => storeGet(k)),
        set: (k: string, d: unknown) => Effect.sync(() => storeSet(k, d)),
      }),
  };
});

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
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 42,
        releases: [],
        packages: [],
        downloads: {},
      });
      expect(handleWriteFile).toHaveBeenCalledTimes(1);
      const [payload, encoding] = handleWriteFile.mock.calls[0] as [
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

    it("writes atomically: an exclusive temp handle then renames onto the target", async () => {
      existsSync.mockReturnValue(true);
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 7,
        releases: [],
        packages: [],
        downloads: {},
      });
      // Ouverture EXCLUSIVE (`"wx"`) d'un nom intermédiaire, jamais la cible.
      const [tmpPath, flag] = open.mock.calls[0] as [string, string];
      expect(flag).toBe("wx");
      expect(tmpPath).not.toMatch(/\.atlas-stats\.json$/);
      // Le handle est refermé puis le fichier renommé sur la cible (swap atomique).
      expect(handleClose).toHaveBeenCalledTimes(1);
      const [renameFrom, renameTo] = rename.mock.calls[0] as [string, string];
      expect(renameFrom).toBe(tmpPath);
      expect(renameTo).toMatch(/\.atlas-stats\.json$/);
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
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [, renameTo] = rename.mock.calls[0] as [string, string];
      expect(renameTo).toMatch(/foo\.json$/);
    });

    it("falls back to cwd when no workspace marker is found", async () => {
      existsSync.mockReturnValue(false);
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [, renameTo] = rename.mock.calls[0] as [string, string];
      expect(renameTo).toMatch(/\.atlas-stats\.json$/);
    });

    it("walks up to the workspace root when the marker is present", async () => {
      // Marker found two levels above cwd
      existsSync.mockImplementation((p: unknown) => {
        const s = String(p);
        return s === "/workspace/pnpm-workspace.yaml";
      });
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [, renameTo] = rename.mock.calls[0] as [string, string];
      expect(renameTo).toBe("/workspace/.atlas-stats.json");
    });

    it("treats an empty ATLAS_STATS_CACHE_PATH like unset", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = "   ";
      existsSync.mockReturnValue(false);
      handleWriteFile.mockResolvedValue();
      rename.mockResolvedValue();
      const { writeCache } = await importCache();
      await writeCache({
        savedAt: 1,
        releases: [],
        packages: [],
        downloads: {},
      });
      const [, renameTo] = rename.mock.calls[0] as [string, string];
      expect(renameTo).toMatch(/\.atlas-stats\.json$/);
    });
  });

  describe("postgres backend (DSN dans ATLAS_STATS_CACHE_PATH)", () => {
    const dsn = "postgres://u:p@pg-rw.postgres:5432/cache";

    it("readCache délègue au store Postgres et retourne son data", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = dsn;
      const cached = { savedAt: 7, releases: [], packages: [], downloads: {} };
      storeGet.mockReturnValue({ savedAt: 7, data: cached });
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toEqual(cached);
      expect(storeGet).toHaveBeenCalledWith("atlas-stats");
      expect(readFile).not.toHaveBeenCalled();
    });

    it("readCache retourne null quand l'entrée Postgres est absente", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = dsn;
      storeGet.mockReturnValue(null);
      const { readCache } = await importCache();
      await expect(readCache()).resolves.toBeNull();
    });

    it("writeCache délègue au store Postgres (pas d'écriture fichier)", async () => {
      process.env["ATLAS_STATS_CACHE_PATH"] = dsn;
      const data = { savedAt: 9, releases: [], packages: [], downloads: {} };
      const { writeCache } = await importCache();
      await writeCache(data);
      expect(storeSet).toHaveBeenCalledWith("atlas-stats", data);
      expect(open).not.toHaveBeenCalled();
    });
  });
});
