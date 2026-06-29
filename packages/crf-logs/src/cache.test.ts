import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
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

import { readFile, writeFile } from "node:fs/promises";
import { readCache, writeCache, isCacheStale } from "./cache.js";
import type { RawLog } from "./api.js";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

const sampleLog: RawLog = {
  project_id: 1,
  timestamp: "2024-01-01T00:00:00Z",
  username: "alice",
  action: "Login",
};

describe("readCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses and returns the cache content when file exists", async () => {
    const cacheContent = { savedAt: 1_700_000_000_000, logs: [sampleLog] };
    mockReadFile.mockResolvedValue(JSON.stringify(cacheContent));

    const result = await readCache();

    expect(result).toEqual(cacheContent);
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining(".crf-stats.json"),
      "utf8",
    );
  });

  it("returns null when the cache file does not exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await readCache();

    expect(result).toBeNull();
  });

  it("returns null on invalid JSON instead of throwing", async () => {
    mockReadFile.mockResolvedValue("{ not json");

    const result = await readCache();

    expect(result).toBeNull();
  });

  it("returns null when the cache shape is invalid", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ savedAt: "nope" }));

    const result = await readCache();

    expect(result).toBeNull();
  });

  it("resolves the cache path from CRF_LOGS_CACHE_PATH when set", async () => {
    const previous = process.env["CRF_LOGS_CACHE_PATH"];
    process.env["CRF_LOGS_CACHE_PATH"] = "/tmp/custom-crf-cache.json";
    try {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ savedAt: 1, logs: [sampleLog] }),
      );
      await readCache();
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining("custom-crf-cache.json"),
        "utf8",
      );
    } finally {
      if (previous === undefined) {
        delete process.env["CRF_LOGS_CACHE_PATH"];
      } else {
        process.env["CRF_LOGS_CACHE_PATH"] = previous;
      }
    }
  });
});

describe("writeCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes JSON with savedAt and logs to the cache path", async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- writeFile resolves to void
    mockWriteFile.mockResolvedValue(undefined);

    await writeCache([sampleLog]);

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [path, content, encoding] = mockWriteFile.mock.calls[0]!;
    expect(path).toEqual(expect.stringContaining(".crf-stats.json"));
    expect(encoding).toBe("utf8");
    const parsed = JSON.parse(content as string);
    expect(parsed.savedAt).toBe(Date.now());
    expect(parsed.logs).toEqual([sampleLog]);
    expect(content as string).toMatch(/\n$/);
  });
});

describe("isCacheStale", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when cache is fresh", () => {
    const cache = { savedAt: Date.now() - 1000, logs: [] };
    expect(isCacheStale(cache)).toBe(false);
  });

  it("returns false at exactly the TTL boundary", () => {
    const cache = { savedAt: Date.now() - 24 * 60 * 60 * 1000, logs: [] };
    expect(isCacheStale(cache)).toBe(false);
  });

  it("returns true when cache is older than TTL", () => {
    const cache = { savedAt: Date.now() - 24 * 60 * 60 * 1000 - 1, logs: [] };
    expect(isCacheStale(cache)).toBe(true);
  });
});

describe("postgres backend (DSN dans CRF_LOGS_CACHE_PATH)", () => {
  const dsn = "postgres://u:p@pg-rw.postgres:5432/cache";
  const originalEnv = process.env["CRF_LOGS_CACHE_PATH"];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["CRF_LOGS_CACHE_PATH"] = dsn;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env["CRF_LOGS_CACHE_PATH"];
    else process.env["CRF_LOGS_CACHE_PATH"] = originalEnv;
  });

  it("readCache reconstruit CacheFile depuis l'entrée Postgres", async () => {
    storeGet.mockReturnValue({ savedAt: 5, data: [sampleLog] });
    await expect(readCache()).resolves.toEqual({
      savedAt: 5,
      logs: [sampleLog],
    });
    expect(storeGet).toHaveBeenCalledWith("crf-logs");
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("readCache retourne null quand l'entrée Postgres est absente", async () => {
    storeGet.mockReturnValue(null);
    await expect(readCache()).resolves.toBeNull();
  });

  it("writeCache délègue le payload logs au store Postgres", async () => {
    await writeCache([sampleLog]);
    expect(storeSet).toHaveBeenCalledWith("crf-logs", [sampleLog]);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});
