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
  multiselect: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock("@univ-lehavre/atlas-researcher-profiles", () => ({
  resolveAuthors: vi.fn(),
  fetchWorksForAuthors: vi.fn(),
  writeResearcherData: vi.fn(),
  fetchResearcherData: vi.fn(),
  daysUntilNextUpdate: vi.fn(),
}));

import { multiselect, isCancel } from "@clack/prompts";
import {
  resolveAuthors,
  fetchWorksForAuthors,
  writeResearcherData,
  fetchResearcherData,
  daysUntilNextUpdate,
} from "@univ-lehavre/atlas-researcher-profiles";
import { processRow } from "./process-row.js";

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

const crfConfig = { url: "http://x", token: "tok" };
const citationConfig = { userAgent: "ua" };

describe("processRow", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(daysUntilNextUpdate).mockReturnValue(null);
    vi.mocked(isCancel).mockReturnValue(false);
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
      processRow(
        row({ oa_locked_at: "2024-01-01" }),
        crfConfig,
        citationConfig,
      ),
    ).rejects.toThrow("__exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fetchResearcherData).not.toHaveBeenCalled();
  });

  it("returns 'error' when fetchResearcherData fails", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.fail(new Error("boom")) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("error");
    expect(resolveAuthors).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when data is fresh but no stored author IDs exist", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(daysUntilNextUpdate).mockReturnValue(5);

    const result = await processRow(
      row({ oa_imported_at: "2024-01-01" }),
      crfConfig,
      citationConfig,
    );

    expect(result).toBe("skipped");
    expect(resolveAuthors).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when data is fresh and stored author IDs exist", async () => {
    const data: ResearcherData = {
      ...emptyData,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(data) as never,
    );
    vi.mocked(daysUntilNextUpdate).mockReturnValue(5);

    const result = await processRow(
      row({ oa_imported_at: "2024-01-01" }),
      crfConfig,
      citationConfig,
    );

    expect(result).toBe("skipped");
    // resolveAuthors not called for fresh data
    expect(resolveAuthors).not.toHaveBeenCalled();
    // writeResearcherData not called for fresh data
    expect(writeResearcherData).not.toHaveBeenCalled();
  });

  it("returns 'error' when resolveAuthors fails", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.fail(new Error("oa down")) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("error");
    expect(fetchWorksForAuthors).not.toHaveBeenCalled();
  });

  it("returns 'skipped' when resolveAuthors finds no authors", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({ byName: [], byOrcid: [], unique: [] }) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("skipped");
    expect(fetchWorksForAuthors).not.toHaveBeenCalled();
  });

  it("returns 'error' when fetchWorksForAuthors fails", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.fail(new Error("works fail")) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("error");
  });

  it("returns 'skipped' when multiselect is cancelled", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.succeed([
        {
          id: "W1",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ]) as never,
    );
    vi.mocked(multiselect).mockResolvedValue(Symbol("cancel") as never);
    vi.mocked(isCancel).mockReturnValue(true);

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("skipped");
    expect(writeResearcherData).not.toHaveBeenCalled();
  });

  it("returns 'ok' in batch mode with happy path", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.succeed([
        {
          id: "W1",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [{ id: "I1", display_name: "Lab" }],
            },
          ],
        },
      ]) as never,
    );
    vi.mocked(writeResearcherData).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await processRow(
      row(),
      crfConfig,
      citationConfig,
      undefined,
      true,
    );

    expect(result).toBe("ok");
    expect(multiselect).not.toHaveBeenCalled();
    expect(writeResearcherData).toHaveBeenCalledTimes(1);
  });

  it("returns 'ok' with interactive multiselect when not batch", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.succeed([
        {
          id: "W1",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [{ id: "I1", display_name: "Lab" }],
            },
          ],
        },
      ]) as never,
    );
    vi.mocked(multiselect).mockResolvedValue(["Jane Doe"] as never);
    vi.mocked(writeResearcherData).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("ok");
    expect(multiselect).toHaveBeenCalledTimes(1);
    expect(writeResearcherData).toHaveBeenCalledTimes(1);
  });

  it("returns 'error' when writeResearcherData fails", async () => {
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(emptyData) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.succeed([
        {
          id: "W1",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ]) as never,
    );
    vi.mocked(writeResearcherData).mockReturnValue(
      Effect.fail(new Error("write fail")) as never,
    );

    const result = await processRow(
      row(),
      crfConfig,
      citationConfig,
      undefined,
      true,
    );

    expect(result).toBe("error");
  });

  it("reuses existing fullnames when all names already known", async () => {
    const existing: ResearcherData = {
      ...emptyData,
      fullnames: [{ name: "Jane Doe", authorId: "A1", selected: true }],
    };
    vi.mocked(fetchResearcherData).mockReturnValue(
      Effect.succeed(existing) as never,
    );
    vi.mocked(resolveAuthors).mockReturnValue(
      Effect.succeed({
        byName: [{ id: "A1" }],
        byOrcid: [],
        unique: [{ id: "A1" }],
      }) as never,
    );
    vi.mocked(fetchWorksForAuthors).mockReturnValue(
      Effect.succeed([
        {
          id: "W1",
          authorships: [
            {
              author: { id: "A1" },
              raw_author_name: "Jane Doe",
              institutions: [],
            },
          ],
        },
      ]) as never,
    );
    vi.mocked(writeResearcherData).mockReturnValue(
      Effect.succeed(undefined as never) as never,
    );

    const result = await processRow(row(), crfConfig, citationConfig);

    expect(result).toBe("ok");
    // No multiselect because no NEW names
    expect(multiselect).not.toHaveBeenCalled();
  });
});
