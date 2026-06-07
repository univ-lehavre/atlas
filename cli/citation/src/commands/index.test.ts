import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Effect } from "effect";

// ── Mock surface ────────────────────────────────────────────────────────────

const argsState = { name: undefined as string | undefined };
vi.mock("../config/args.js", () => ({
  cmd: () => Effect.succeed({ name: argsState.name }),
}));

const promptState = {
  multipleResults: [] as Array<{ selection: string[] }>,
  selectionResults: [] as Array<{ selection: string }>,
  whoResult: { name: "Marie Curie" },
};
const promptCalls = {
  prepare: vi.fn(),
  finish: vi.fn(),
  who: vi.fn(),
  multiple: vi.fn(),
  selection: vi.fn(),
};
vi.mock("../prompts/index.js", () => ({
  prepare: (...args: unknown[]) => {
    promptCalls.prepare(...args);
  },
  finish: (...args: unknown[]) => {
    promptCalls.finish(...args);
  },
  who: (...args: unknown[]) => {
    promptCalls.who(...args);
    return Effect.succeed(promptState.whoResult);
  },
  multiple: (...args: unknown[]) => {
    promptCalls.multiple(...args);
    const next = promptState.multipleResults.shift() ?? { selection: [] };
    return Effect.succeed(next);
  },
  selection: (...args: unknown[]) => {
    promptCalls.selection(...args);
    const next = promptState.selectionResults.shift() ?? { selection: "" };
    return Effect.succeed(next);
  },
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), success: vi.fn() },
}));

