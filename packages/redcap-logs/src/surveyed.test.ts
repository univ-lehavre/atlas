import { describe, it, expect } from "vitest";
import { countDistinctSurveyed } from "./surveyed.js";
import type { RedcapLogEntry } from "./types.js";

const makeEntry = (
  overrides: Partial<RedcapLogEntry> = {},
): RedcapLogEntry => ({
  project_id: 1,
  timestamp: new Date("2024-01-01"),
  username: "user1",
  action: "Enregistrement créé",
  user_type: "loggé",
  action_category: "Enregistrements",
  ...overrides,
});

describe("countDistinctSurveyed", () => {
  it("returns 0 for empty entries", () => {
    expect(countDistinctSurveyed([])).toBe(0);
  });

  it("returns 0 when no enquêté entries", () => {
    expect(countDistinctSurveyed([makeEntry({ user_type: "loggé" })])).toBe(0);
  });

  it("extracts respondent id from 'reponse mise a jour' action", () => {
    const entry = makeEntry({
      user_type: "enquêté",
      action: "Réponse mise à jour abc-123",
    });
    expect(countDistinctSurveyed([entry])).toBe(1);
  });

  it("extracts respondent id from 'enreg.' short form", () => {
    const entry = makeEntry({
      user_type: "enquêté",
      action: "Enreg. rec-42 modifié",
    });
    expect(countDistinctSurveyed([entry])).toBe(1);
  });

  it("extracts respondent id from full 'enregistrement' form", () => {
    const entry = makeEntry({
      user_type: "enquêté",
      action: "Enregistrement rec-99 créé",
    });
    expect(countDistinctSurveyed([entry])).toBe(1);
  });

  it("falls back to username when no id found in action", () => {
    const entry = makeEntry({
      user_type: "enquêté",
      username: "survey-user",
      action: "Quelque chose sans id connu",
    });
    expect(countDistinctSurveyed([entry])).toBe(1);
  });

  it("deduplicates by extracted id", () => {
    const entries = [
      makeEntry({ user_type: "enquêté", action: "Réponse créée abc-1" }),
      makeEntry({
        user_type: "enquêté",
        action: "Réponse mise à jour abc-1",
      }),
      makeEntry({ user_type: "enquêté", action: "Réponse créée abc-2" }),
    ];
    expect(countDistinctSurveyed(entries)).toBe(2);
  });

  it("deduplicates by username fallback", () => {
    const entries = [
      makeEntry({
        user_type: "enquêté",
        username: "anon",
        action: "action sans id",
      }),
      makeEntry({
        user_type: "enquêté",
        username: "anon",
        action: "autre action",
      }),
    ];
    expect(countDistinctSurveyed(entries)).toBe(1);
  });
});
