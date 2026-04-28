import { describe, it, expect } from "vitest";
import { enrichLogs, parseTokensCsv } from "./enrich.js";
import type { RawLog } from "./api.js";

const makeRaw = (overrides: Partial<RawLog> = {}): RawLog => ({
  project_id: 1,
  timestamp: "2024-01-15T10:00:00Z",
  username: "alice",
  action: "Enregistrement créé",
  ...overrides,
});

describe("enrichLogs", () => {
  it("returns empty array for empty input", () => {
    expect(enrichLogs([])).toEqual([]);
  });

  it("parses timestamp and sets username lowercase", () => {
    const [entry] = enrichLogs([makeRaw({ username: "ALICE" })]);
    expect(entry?.username).toBe("alice");
    expect(entry?.timestamp).toBeInstanceOf(Date);
  });

  it("skips entries with invalid timestamp", () => {
    const logs = [makeRaw({ timestamp: "not-a-date" }), makeRaw()];
    expect(enrichLogs(logs)).toHaveLength(1);
  });

  it("classifies 'survey' username as enquêté", () => {
    const [entry] = enrichLogs([makeRaw({ username: "survey" })]);
    expect(entry?.user_type).toBe("enquêté");
  });

  it("classifies hex-32 username as enquêté", () => {
    const hex = "a".repeat(32);
    const [entry] = enrichLogs([makeRaw({ username: hex })]);
    expect(entry?.user_type).toBe("enquêté");
  });

  it("classifies normal username as loggé", () => {
    const [entry] = enrichLogs([makeRaw({ username: "john.doe" })]);
    expect(entry?.user_type).toBe("loggé");
  });

  it("deduplicates identical entries", () => {
    const raw = makeRaw();
    expect(enrichLogs([raw, raw])).toHaveLength(1);
  });

  it("classifies action categories correctly", () => {
    const cases: [string, string][] = [
      ["login attempt", "Authentification"],
      ["API call made", "API"],
      ["user role updated", "Utilisateurs"],
      ["project settings changed", "Projet"],
      ["survey response créée", "Questionnaires"],
      ["file upload document", "Fichiers"],
      ["record created", "Enregistrements"],
      ["some random thing", "Autre"],
    ];
    for (const [action, expected] of cases) {
      const [entry] = enrichLogs([makeRaw({ action })]);
      expect(entry?.action_category).toBe(expected);
    }
  });
});

describe("parseTokensCsv", () => {
  it("parses valid CSV", () => {
    const csv = "project_id,token\n1,abc123\n2,def456\n";
    const result = parseTokensCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ project_id: 1, token: "abc123" });
    expect(result[1]).toEqual({ project_id: 2, token: "def456" });
  });

  it("skips header row", () => {
    const csv = "project_id,token\n1,abc\n";
    expect(parseTokensCsv(csv)).toHaveLength(1);
  });

  it("skips lines with invalid project_id", () => {
    const csv = "project_id,token\nnot-a-number,abc\n1,def\n";
    const result = parseTokensCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]?.project_id).toBe(1);
  });

  it("skips lines missing token", () => {
    const csv = "project_id,token\n1\n2,ok\n";
    const result = parseTokensCsv(csv);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseTokensCsv("project_id,token\n")).toHaveLength(0);
  });
});
