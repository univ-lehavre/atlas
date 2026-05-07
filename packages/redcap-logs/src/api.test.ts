import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchProjectLogs } from "./api.js";

const noop = (): void => {
  /* test stub */
};

const apiUrl = "https://redcap.example.org/api/";
const projectToken = { project_id: 42, token: "secret-token" };

const mockResponse = (init: {
  ok: boolean;
  status?: number;
  statusText?: string;
  text?: string;
}): Response =>
  ({
    ok: init.ok,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    text: () => Promise.resolve(init.text ?? ""),
  }) as Response;

describe("fetchProjectLogs", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    errorSpy = vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns enriched logs on a successful JSON array response", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        text: JSON.stringify([
          {
            timestamp: "2024-01-01T00:00:00Z",
            username: "alice",
            action: "Login",
          },
          {
            timestamp: "2024-01-02T00:00:00Z",
            username: "bob",
            action: "Edit",
          },
        ]),
      }),
    );

    const result = await fetchProjectLogs(apiUrl, projectToken);

    expect(result).toEqual([
      {
        project_id: 42,
        timestamp: "2024-01-01T00:00:00Z",
        username: "alice",
        action: "Login",
      },
      {
        project_id: 42,
        timestamp: "2024-01-02T00:00:00Z",
        username: "bob",
        action: "Edit",
      },
    ]);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0]!;
    expect(call[0]).toBe(apiUrl);
    expect(call[1]?.method).toBe("POST");
    const body = call[1]?.body as URLSearchParams;
    expect(body.get("token")).toBe("secret-token");
    expect(body.get("content")).toBe("log");
    expect(body.get("format")).toBe("json");
  });

  it("returns empty array and logs when JSON is invalid", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ ok: true, text: "not-json" }),
    );

    const result = await fetchProjectLogs(apiUrl, projectToken);

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid JSON"),
    );
  });

  it("returns empty array and logs when response is a non-array object", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({ ok: true, text: JSON.stringify({ error: "boom" }) }),
    );

    const result = await fetchProjectLogs(apiUrl, projectToken);

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("unexpected response"),
    );
  });

  it("returns empty array and logs when HTTP response is not ok", async () => {
    fetchSpy.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    const result = await fetchProjectLogs(apiUrl, projectToken);

    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("HTTP 503"));
  });
});
