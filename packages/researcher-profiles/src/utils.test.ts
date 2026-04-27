import { describe, expect, it } from "vitest";
import { daysUntilNextUpdate } from "./utils.js";

describe("daysUntilNextUpdate", () => {
  const now = new Date("2026-04-27T12:00:00Z");

  it("returns null when no import date is recorded", () => {
    expect(daysUntilNextUpdate("", now)).toBeNull();
  });

  it("returns null for invalid import dates", () => {
    expect(daysUntilNextUpdate("not-a-date", now)).toBeNull();
  });

  it("returns days remaining until the monthly refresh date", () => {
    expect(daysUntilNextUpdate("2026-04-20T12:00:00Z", now)).toBe(23);
  });

  it("returns null when the import is older than one month", () => {
    expect(daysUntilNextUpdate("2026-03-20T12:00:00Z", now)).toBeNull();
  });
});
