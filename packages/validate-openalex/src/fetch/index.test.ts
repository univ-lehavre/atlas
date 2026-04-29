import { describe, expect, it, vi, beforeEach } from "vitest";
import { Effect } from "effect";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(),
  searchAuthorsByName: vi.fn(),
  searchAuthorsByORCID: vi.fn(),
  searchWorksByAuthorIDs: vi.fn(),
  searchWorksByORCID: vi.fn(),
  searchWorksByDOI: vi.fn(),
}));

vi.mock("../config.js", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@univ-lehavre/atlas-fetch-openalex", () => ({
  searchAuthorsByName: mocks.searchAuthorsByName,
  searchAuthorsByORCID: mocks.searchAuthorsByORCID,
  searchWorksByAuthorIDs: mocks.searchWorksByAuthorIDs,
  searchWorksByORCID: mocks.searchWorksByORCID,
  searchWorksByDOI: mocks.searchWorksByDOI,
}));

import {
  searchAuthorByName,
  searchAuthorByORCID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
} from "./index.js";

const env = {
  userAgent: "atlas-test/1.0",
  rateLimit: { limit: 1, interval: "1 second" },
  perPage: 25,
  apiURL: "https://api.openalex.test",
  apiKey: "test-key",
};

const expectedConfig = {
  userAgent: env.userAgent,
  apiURL: env.apiURL,
  apiKey: env.apiKey,
};

describe("fetch adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue(Effect.succeed(env));
    mocks.searchAuthorsByName.mockReturnValue(
      Effect.succeed(["author-by-name"]),
    );
    mocks.searchAuthorsByORCID.mockReturnValue(
      Effect.succeed(["author-by-orcid"]),
    );
    mocks.searchWorksByAuthorIDs.mockReturnValue(
      Effect.succeed(["works-by-author-id"]),
    );
    mocks.searchWorksByORCID.mockReturnValue(
      Effect.succeed(["works-by-orcid"]),
    );
    mocks.searchWorksByDOI.mockReturnValue(Effect.succeed(["works-by-doi"]));
  });

  it("searches authors by name with OpenAlex config from env", async () => {
    const result = await Effect.runPromise(searchAuthorByName(["Ada"]));

    expect(result).toEqual(["author-by-name"]);
    expect(mocks.searchAuthorsByName).toHaveBeenCalledWith(
      ["Ada"],
      expectedConfig,
    );
  });

  it("searches authors by ORCID with OpenAlex config from env", async () => {
    const result = await Effect.runPromise(
      searchAuthorByORCID(["0000-0001-2345-6789"]),
    );

    expect(result).toEqual(["author-by-orcid"]);
    expect(mocks.searchAuthorsByORCID).toHaveBeenCalledWith(
      ["0000-0001-2345-6789"],
      expectedConfig,
    );
  });

  it("searches works by author ids with OpenAlex config from env", async () => {
    const result = await Effect.runPromise(searchWorksByAuthorIDs(["A123"]));

    expect(result).toEqual(["works-by-author-id"]);
    expect(mocks.searchWorksByAuthorIDs).toHaveBeenCalledWith(
      ["A123"],
      expectedConfig,
    );
  });

  it("searches works by ORCID with OpenAlex config from env", async () => {
    const orcid = "https://orcid.org/0000-0001-2345-6789" as unknown as ORCID;
    const result = await Effect.runPromise(searchWorksByORCID(orcid));

    expect(result).toEqual(["works-by-orcid"]);
    expect(mocks.searchWorksByORCID).toHaveBeenCalledWith(
      orcid,
      expectedConfig,
    );
  });

  it("searches works by DOI with OpenAlex config from env", async () => {
    const result = await Effect.runPromise(
      searchWorksByDOI(["10.1234/example"]),
    );

    expect(result).toEqual(["works-by-doi"]);
    expect(mocks.searchWorksByDOI).toHaveBeenCalledWith(
      ["10.1234/example"],
      expectedConfig,
    );
  });
});
