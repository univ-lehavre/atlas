import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchReleases } from "./github.js";

describe("fetchReleases", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("calls the GitHub releases API with auth headers", async () => {
    fetchSpy.mockResolvedValue(Response.json([], { status: 200 }));
    await fetchReleases("tok-123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(
      "https://api.github.com/repos/univ-lehavre/atlas/releases?per_page=100",
    );
    expect(init.headers["Authorization"]).toBe("Bearer tok-123");
    expect(init.headers["Accept"]).toBe("application/vnd.github+json");
    expect(init.headers["X-GitHub-Api-Version"]).toBe("2022-11-28");
  });

  it("returns only tag_name and published_at from each release", async () => {
    fetchSpy.mockResolvedValue(
      Response.json(
        [
          { tag_name: "v1", published_at: "2024-01-01", extra: "x" },
          { tag_name: "v2", published_at: "2024-02-01" },
        ],
        { status: 200 },
      ),
    );
    const releases = await fetchReleases("tok");
    expect(releases).toEqual([
      { tag_name: "v1", published_at: "2024-01-01" },
      { tag_name: "v2", published_at: "2024-02-01" },
    ]);
  });

  it("throws when the GitHub API responds with an error status", async () => {
    fetchSpy.mockResolvedValue(new Response("rate limited", { status: 403 }));
    await expect(fetchReleases("tok")).rejects.toThrow(
      /GitHub API 403: rate limited/,
    );
  });

  it("returns an empty array when no releases are present", async () => {
    fetchSpy.mockResolvedValue(Response.json([], { status: 200 }));
    await expect(fetchReleases("tok")).resolves.toEqual([]);
  });
});
