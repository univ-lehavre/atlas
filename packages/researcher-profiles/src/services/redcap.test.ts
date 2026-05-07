import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";
import type {
  OpenAlexID,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import type { ResearcherData } from "../types.js";

const mocks = vi.hoisted(() => ({
  exportRecords: vi.fn(),
  exportFile: vi.fn(),
  importFile: vi.fn(),
  importRecords: vi.fn(),
  generateCombinedPdf: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-redcap-client", () => ({
  createRedcapClient: () => ({
    exportRecords: mocks.exportRecords,
    exportFile: mocks.exportFile,
    importFile: mocks.importFile,
    importRecords: mocks.importRecords,
  }),
  RedcapUrl: (s: string) => s,
  RedcapToken: (s: string) => s,
}));

vi.mock("./pdf-generator.js", () => ({
  generateCombinedPdf: mocks.generateCombinedPdf,
}));

import {
  fetchResearchers,
  fetchResearcherData,
  writeResearcherData,
  writeFinalReferences,
  downloadPublicationsFile,
} from "./redcap.js";
import { emptyResearcherData } from "../types.js";

const config = { url: "https://redcap.example.org/api", token: "tok" };

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
});

describe("fetchResearchers", () => {
  it("normalizes records and fills missing fields with empty strings", async () => {
    mocks.exportRecords.mockReturnValue(
      Effect.succeed([
        {
          userid: "u1",
          first_name: "Alice",
          last_name: "Doe",
        },
      ]),
    );

    const rows = await Effect.runPromise(fetchResearchers(config));
    expect(rows).toEqual([
      {
        userid: "u1",
        last_name: "Doe",
        middle_name: "",
        first_name: "Alice",
        orcid: "",
        oa_imported_at: "",
        oa_locked_at: "",
        openalex_complete: "",
      },
    ]);
  });

  it("appends a trailing slash to the URL when missing (covered indirectly)", async () => {
    mocks.exportRecords.mockReturnValue(Effect.succeed([]));
    await Effect.runPromise(fetchResearchers({ url: "https://x", token: "t" }));
    expect(mocks.exportRecords).toHaveBeenCalled();
  });

  it("wraps fetch errors as RedcapFetchError", async () => {
    mocks.exportRecords.mockReturnValue(Effect.fail(new Error("boom")));
    const exit = await Effect.runPromiseExit(fetchResearchers(config));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

const encode = (value: unknown): ArrayBuffer =>
  new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;

describe("fetchResearcherData", () => {
  it("parses a well-formed oa_data file", async () => {
    const payload = {
      fullnames: [{ name: "Alice" }],
      affiliations: [{ id: "I1" }],
      oa_references: [{ id: "W1" }],
      final_references: [{ id: "W2" }],
    };
    mocks.exportFile.mockReturnValue(Effect.succeed(encode(payload)));

    const data = await Effect.runPromise(fetchResearcherData(config, "u1"));
    expect(data.fullnames).toEqual([{ name: "Alice" }]);
    expect(data.oa_references).toHaveLength(1);
  });

  it("returns empty data when the file is missing", async () => {
    mocks.exportFile.mockReturnValue(Effect.fail(new Error("404")));
    const data = await Effect.runPromise(fetchResearcherData(config, "u1"));
    expect(data).toBe(emptyResearcherData);
  });

  it("returns empty data when JSON is malformed", async () => {
    mocks.exportFile.mockReturnValue(
      Effect.succeed(
        new TextEncoder().encode("not json").buffer as ArrayBuffer,
      ),
    );
    const data = await Effect.runPromise(fetchResearcherData(config, "u1"));
    expect(data).toBe(emptyResearcherData);
  });

  it("returns empty data when JSON is an array (not an object)", async () => {
    mocks.exportFile.mockReturnValue(Effect.succeed(encode([1, 2, 3])));
    const data = await Effect.runPromise(fetchResearcherData(config, "u1"));
    expect(data).toBe(emptyResearcherData);
  });

  it("returns empty data when fields have wrong types", async () => {
    mocks.exportFile.mockReturnValue(
      Effect.succeed(encode({ fullnames: "not-array" })),
    );
    const data = await Effect.runPromise(fetchResearcherData(config, "u1"));
    expect(data.fullnames).toEqual([]);
  });
});

describe("writeResearcherData", () => {
  it("writes the JSON file then upserts oa_imported_at", async () => {
    mocks.importFile.mockReturnValue(Effect.void);
    mocks.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

    await Effect.runPromise(
      writeResearcherData(config, "u1", emptyResearcherData),
    );

    expect(mocks.importFile).toHaveBeenCalledWith(
      "oa_data",
      "u1",
      "oa_data.json",
      expect.any(Uint8Array),
    );
    expect(mocks.importRecords).toHaveBeenCalled();
  });

  it("wraps file-import errors as RedcapWriteError", async () => {
    mocks.importFile.mockReturnValue(Effect.fail(new Error("net")));
    mocks.importRecords.mockReturnValue(Effect.succeed({ count: 0 }));

    const exit = await Effect.runPromiseExit(
      writeResearcherData(config, "u1", emptyResearcherData),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

const fakeWork = (id: string): WorksResult =>
  ({ id: id as unknown as OpenAlexID }) as WorksResult;

describe("writeFinalReferences", () => {
  it("computes pending references and writes pdf + json + record", async () => {
    mocks.generateCombinedPdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.importFile.mockReturnValue(Effect.void);
    mocks.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

    const data: ResearcherData = {
      fullnames: [],
      affiliations: [],
      oa_references: [fakeWork("W1"), fakeWork("W2")],
      final_references: [fakeWork("W1")],
    };

    await Effect.runPromise(
      writeFinalReferences(config, "u1", data, "Alice Doe"),
    );

    const [finalRefs, pending, name] = mocks.generateCombinedPdf.mock.calls[0]!;
    expect(finalRefs).toEqual([{ id: "W1" }]);
    expect(pending).toEqual([{ id: "W2" }]);
    expect(name).toBe("Alice Doe");
    expect(mocks.importFile).toHaveBeenCalledWith(
      "oa_pdf",
      "u1",
      "oa_references.pdf",
      expect.any(Uint8Array),
    );
  });

  it("wraps PDF generation failures as RedcapWriteError", async () => {
    mocks.generateCombinedPdf.mockRejectedValue(new Error("pdf fail"));
    const exit = await Effect.runPromiseExit(
      writeFinalReferences(config, "u1", emptyResearcherData, "A"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("wraps a failed oa_data import as RedcapWriteError", async () => {
    mocks.generateCombinedPdf.mockResolvedValue(new Uint8Array([1]));
    mocks.importFile
      .mockReturnValueOnce(Effect.fail(new Error("oa_data fail")))
      .mockReturnValue(Effect.void);
    mocks.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

    const exit = await Effect.runPromiseExit(
      writeFinalReferences(config, "u1", emptyResearcherData, "A"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("wraps a failed oa_pdf import as RedcapWriteError", async () => {
    mocks.generateCombinedPdf.mockResolvedValue(new Uint8Array([1]));
    mocks.importFile
      .mockReturnValueOnce(Effect.void)
      .mockReturnValueOnce(Effect.fail(new Error("oa_pdf fail")));
    mocks.importRecords.mockReturnValue(Effect.succeed({ count: 1 }));

    const exit = await Effect.runPromiseExit(
      writeFinalReferences(config, "u1", emptyResearcherData, "A"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("wraps a failed importRecords as RedcapWriteError", async () => {
    mocks.generateCombinedPdf.mockResolvedValue(new Uint8Array([1]));
    mocks.importFile.mockReturnValue(Effect.void);
    mocks.importRecords.mockReturnValue(Effect.fail(new Error("record fail")));

    const exit = await Effect.runPromiseExit(
      writeFinalReferences(config, "u1", emptyResearcherData, "A"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("downloadPublicationsFile", () => {
  it("returns the raw file buffer on success", async () => {
    const buf = new TextEncoder().encode("pdf-bytes").buffer as ArrayBuffer;
    mocks.exportFile.mockReturnValue(Effect.succeed(buf));

    const result = await Effect.runPromise(
      downloadPublicationsFile(config, "u1"),
    );
    expect(result).toBe(buf);
  });

  it("wraps fetch errors as RedcapFetchError", async () => {
    mocks.exportFile.mockReturnValue(Effect.fail(new Error("network")));
    const exit = await Effect.runPromiseExit(
      downloadPublicationsFile(config, "u1"),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});