const citationCalls = {
  searchAuthors: vi.fn(),
  retrieve_articles: vi.fn(),
  retrieve_articles_given_work_ids: vi.fn(),
};
const citationState = {
  searchAuthorsResult: { results: [] as unknown[] },
  retrieveArticlesQueue: [] as Array<{ results: unknown[] }>,
  retrieveByIdsResult: { results: [] as unknown[] },
};
vi.mock("@univ-lehavre/atlas-citation", () => ({
  searchAuthors: (name: string) => {
    citationCalls.searchAuthors(name);
    return Effect.succeed(citationState.searchAuthorsResult);
  },
  retrieve_articles: (authors: string[], institutions: string[]) => {
    citationCalls.retrieve_articles(authors, institutions);
    const next = citationState.retrieveArticlesQueue.shift() ?? {
      results: [],
    };
    return Effect.succeed(next);
  },
  retrieve_articles_given_work_ids: (ids: string[]) => {
    citationCalls.retrieve_articles_given_work_ids(ids);
    return Effect.succeed(citationState.retrieveByIdsResult);
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

interface MinimalAuthor {
  id: string;
  display_name: string;
  display_name_alternatives: string[];
  affiliations: Array<{
    institution: {
      id: string;
      display_name: string;
      ror: string;
      country_code: string;
      type: string;
      lineage: string[];
    };
    years: number[];
  }>;
}

const author = (overrides: Partial<MinimalAuthor> = {}): MinimalAuthor => ({
  id: "A1",
  display_name: "Marie Curie",
  display_name_alternatives: ["M. Curie", "Marie Curie"],
  affiliations: [
    {
      institution: {
        id: "I1",
        display_name: "Sorbonne",
        ror: "ror-1",
        country_code: "FR",
        type: "education",
        lineage: [],
      },
      years: [1900],
    },
  ],
  ...overrides,
});

interface MinimalWork {
  id: string;
  doi: string;
  title: string;
  display_name: string;
  publication_year: number;
  type: string;
  authorships: Array<{
    author_position: string;
    author: { id: string; display_name: string; orcid: string };
    institutions: Array<{
      id: string;
      display_name: string;
      ror: string;
      country_code: string;
      type: string;
      lineage: string[];
    }>;
    raw_author_name: string;
    raw_affiliation_strings: string[];
  }>;
}

const work = (overrides: Partial<MinimalWork> = {}): MinimalWork => ({
  id: "W1",
  doi: "10.x/y",
  title: "Some title",
  display_name: "Some title",
  publication_year: 2020,
  type: "article",
  authorships: [
    {
      author_position: "first",
      author: { id: "A1", display_name: "Marie Curie", orcid: "" },
      institutions: [
        {
          id: "I1",
          display_name: "Sorbonne",
          ror: "ror-1",
          country_code: "FR",
          type: "education",
          lineage: [],
        },
      ],
      raw_author_name: "M. Curie",
      raw_affiliation_strings: [],
    },
  ],
  ...overrides,
});

const resetState = (): void => {
  argsState.name = undefined;
  promptState.multipleResults = [];
  promptState.selectionResults = [];
  promptState.whoResult = { name: "Marie Curie" };
  citationState.searchAuthorsResult = { results: [] };
  citationState.retrieveArticlesQueue = [];
  citationState.retrieveByIdsResult = { results: [] };
  Object.values(promptCalls).forEach((m) => m.mockClear());
  Object.values(citationCalls).forEach((m) => m.mockClear());
};

const importFresh = async (): Promise<void> => {
  vi.resetModules();
  const { program } = await import("./index.js");
  await Effect.runPromiseExit(program);
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("commands/index program", () => {
  let clearSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetState();
    clearSpy = vi.spyOn(console, "clear").mockImplementation(() => undefined);
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((_code?: number) => undefined) as never);
  });

  afterEach(() => {
    clearSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("exits early when search returns zero authors (CLI name path)", async () => {
    argsState.name = "Pierre Curie";
    citationState.searchAuthorsResult = { results: [] };

    await importFresh();

    expect(citationCalls.searchAuthors).toHaveBeenCalledWith("Pierre Curie");
    // console.clear/prepare must NOT be called when --name is provided
    expect(clearSpy).not.toHaveBeenCalled();
    expect(promptCalls.prepare).not.toHaveBeenCalled();
    expect(promptCalls.who).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("prompts interactively (who) when --name is missing", async () => {
    argsState.name = undefined;
    promptState.whoResult = { name: "Marie Curie" };
    citationState.searchAuthorsResult = { results: [] };

    await importFresh();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(promptCalls.prepare).toHaveBeenCalledTimes(1);
    expect(promptCalls.who).toHaveBeenCalledTimes(1);
    expect(citationCalls.searchAuthors).toHaveBeenCalledWith("Marie Curie");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("auto-selects the single display_name_alternative when only one exists", async () => {
    argsState.name = "Marie Curie";
    citationState.searchAuthorsResult = {
      results: [
        author({
          id: "A1",
          display_name_alternatives: ["Marie Curie"],
        }),
      ],
    };
    // affiliations selection: pick Sorbonne
    promptState.multipleResults = [{ selection: ["Sorbonne"] }];
    // only 1 affiliation -> selection prompt is skipped, no articles
    citationState.retrieveArticlesQueue = [{ results: [] }];
    citationState.retrieveByIdsResult = { results: [] };

    await importFresh();

    // multiple() called only for affiliations (display alternatives auto-picked)
    expect(promptCalls.multiple).toHaveBeenCalledTimes(1);
    expect(promptCalls.selection).not.toHaveBeenCalled();
    expect(citationCalls.retrieve_articles).toHaveBeenCalledTimes(1);
    expect(citationCalls.retrieve_articles_given_work_ids).toHaveBeenCalledWith(
      [],
    );
    expect(promptCalls.finish).toHaveBeenCalledTimes(1);
  });

  it("runs the full happy path with multiple display alternatives and one article selected", async () => {
    argsState.name = "Marie Curie";
    citationState.searchAuthorsResult = {
      results: [
        author({
          id: "A1",
          display_name_alternatives: ["M. Curie", "Marie Curie"],
        }),
      ],
    };
    promptState.multipleResults = [
      // pick display alternatives
      { selection: ["Marie Curie"] },
      // pick affiliations
      { selection: ["Sorbonne"] },
      // pick articles
      { selection: ["W1"] },
    ];
    citationState.retrieveArticlesQueue = [{ results: [work({ id: "W1" })] }];
    citationState.retrieveByIdsResult = { results: [work({ id: "W1" })] };

    await importFresh();

    expect(promptCalls.multiple).toHaveBeenCalledTimes(3);
    expect(citationCalls.retrieve_articles).toHaveBeenCalledTimes(1);
    expect(citationCalls.retrieve_articles_given_work_ids).toHaveBeenCalledWith(
      ["W1"],
    );
    expect(promptCalls.finish).toHaveBeenCalledTimes(1);
  });

  it("uses the selection prompt to pick among >1 affiliations", async () => {
    argsState.name = "Marie Curie";
    citationState.searchAuthorsResult = {
      results: [
        author({
          id: "A1",
          display_name_alternatives: ["Marie Curie"],
          affiliations: [
            {
              institution: {
                id: "I1",
                display_name: "Sorbonne",
                ror: "ror-1",
                country_code: "FR",
                type: "education",
                lineage: [],
              },
              years: [1900],
            },
            {
              institution: {
                id: "I2",
                display_name: "ESPCI",
                ror: "ror-2",
                country_code: "FR",
                type: "education",
                lineage: [],
              },
              years: [1903],
            },
          ],
        }),
      ],
    };
    // pick both affiliations
    promptState.multipleResults = [{ selection: ["Sorbonne", "ESPCI"] }];
    // selection prompt picks I1 first
    promptState.selectionResults = [{ selection: "I1" }];
    // articles for I1 round = empty; for I2 round = empty
    citationState.retrieveArticlesQueue = [{ results: [] }, { results: [] }];
    citationState.retrieveByIdsResult = { results: [] };

    await importFresh();

    expect(promptCalls.selection).toHaveBeenCalledTimes(1);
    expect(citationCalls.retrieve_articles).toHaveBeenCalledTimes(2);
    expect(promptCalls.finish).toHaveBeenCalledTimes(1);
  });

  it("filters articles already curated across affiliation loops", async () => {
    argsState.name = "Marie Curie";
    citationState.searchAuthorsResult = {
      results: [
        author({
          id: "A1",
          display_name_alternatives: ["Marie Curie"],
          affiliations: [
            {
              institution: {
                id: "I1",
                display_name: "Sorbonne",
                ror: "ror-1",
                country_code: "FR",
                type: "education",
                lineage: [],
              },
              years: [1900],
            },
            {
              institution: {
                id: "I2",
                display_name: "ESPCI",
                ror: "ror-2",
                country_code: "FR",
                type: "education",
                lineage: [],
              },
              years: [1903],
            },
          ],
        }),
      ],
    };
    promptState.multipleResults = [
      { selection: ["Sorbonne", "ESPCI"] },
      // Round 1 article picks
      { selection: ["W1"] },
      // Round 2: no articles, so no multiple() call here
    ];
    promptState.selectionResults = [{ selection: "I1" }];
    citationState.retrieveArticlesQueue = [
      { results: [work({ id: "W1" })] },
      { results: [work({ id: "W1" })] }, // duplicate gets filtered
    ];
    citationState.retrieveByIdsResult = { results: [work({ id: "W1" })] };

    await importFresh();

    expect(citationCalls.retrieve_articles).toHaveBeenCalledTimes(2);
    // Multiple called: 1 for affiliations + 1 for round-1 articles (round-2 had 0 filtered articles, so skipped)
    expect(promptCalls.multiple).toHaveBeenCalledTimes(2);
    expect(citationCalls.retrieve_articles_given_work_ids).toHaveBeenCalledWith(
      ["W1"],
    );
  });
});
