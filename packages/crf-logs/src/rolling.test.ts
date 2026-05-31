import { describe, it, expect } from "vitest";
import { computeRollingWindow } from "./rolling.js";
import type { CrfLogEntry } from "./types.js";

const makeEntry = (
  date: string,
  overrides: Partial<CrfLogEntry> = {},
): CrfLogEntry => ({
  project_id: 1,
  timestamp: new Date(date),
  username: "alice",
  action: "Enregistrement créé",
  user_type: "loggé",
  action_category: "Enregistrements",
  ...overrides,
});

describe("computeRollingWindow", () => {
  it("returns empty array for no entries", () => {
    expect(computeRollingWindow([])).toEqual([]);
  });

  it("returns empty array when all entries are within 30 days of first", () => {
    const entries = [
      makeEntry("2024-01-01"),
      makeEntry("2024-01-15"),
      makeEntry("2024-01-29"),
    ];
    expect(computeRollingWindow(entries)).toHaveLength(0);
  });

  it("produces points after the 30-day window is crossed", () => {
    const entries = [makeEntry("2024-01-01"), makeEntry("2024-02-15")];
    const result = computeRollingWindow(entries);
    expect(result.length).toBeGreaterThan(0);
  });

  it("each point has a date", () => {
    const entries = [makeEntry("2024-01-01"), makeEntry("2024-03-01")];
    const result = computeRollingWindow(entries);
    for (const point of result) {
      expect(point.date).toBeInstanceOf(Date);
    }
  });

  it("produces a non-empty window with enough spread", () => {
    const entries = [
      makeEntry("2024-01-15T12:00:00Z", { username: "alice" }),
      makeEntry("2024-04-01T12:00:00Z", { username: "bob" }),
    ];
    const result = computeRollingWindow(entries);
    expect(result.length).toBeGreaterThan(0);
    const last = result.at(-1);
    expect(last?.actions_total).toBeGreaterThanOrEqual(0);
  });

  it("sorts output by date ascending", () => {
    const entries = [
      makeEntry("2024-01-01"),
      makeEntry("2024-04-01"),
      makeEntry("2024-02-15"),
    ];
    const result = computeRollingWindow(entries);
    for (let i = 1; i < result.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- `i` is a bounded loop counter, not user input
      expect(result[i]!.date.getTime()).toBeGreaterThanOrEqual(
        result[i - 1]!.date.getTime(),
      );
    }
  });
});
