import { describe, expect, it } from "vitest";
import { applySecurityHeaders, SECURITY_HEADERS } from "./security-headers.js";

const eventAt = (url: string) => ({ url: new URL(url) });

describe("applySecurityHeaders", () => {
  it("sets the static security headers shared by every app", () => {
    const response = new Response("ok", { status: 200 });
    applySecurityHeaders(response, eventAt("https://app.example.org/"));

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("permissions-policy")).toContain(
      "microphone=()",
    );
    expect(response.headers.get("permissions-policy")).toContain(
      "geolocation=()",
    );
    expect(response.headers.get("permissions-policy")).toContain("payment=()");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("sets Strict-Transport-Security only on https:// requests", () => {
    const httpsResponse = new Response("ok");
    applySecurityHeaders(httpsResponse, eventAt("https://app.example.org/"));
    expect(httpsResponse.headers.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );

    const httpResponse = new Response("ok");
    applySecurityHeaders(httpResponse, eventAt("http://localhost:5173/"));
    expect(httpResponse.headers.get("strict-transport-security")).toBeNull();
  });

  it("returns the same response instance so the helper can be chained", () => {
    const response = new Response("ok");
    const returned = applySecurityHeaders(
      response,
      eventAt("https://app.example.org/"),
    );
    expect(returned).toBe(response);
  });

  it("exposes the raw header values for tests and manual overrides", () => {
    expect(SECURITY_HEADERS.xContentTypeOptions).toBe("nosniff");
    expect(SECURITY_HEADERS.xFrameOptions).toBe("DENY");
    expect(SECURITY_HEADERS.strictTransportSecurity).toMatch(/max-age=\d+/u);
  });
});
