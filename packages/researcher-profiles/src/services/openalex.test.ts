import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Exit } from "effect";

const mocks = vi.hoisted(() => ({
  searchAuthorsByName: vi.fn(),
  searchAuthorsByORCID: vi.fn(),
  searchWorksByAuthorID: vi.fn(),
}));

vi.mock("@univ-lehavre/atlas-fetch-openalex", () => ({
  searchAuthorsByName: mocks.searchAuthorsByName,
  searchAuthorsByORCID: mocks.searchAuthorsByORCID,
  searchWorksByAuthorID: mocks.searchWorksByAuthorID,
}));

import {
  resolveAuthors,
  resolveAll,
  fetchWorksForAuthors,
} from "./openalex.js";

const config = {
  apiURL: "https://api.openalex.org",
  userAgent: "test/1.0",
  rateLimit: { limit: 10, interval: "1 seconds" as const },
  perPage: 25,
} as never;

const author = (id: string) => ({ id, display_name: id }) as never;
const work = (id: string) => ({ id, title: id }) as never;

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
});

describe("resolveAuthors", () => {
  it("queries by name only when ORCID is empty", async () => {
    mocks.searchAuthorsByName.mockReturnValue(Effect.succeed([author("A1")]));

    const row = {
      first_name: "Alice",
      middle_name: "",
      last_name: "Doe",
      orcid: "",
    } as never;

    const result = await Effect.runPromise(resolveAuthors(row, config));

    expect(mocks.searchAuthorsByName).toHaveBeenCalledWith(
      ["Alice Doe"],
      config,
    );
    expect(mocks.searchAuthorsByORCID).not.toHaveBeenCalled();
    expect(result.byOrcid).toEqual([]);
    expect(result.unique).toEqual([author("A1")]);
  });

  it("queries with the middle-name variant when present and merges by ORCID", async () => {
    mocks.searchAuthorsByName.mockReturnValue(
      Effect.succeed([author("A1"), author("A2")]),
    );
    mocks.searchAuthorsByORCID.mockReturnValue(
      Effect.succeed([author("A2"), author("A3")]),
    );

    const row = {
      first_name: "Alice",
      middle_name: "B",
      last_name: "Doe",
      orcid: "0000-0001-2345-6789",
    } as never;

    const result = await Effect.runPromise(resolveAuthors(row, config));

    expect(mocks.searchAuthorsByName).toHaveBeenCalledWith(
      ["Alice Doe", "Alice B Doe"],
      config,
    );
    expect(mocks.searchAuthorsByORCID).toHaveBeenCalledWith(
      ["0000-0001-2345-6789"],
      config,
    );
    expect(result.unique.map((a) => a.id)).toEqual(["A1", "A2", "A3"]);
  });

  it("wraps fetch errors as OpenAlexSearchError", async () => {
    mocks.searchAuthorsByName.mockReturnValue(Effect.fail("boom"));

    const row = {
      first_name: "X",
      middle_name: "",
      last_name: "Y",
      orcid: "",
    } as never;

    const exit = await Effect.runPromiseExit(resolveAuthors(row, config));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("fetchWorksForAuthors", () => {
  it("returns an empty array when no authors are provided", async () => {
    const works = await Effect.runPromise(
      fetchWorksForAuthors([], config, "X"),
    );
    expect(works).toEqual([]);
    expect(mocks.searchWorksByAuthorID).not.toHaveBeenCalled();
  });

  it("aggregates and deduplicates works across authors", async () => {
    mocks.searchWorksByAuthorID
      .mockReturnValueOnce(Effect.succeed([work("W1"), work("W2")]))
      .mockReturnValueOnce(Effect.succeed([work("W2"), work("W3")]));

    const onProgress = vi.fn();
    const onRateLimit = vi.fn();
    const works = await Effect.runPromise(
      fetchWorksForAuthors(
        [author("A1"), author("A2")],
        config,
        "X",
        onProgress,
        onRateLimit,
      ),
    );
    expect(works.map((w) => w.id)).toEqual(["W1", "W2", "W3"]);
    expect(mocks.searchWorksByAuthorID).toHaveBeenCalledTimes(2);
  });

  it("forwards page progress through the configured callback", async () => {
    mocks.searchWorksByAuthorID.mockImplementation((_id, _cfg, _rl, onPage) => {
      onPage?.(2, 3);
      return Effect.succeed([work("W1")]);
    });

    const onProgress = vi.fn();
    await Effect.runPromise(
      fetchWorksForAuthors([author("A1")], config, "X", onProgress),
    );
    expect(onProgress).toHaveBeenCalledWith(1, 1, 2, 3);
  });
});

describe("resolveAll", () => {
  it("resolves authors then their works", async () => {
    mocks.searchAuthorsByName.mockReturnValue(Effect.succeed([author("A1")]));
    mocks.searchWorksByAuthorID.mockReturnValue(Effect.succeed([work("W1")]));

    const result = await Effect.runPromise(
      resolveAll(
        {
          first_name: "Alice",
          middle_name: "",
          last_name: "Doe",
          orcid: "",
        } as never,
        config,
      ),
    );

    expect(result.authors).toEqual([author("A1")]);
    expect(result.works).toEqual([work("W1")]);
  });
});
