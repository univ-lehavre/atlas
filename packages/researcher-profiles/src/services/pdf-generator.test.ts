import { describe, it, expect } from "vitest";
import { generateCombinedPdf } from "./pdf-generator.js";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import type {
  CitationID,
  WorksResult,
} from "@univ-lehavre/atlas-citation-types";

const fakeOpenAlexId = (id: string): CitationID => id as unknown as CitationID;

const work = (overrides: Partial<WorksResult> = {}): WorksResult =>
  ({
    id: fakeOpenAlexId("W1"),
    title: "Sample paper",
    display_name: "Sample paper",
    publication_year: 2024,
    doi: "10.1234/foo",
    authorships: [
      {
        author: { id: "A1", display_name: "Alice Doe" },
      },
      {
        author: { id: "A2", display_name: "Bob" },
      },
    ],
    ...overrides,
  }) as unknown as WorksResult;

const isValidPdf = async (bytes: Uint8Array): Promise<boolean> => {
  try {
    await PDFLibDocument.load(bytes);
    return true;
  } catch {
    return false;
  }
};

describe("generateCombinedPdf", () => {
  it("produces a parseable PDF for empty inputs", async () => {
    const bytes = await generateCombinedPdf([], [], "Test Researcher");
    expect(await isValidPdf(bytes)).toBe(true);
  }, 15_000);

  it("renders both verified and pending sections", async () => {
    const bytes = await generateCombinedPdf(
      [work({ id: fakeOpenAlexId("W-final") })],
      [work({ id: fakeOpenAlexId("W-pending"), publication_year: 0 })],
      "Researcher A",
    );
    expect(await isValidPdf(bytes)).toBe(true);
  }, 15_000);

  it("merges a debug appendix when debugInfo is provided", async () => {
    const debugInfo = {
      authorProfiles: [
        { id: "A1", display_name: "Alice Doe", selected: true },
        { id: "A2", display_name: "Other", selected: false },
      ],
      rawAuthorNames: [
        { name: "Alice Doe", selected: true },
        { name: "Old name", selected: false },
      ],
      extractedText: "Long extracted text. ".repeat(500),
    };

    const bytes = await generateCombinedPdf(
      [work()],
      [],
      "Researcher",
      debugInfo,
    );

    const parsed = await PDFLibDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
  }, 20_000);

  it("appends the publications PDF bytes after the debug appendix", async () => {
    const refOnly = await generateCombinedPdf([work()], [], "R");
    const bytes = await generateCombinedPdf([work()], [], "R", {
      authorProfiles: [],
      rawAuthorNames: [],
      extractedText: "",
      publicationsPdfBytes: refOnly,
    });

    const parsed = await PDFLibDocument.load(bytes);
    const baseline = await PDFLibDocument.load(refOnly);
    expect(parsed.getPageCount()).toBeGreaterThan(baseline.getPageCount());
  }, 20_000);

  it("formats single-author and missing-DOI works gracefully", async () => {
    const bytes = await generateCombinedPdf(
      [
        work({
          authorships: [
            { author: { id: "A1", display_name: "OnlyOne" } },
          ] as WorksResult["authorships"],
          doi: null,
        }),
        work({
          authorships: [],
          publication_year: 0,
          title: "",
        }),
      ],
      [],
      "R",
    );
    expect(await isValidPdf(bytes)).toBe(true);
  }, 15_000);
});
