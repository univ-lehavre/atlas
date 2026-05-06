import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

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
      expect.stringContaining(".redcap-stats.json"),
      "utf8",
    );
  });

  it("returns null when the cache file does not exist", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await readCache();

    expect(result).toBeNull();
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
    mockWriteFile.mockResolvedValue();

    await writeCache([sampleLog]);

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [path, content, encoding] = mockWriteFile.mock.calls[0]!;
    expect(path).toEqual(expect.stringContaining(".redcap-stats.json"));
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
