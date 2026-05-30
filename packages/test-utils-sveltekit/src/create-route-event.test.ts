import { describe, it, expect } from "vitest";
import { createRouteEvent } from "./create-route-event.js";

describe("createRouteEvent", () => {
  it("returns a default GET event when no options are given", () => {
    const event = createRouteEvent();
    expect(event.request.method).toBe("GET");
    expect(event.url.toString()).toBe("https://example.com/");
    expect(event.getClientAddress()).toBe("127.0.0.1");
    expect(event.params).toEqual({});
    expect(event.locals).toEqual({});
  });

  it("uses the provided method, URL, IP and params", () => {
    const event = createRouteEvent({
      method: "DELETE",
      url: "https://api.example.org/items/42",
      ip: "203.0.113.99",
      params: { id: "42" },
    });
    expect(event.request.method).toBe("DELETE");
    expect(event.url.pathname).toBe("/items/42");
    expect(event.getClientAddress()).toBe("203.0.113.99");
    expect(event.params).toEqual({ id: "42" });
  });

  it("serialises a JSON body and sets content-type when none is given", async () => {
    const event = createRouteEvent({
      method: "POST",
      body: { email: "a@b.fr" },
    });
    expect(event.request.headers.get("content-type")).toBe("application/json");
    await expect(event.request.json()).resolves.toEqual({ email: "a@b.fr" });
  });

  it("keeps a custom content-type header when provided", () => {
    const event = createRouteEvent({
      method: "POST",
      body: "raw=value",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(event.request.headers.get("content-type")).toBe(
      "application/x-www-form-urlencoded",
    );
  });

  it("passes a string body through verbatim", async () => {
    const event = createRouteEvent({
      method: "POST",
      body: "raw-string",
    });
    await expect(event.request.text()).resolves.toBe("raw-string");
  });

  it("does not attach a body to GET requests when none is given", () => {
    const event = createRouteEvent({ method: "GET" });
    expect(event.request.body).toBeNull();
  });

  it("preserves the locals object for handlers that read it", () => {
    const locals = { user: { id: "u1" }, sessionId: "s1" };
    const event = createRouteEvent<typeof locals>({ locals });
    expect(event.locals).toBe(locals);
  });
});
