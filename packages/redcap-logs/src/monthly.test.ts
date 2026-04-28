import { describe, it, expect } from "vitest";
import { computeCalendar, computeMonthlyCalendar } from "./monthly.js";
import type { RedcapLogEntry } from "./types.js";

const makeEntry = (
  overrides: Partial<RedcapLogEntry> = {},
): RedcapLogEntry => ({
  project_id: 1,
  timestamp: new Date("2024-03-15T10:00:00Z"),
  username: "alice",
  action: "Enregistrement créé",
  user_type: "loggé",
  action_category: "Enregistrements",
  ...overrides,
});

describe("computeMonthlyCalendar", () => {
  it("returns empty array for no entries", () => {
    expect(computeMonthlyCalendar([])).toEqual([]);
  });

  it("groups entries by month", () => {
    const entries = [
      makeEntry({ timestamp: new Date("2024-01-10") }),
      makeEntry({ timestamp: new Date("2024-01-20") }),
      makeEntry({ timestamp: new Date("2024-02-05") }),
    ];
    const result = computeMonthlyCalendar(entries);
    expect(result).toHaveLength(2);
  });

  it("counts distinct logged users", () => {
    const entries = [
      makeEntry({ username: "alice", user_type: "loggé" }),
      makeEntry({ username: "alice", user_type: "loggé" }),
      makeEntry({ username: "bob", user_type: "loggé" }),
    ];
    const [point] = computeMonthlyCalendar(entries);
    expect(point?.users_logged).toBe(2);
  });

  it("counts enquêté users via surveyed module", () => {
    const entries = [
      makeEntry({
        user_type: "enquêté",
        action: "Réponse créée rec-1",
        username: "survey",
      }),
    ];
    const [point] = computeMonthlyCalendar(entries);
    expect(point?.users_surveyed).toBeGreaterThanOrEqual(1);
  });

  it("counts distinct projects", () => {
    const entries = [
      makeEntry({ project_id: 1 }),
      makeEntry({ project_id: 1 }),
      makeEntry({ project_id: 2 }),
    ];
    const [point] = computeMonthlyCalendar(entries);
    expect(point?.projects_active).toBe(2);
  });

  it("counts action categories", () => {
    const entries = [
      makeEntry({ action_category: "Enregistrements" }),
      makeEntry({ action_category: "Questionnaires" }),
      makeEntry({ action_category: "Fichiers" }),
      makeEntry({ action_category: "Projet" }),
      makeEntry({ action_category: "Utilisateurs" }),
      makeEntry({ action_category: "API" }),
      makeEntry({ action_category: "Authentification" }),
      makeEntry({ action_category: "Autre" }),
    ];
    const [point] = computeMonthlyCalendar(entries);
    expect(point?.actions_records).toBe(1);
    expect(point?.actions_surveys).toBe(1);
    expect(point?.actions_files).toBe(1);
    expect(point?.actions_project).toBe(1);
    expect(point?.actions_users).toBe(1);
    expect(point?.actions_api).toBe(1);
    expect(point?.actions_auth).toBe(1);
    expect(point?.actions_other).toBe(1);
    expect(point?.actions_total).toBe(8);
  });
});

describe("computeCalendar granularity", () => {
  it("groups by day", () => {
    const entries = [
      makeEntry({ timestamp: new Date("2024-03-15") }),
      makeEntry({ timestamp: new Date("2024-03-16") }),
    ];
    expect(computeCalendar("day", entries)).toHaveLength(2);
  });

  it("groups by week", () => {
    const entries = [
      makeEntry({ timestamp: new Date("2024-03-11") }),
      makeEntry({ timestamp: new Date("2024-03-13") }),
      makeEntry({ timestamp: new Date("2024-03-25") }),
    ];
    const result = computeCalendar("week", entries);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("groups by quarter", () => {
    const entries = [
      makeEntry({ timestamp: new Date("2024-01-10") }),
      makeEntry({ timestamp: new Date("2024-04-05") }),
    ];
    expect(computeCalendar("quarter", entries)).toHaveLength(2);
  });

  it("sorts results by date ascending", () => {
    const entries = [
      makeEntry({ timestamp: new Date("2024-03-01") }),
      makeEntry({ timestamp: new Date("2024-01-01") }),
    ];
    const result = computeMonthlyCalendar(entries);
    expect(result[0]?.date.getTime()).toBeLessThan(
      result[1]?.date.getTime() ?? Infinity,
    );
  });
});
