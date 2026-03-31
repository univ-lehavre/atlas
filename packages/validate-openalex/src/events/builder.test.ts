import { describe, it, expect } from "vitest";
import { buildReference } from "./builder.js";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

const makeWork = (overrides: Partial<WorksResult> = {}): WorksResult =>
  ({
    id: "W123",
    title: "Test Article Title",
    doi: "10.1234/test",
    publication_year: 2023,
    authorships: [
      { author: { id: "A1", display_name: "Alice Dupont" } },
      { author: { id: "A2", display_name: "Bob Martin" } },
    ],
    ...overrides,
  }) as unknown as WorksResult;

describe("buildReference", () => {
  it("returns short format by default: year - title", () => {
    const work = makeWork();
    expect(buildReference(work)).toBe("2023 - Test Article Title");
  });

  it("returns full format when full=true", () => {
    const work = makeWork();
    const result = buildReference(work, true);
    expect(result).toContain("Alice Dupont");
    expect(result).toContain("Bob Martin");
    expect(result).toContain("2023");
    expect(result).toContain("Test Article Title");
    expect(result).toContain("DOI: 10.1234/test");
    expect(result).toContain("OpenAlex ID: W123");
  });

  it("handles work with no authors in full format", () => {
    const work = makeWork({ authorships: [] });
    const result = buildReference(work, true);
    expect(result).toContain("Test Article Title");
    expect(result).toContain("DOI: 10.1234/test");
  });

  it("uses publication_year in short format", () => {
    const work = makeWork({ publication_year: 2020 });
    expect(buildReference(work)).toBe("2020 - Test Article Title");
  });
});
