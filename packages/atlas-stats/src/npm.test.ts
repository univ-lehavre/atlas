import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchNpmPackages,
  fetchAllDownloads,
  type OnBatchDone,
} from "./npm.js";
import type { NpmPackageMeta } from "./types.js";

// Avoid waiting on real timers when npm.ts calls sleep().
const stubSleep = (): ReturnType<typeof vi.spyOn> =>
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void) => {
    cb();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as never);

describe("fetchNpmPackages", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns metadata for each package in the org", async () => {
    // 1) fetch org package names → 1 package
    fetchSpy.mockImplementation((url: unknown) => {
      const u = String(url);
      if (u.includes("/-/org/univ-lehavre/package")) {
        return Promise.resolve(
          Response.json(
            { "@univ-lehavre/foo": "write" },
            {
              status: 200,
            },
          ),
        );
      }
      if (u.endsWith("/latest")) {
        return Promise.resolve(
          Response.json(
            {
              name: "@univ-lehavre/foo",
              version: "1.2.3",
              _time: "2024-01-01T00:00:00Z",
            },
            { status: 200 },
          ),
        );
      }
      // full metadata
      return Promise.resolve(
        Response.json(
          {
            name: "@univ-lehavre/foo",
            time: {
              created: "2023-01-01",
              modified: "2024-05-01",
              "1.0.0": "2023-06-01",
              "1.2.3": "2024-02-02",
            },
          },
          { status: 200 },
        ),
      );
    });

    const result = await fetchNpmPackages();
    expect(result).toEqual([
      {
        name: "@univ-lehavre/foo",
        version: "1.2.3",
        date: "2024-02-02",
        publishDates: ["2023-06-01", "2024-02-02"],
      },
    ]);
  });

  it("throws when the org package endpoint fails", async () => {
    fetchSpy.mockResolvedValue(new Response("nope", { status: 500 }));
    await expect(fetchNpmPackages()).rejects.toThrow(/npm org API 500/);
  });

  it("falls back to _time when full metadata fetch fails", async () => {
    fetchSpy.mockImplementation((url: unknown) => {
      const u = String(url);
      if (u.includes("/-/org/")) {
        return Promise.resolve(
          Response.json(
            { "@univ-lehavre/bar": "write" },
            {
              status: 200,
            },
          ),
        );
      }
      if (u.endsWith("/latest")) {
        return Promise.resolve(
          Response.json(
            {
              name: "@univ-lehavre/bar",
              version: "0.1.0",
              _time: "2024-03-03",
            },
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("err", { status: 500 }));
    });

    const result = await fetchNpmPackages();
    expect(result).toEqual([
      {
        name: "@univ-lehavre/bar",
        version: "0.1.0",
        date: "2024-03-03",
        publishDates: ["2024-03-03"],
      },
    ]);
  });

  it("returns an empty publishDates array when full metadata fails and no _time", async () => {
    fetchSpy.mockImplementation((url: unknown) => {
      const u = String(url);
      if (u.includes("/-/org/")) {
        return Promise.resolve(
          Response.json(
            { "@univ-lehavre/baz": "write" },
            {
              status: 200,
            },
          ),
        );
      }
      if (u.endsWith("/latest")) {
        return Promise.resolve(
          Response.json(
            { name: "@univ-lehavre/baz", version: "0.0.1" },
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("err", { status: 500 }));
    });

    const result = await fetchNpmPackages();
    expect(result[0]?.publishDates).toEqual([]);
    expect(result[0]?.date).toBe("");
  });

  it("throws when the package /latest endpoint fails", async () => {
    fetchSpy.mockImplementation((url: unknown) => {
      const u = String(url);
      if (u.includes("/-/org/")) {
        return Promise.resolve(
          Response.json(
            { "@univ-lehavre/foo": "write" },
            {
              status: 200,
            },
          ),
        );
      }
      return Promise.resolve(new Response("err", { status: 404 }));
    });
    await expect(fetchNpmPackages()).rejects.toThrow(
      /npm metadata 404 for @univ-lehavre\/foo/,
    );
  });
});

const buildPackages = (names: string[]): NpmPackageMeta[] =>
  names.map((n) => ({ name: n, version: "1.0.0", date: "2024-01-01" }));

describe("fetchAllDownloads", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    setTimeoutSpy = stubSleep();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  const start = new Date("2024-01-01T00:00:00Z");
  const end = new Date("2024-01-10T00:00:00Z");

  it("returns daily download points keyed by package name (bulk)", async () => {
    fetchSpy.mockResolvedValue(
      Response.json(
        {
          "pkg-a": {
            package: "pkg-a",
            start: "2024-01-01",
            end: "2024-01-10",
            downloads: [{ day: "2024-01-01", downloads: 5 }],
          },
          "pkg-b": {
            package: "pkg-b",
            start: "2024-01-01",
            end: "2024-01-10",
            downloads: [{ day: "2024-01-02", downloads: 7 }],
          },
        },
        { status: 200 },
      ),
    );

    const onBatchDone = vi.fn<OnBatchDone>();
    const result = await fetchAllDownloads(
      buildPackages(["pkg-a", "pkg-b"]),
      start,
      end,
      onBatchDone,
    );

    expect(result).toEqual({
      "pkg-a": [{ day: "2024-01-01", downloads: 5 }],
      "pkg-b": [{ day: "2024-01-02", downloads: 7 }],
    });
    expect(onBatchDone).toHaveBeenCalledWith(2, 2);
  });

  it("treats a single-entry response as belonging to the first package", async () => {
    fetchSpy.mockResolvedValue(
      Response.json(
        {
          package: "pkg-solo",
          start: "2024-01-01",
          end: "2024-01-10",
          downloads: [{ day: "2024-01-03", downloads: 42 }],
        },
        { status: 200 },
      ),
    );

    const result = await fetchAllDownloads(
      buildPackages(["pkg-solo"]),
      start,
      end,
      vi.fn(),
    );

    expect(result).toEqual({
      "pkg-solo": [{ day: "2024-01-03", downloads: 42 }],
    });
  });

  it("retries on a 503 then succeeds", async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response("temp", { status: 503 }))
      .mockResolvedValueOnce(
        Response.json(
          {
            "pkg-a": {
              package: "pkg-a",
              start: "2024-01-01",
              end: "2024-01-10",
              downloads: [],
            },
          },
          { status: 200 },
        ),
      );

    const result = await fetchAllDownloads(
      buildPackages(["pkg-a"]),
      start,
      end,
      vi.fn(),
    );
    expect(result).toEqual({ "pkg-a": [] });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After in seconds when retrying", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response("429", {
          status: 429,
          headers: { "retry-after": "0.1" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            "pkg-a": {
              package: "pkg-a",
              start: "2024-01-01",
              end: "2024-01-10",
              downloads: [],
            },
          },
          { status: 200 },
        ),
      );

    await fetchAllDownloads(buildPackages(["pkg-a"]), start, end, vi.fn());
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After as an HTTP-date when retrying", async () => {
    const future = new Date(Date.now() + 50).toUTCString();
    fetchSpy
      .mockResolvedValueOnce(
        new Response("429", {
          status: 429,
          headers: { "retry-after": future },
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            "pkg-a": {
              package: "pkg-a",
              start: "2024-01-01",
              end: "2024-01-10",
              downloads: [],
            },
          },
          { status: 200 },
        ),
      );

    await fetchAllDownloads(buildPackages(["pkg-a"]), start, end, vi.fn());
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("falls back to an empty result when all retries are exhausted", async () => {
    // 5 attempts (MAX_DOWNLOAD_RETRIES = 4 + initial) of 503, then per-package
    // failure also returns empty (single package can't bisect further).
    fetchSpy.mockResolvedValue(new Response("err", { status: 503 }));

    const result = await fetchAllDownloads(
      buildPackages(["pkg-a"]),
      start,
      end,
      vi.fn(),
    );
    expect(result).toEqual({});
  });

  it("returns empty for a non-retryable non-400 status (silently ignored)", async () => {
    fetchSpy.mockResolvedValue(new Response("oops", { status: 418 }));
    const result = await fetchAllDownloads(
      buildPackages(["pkg-a"]),
      start,
      end,
      vi.fn(),
    );
    expect(result).toEqual({});
  });

  it("bisects a batch on 400 and isolates the failing package", async () => {
    let call = 0;
    fetchSpy.mockImplementation((url: unknown) => {
      call += 1;
      const u = String(url);
      // First bulk request for both packages → 400
      if (call === 1) {
        expect(u).toContain("pkg-a");
        expect(u).toContain("pkg-bad");
        return Promise.resolve(new Response("bad", { status: 400 }));
      }
      // Bisected: pkg-a succeeds
      if (u.endsWith("/pkg-a")) {
        return Promise.resolve(
          Response.json(
            {
              package: "pkg-a",
              start: "2024-01-01",
              end: "2024-01-10",
              downloads: [{ day: "2024-01-01", downloads: 9 }],
            },
            { status: 200 },
          ),
        );
      }
      // Bisected: pkg-bad fails with 400 → dropped
      return Promise.resolve(new Response("bad", { status: 400 }));
    });

    const result = await fetchAllDownloads(
      buildPackages(["pkg-a", "pkg-bad"]),
      start,
      end,
      vi.fn(),
    );
    expect(result["pkg-a"]).toEqual([{ day: "2024-01-01", downloads: 9 }]);
    expect(result["pkg-bad"]).toBeUndefined();
  });

  it("reports progress for each completed batch (multi-batch)", async () => {
    // 25 packages → 2 batches (size 20 + size 5).
    const names = Array.from({ length: 25 }, (_, i) => `pkg-${String(i)}`);
    fetchSpy.mockImplementation(() =>
      Promise.resolve(Response.json({}, { status: 200 })),
    );
    const onBatchDone = vi.fn<OnBatchDone>();
    await fetchAllDownloads(buildPackages(names), start, end, onBatchDone);
    expect(onBatchDone).toHaveBeenCalledTimes(2);
    expect(onBatchDone).toHaveBeenNthCalledWith(1, 20, 25);
    expect(onBatchDone).toHaveBeenNthCalledWith(2, 25, 25);
  });

  it("returns an empty object for an empty package list", async () => {
    const result = await fetchAllDownloads([], start, end, vi.fn());
    expect(result).toEqual({});
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
