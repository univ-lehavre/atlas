import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";
import type {
  ResearcherRow,
  ResearcherData,
} from "@univ-lehavre/atlas-researcher-profiles";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("@univ-lehavre/atlas-researcher-profiles", () => ({
  fetchResearcherData: vi.fn(),
  writeFinalReferences: vi.fn(),
  downloadPublicationsFile: vi.fn(),
  extractText: vi.fn(),
  matchReferences: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-citation-fetch", () => ({
  searchWorksByDOI: vi.fn(),
}));

import {
  fetchResearcherData,
  writeFinalReferences,
  downloadPublicationsFile,
  extractText,
  matchReferences,
} from "@univ-lehavre/atlas-researcher-profiles";
import { searchWorksByDOI } from "@univ-lehavre/atlas-citation-fetch";
import { matchRow } from "./match-row.js";

const row = (overrides: Partial<ResearcherRow> = {}): ResearcherRow => ({
  userid: "u1",
  last_name: "Doe",
  middle_name: "",
  first_name: "Jane",
  orcid: "",
  oa_imported_at: "",
  oa_locked_at: "",
  openalex_complete: "0",
  ...overrides,
});

const emptyData: ResearcherData = {
  fullnames: [],
  affiliations: [],
  oa_references: [],
  final_references: [],
};

const baseConfig = {
  redcap: { url: "http://x", token: "tok" },
  openAlex: { userAgent: "ua" },
  threshold: 0.2,
};

describe("matchRow", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      _code?: number,
    ) => {
      throw new Error("__exit__");
    }) as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("exits when researcher is locked", async () => {
    await expect(
      matchRow(row({ oa_locked_at: "2024-01-01" }), baseConfig),
    ).rejects.toThrow("__exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fetchResearcherData).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when fetchResearcherData fails", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.fail(new Error("boom")) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
  });

  it("returns 'skipped' when oa_references is empty", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(downloadPublicationsFile).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when no names are selected", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [{ id: "W1", doi: "10.x/y" }] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: false }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(downloadPublicationsFile).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when publications file download fails", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.fail(new Error("no file")) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(extractText).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when text extraction fails", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    vi.mocked(extractText).mockReturnValue(
      Effect.fail({ cause: new Error("bad pdf") }) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(matchReferences).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when extracted text is too short", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    vi.mocked(extractText).mockReturnValue(Effect.succeed("tiny") as never);

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(matchReferences).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when no fuzzy or DOI matches are found", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    const longText = "x".repeat(200);
    vi.mocked(extractText).mockReturnValue(Effect.succeed(longText) as never);
    vi.mocked(matchReferences).mockReturnValue([]);

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("skipped");
    expect(writeFinalReferences).not.toHaveBeenCalled();
  });

  it("returns 'ok' on full happy path with fuzzy match", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1", display_name: "Jane Doe" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    const longText = "no doi here ".repeat(20);
    vi.mocked(extractText).mockReturnValue(Effect.succeed(longText) as never);
    vi.mocked(matchReferences).mockReturnValue([
      { work: { id: "W1", doi: "10.x/y" } } as never,
    ]);
    vi.mocked(writeFinalReferences).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("ok");
    expect(writeFinalReferences).toHaveBeenCalledTimes(1);
  });

  it("returns 'error' when writeFinalReferences fails", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1", display_name: "Jane Doe" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    const longText = "x".repeat(200);
    vi.mocked(extractText).mockReturnValue(Effect.succeed(longText) as never);
    vi.mocked(matchReferences).mockReturnValue([
      { work: { id: "W1", doi: "10.x/y" } } as never,
    ]);
    vi.mocked(writeFinalReferences).mockReturnValue(
      Effect.fail({
        userid: "u1",
        _tag: "CrfWriteError",
        cause: new Error("write fail"),
      }) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("error");
  });

  it("fetches missing DOIs from OpenAlex when text contains unknown DOIs", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/known",
          authorships: [
            {
              author: { id: "A1", display_name: "Jane Doe" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    const longText =
      "Some paper mentions DOI 10.1234/unknown.doi and also more text. ".repeat(
        5,
      );
    vi.mocked(extractText).mockReturnValue(Effect.succeed(longText) as never);
    vi.mocked(matchReferences).mockReturnValue([]);
    vi.mocked(searchWorksByDOI).mockReturnValue(
      Effect.succeed([
        { id: "W2", doi: "10.1234/unknown.doi" } as never,
      ]) as never,
    );
    vi.mocked(writeFinalReferences).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("ok");
    expect(searchWorksByDOI).toHaveBeenCalledTimes(1);
    expect(writeFinalReferences).toHaveBeenCalledTimes(1);
  });

  it("applies affiliation filter when affiliations are selected", async () => {
    const data: ResearcherData = {
      ...emptyData,
      oa_references: [
        {
          id: "W1",
          doi: "10.x/y",
          authorships: [
            {
              author: { id: "A1", display_name: "Jane Doe" },
              raw_author_name: "Jane Doe",
              institutions: [{ id: "I1" }],
            },
          ],
        },
        {
          id: "W2",
          doi: "10.x/z",
          authorships: [
            {
              author: { id: "A1", display_name: "Jane Doe" },
              raw_author_name: "Jane Doe",
              institutions: [{ id: "I2" }],
            },
          ],
        },
      ] as never,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
      affiliations: [{ affiliation: "I1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(downloadPublicationsFile).mockReturnValue(
      Effect.succeed(new ArrayBuffer(8)) as never,
    );
    const longText = "x".repeat(200);
    vi.mocked(extractText).mockReturnValue(Effect.succeed(longText) as never);
    vi.mocked(matchReferences).mockReturnValue([
      { work: { id: "W1", doi: "10.x/y" } } as never,
    ]);
    vi.mocked(writeFinalReferences).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await matchRow(row(), baseConfig);

    expect(result).toBe("ok");
    // matchReferences should be called with only the work that matches the
    // selected affiliation (W1).
    const calledWith = vi.mocked(matchReferences).mock.calls[0]?.[0];
    expect(calledWith).toHaveLength(1);
  });
});
