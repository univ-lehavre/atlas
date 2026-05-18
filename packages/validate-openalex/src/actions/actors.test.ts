import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect, Either } from "effect";
import fs from "node:fs";
import type {
  CitationID,
  ORCID,
  WorksResult,
} from "@univ-lehavre/atlas-citation-types";
import type { IContext } from "../context/types.js";
import type { IEvent } from "../events/types.js";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  getORCID: vi.fn(),
  setEventsStore: vi.fn(),
  getAuthorAlternativeStrings: vi.fn(),
  text: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
  events2options: vi.fn(),
  searchAuthorByName: vi.fn(),
  searchAuthorByORCID: vi.fn(),
  searchWorksByAuthorIDs: vi.fn(),
  searchWorksByDOI: vi.fn(),
  searchWorksByORCID: vi.fn(),
  updateContextStore: vi.fn(),
  updateEventsStore: vi.fn(),
  buildAuthorResultsPendingEvents: vi.fn(),
  buildEvent: vi.fn(),
  buildReference: vi.fn(),
  getEvents: vi.fn(),
  getManyEvent: vi.fn(),
  getCitationIDs: vi.fn(),
  getStatusOfAffiliation: vi.fn(),
  getStatusOfAuthorDisplayNameAlternative: vi.fn(),
  getStatusOfWork: vi.fn(),
  isInteresting: vi.fn(),
  removeDuplicates: vi.fn(),
  updateNewEventsWithExistingMetadata: vi.fn(),
  getAffiliationLabel: vi.fn(),
  log: { info: vi.fn(), message: vi.fn() },
}));

vi.mock("../context/index.js", () => ({
  getContext: mocks.getContext,
  getORCID: mocks.getORCID,
}));

vi.mock("../store/setter.js", () => ({
  setEventsStore: mocks.setEventsStore,
}));

vi.mock("./tester.js", () => ({
  getAuthorAlternativeStrings: mocks.getAuthorAlternativeStrings,
}));

vi.mock("../prompt/index.js", () => ({
  text: mocks.text,
  select: mocks.select,
  confirm: mocks.confirm,
  events2options: mocks.events2options,
}));

vi.mock("../fetch/index.js", () => ({
  searchAuthorByName: mocks.searchAuthorByName,
  searchAuthorByORCID: mocks.searchAuthorByORCID,
  searchWorksByAuthorIDs: mocks.searchWorksByAuthorIDs,
  searchWorksByDOI: mocks.searchWorksByDOI,
  searchWorksByORCID: mocks.searchWorksByORCID,
}));

vi.mock("../store/index.js", () => ({
  updateContextStore: mocks.updateContextStore,
  updateEventsStore: mocks.updateEventsStore,
}));

vi.mock("../events/index.js", () => ({
  buildAuthorResultsPendingEvents: mocks.buildAuthorResultsPendingEvents,
  buildEvent: mocks.buildEvent,
  buildReference: mocks.buildReference,
  getEvents: mocks.getEvents,
  getManyEvent: mocks.getManyEvent,
  getCitationIDs: mocks.getCitationIDs,
  getStatusOfAffiliation: mocks.getStatusOfAffiliation,
  getStatusOfAuthorDisplayNameAlternative:
    mocks.getStatusOfAuthorDisplayNameAlternative,
  getStatusOfWork: mocks.getStatusOfWork,
  isInteresting: mocks.isInteresting,
  removeDuplicates: mocks.removeDuplicates,
  updateNewEventsWithExistingMetadata:
    mocks.updateNewEventsWithExistingMetadata,
}));

vi.mock("@clack/prompts", () => ({
  log: mocks.log,
}));

vi.mock("../oa/getter.js", () => ({
  getAffiliationLabel: mocks.getAffiliationLabel,
}));

import {
  extendsEventsWithAlternativeStrings,
  extendsToWorks,
  hasEventsForThisORCID,
  insert_new_ORCID,
  removeAuthorPendings,
  retrieveWorksByDOI,
  retrieveWorksByORCID,
} from "./actors.js";

const orcid = "https://orcid.org/0000-0001-2345-6789" as unknown as ORCID;
const openAlexId = "https://openalex.org/A123" as unknown as CitationID;

const context: IContext = {
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
};

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent =>
  ({
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    dataIntegrity: "uuid-1",
    hasBeenExtendedAt: null,
    status: "pending",
    from: openAlexId,
    id: orcid,
    entity: "author",
    field: "display_name_alternatives",
    value: "Ada",
    ...overrides,
  }) as IEvent;

const makeWork = (overrides: Partial<WorksResult> = {}): WorksResult =>
  ({
    id: "https://openalex.org/W1",
    title: "A paper",
    authorships: [
      {
        author: {
          id: openAlexId,
          orcid,
          display_name: "Ada Lovelace",
        },
        raw_author_name: "Ada Lovelace",
        affiliations: [],
      },
    ],
    ...overrides,
  }) as unknown as WorksResult;

describe("actors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getContext.mockReturnValue(Effect.succeed(context));
    mocks.getORCID.mockReturnValue(Effect.succeed(orcid));
    mocks.setEventsStore.mockReturnValue(Effect.void);
    mocks.text.mockReturnValue(Effect.succeed("0000-0001-2345-6789"));
    mocks.select.mockReturnValue(Effect.succeed("Ada"));
    mocks.confirm.mockReturnValue(Effect.succeed(true));
    mocks.events2options.mockReturnValue([{ value: "Ada" }]);
    mocks.searchAuthorByName.mockReturnValue(
      Effect.succeed([{ id: openAlexId }]),
    );
    mocks.searchAuthorByORCID.mockReturnValue(
      Effect.succeed([{ id: openAlexId }]),
    );
    mocks.searchWorksByAuthorIDs.mockReturnValue(Effect.succeed([]));
    mocks.searchWorksByDOI.mockReturnValue(Effect.succeed([]));
    mocks.searchWorksByORCID.mockReturnValue(Effect.succeed([]));
    mocks.updateContextStore.mockReturnValue(Effect.void);
    mocks.updateEventsStore.mockReturnValue(Effect.void);
    mocks.buildAuthorResultsPendingEvents.mockReturnValue(
      Effect.succeed([makeEvent({ dataIntegrity: "new" })]),
    );
    mocks.buildEvent.mockImplementation((event: Partial<IEvent>) =>
      Effect.succeed(makeEvent(event)),
    );
    mocks.buildReference.mockReturnValue("A paper");
    mocks.getEvents.mockReturnValue(Effect.succeed([]));
    mocks.getManyEvent.mockReturnValue(Effect.succeed([makeEvent()]));
    mocks.getCitationIDs.mockReturnValue([openAlexId]);
    mocks.getStatusOfAffiliation.mockReturnValue(undefined);
    mocks.getStatusOfAuthorDisplayNameAlternative.mockReturnValue("accepted");
    mocks.getStatusOfWork.mockReturnValue("accepted");
    mocks.getAuthorAlternativeStrings.mockReturnValue(
      Effect.succeed([makeEvent({ value: "Ada" })]),
    );
    mocks.isInteresting.mockImplementation(
      (event: IEvent, opts: Partial<IEvent>) =>
        Object.entries(opts).every(
          ([key, value]) => event[key as keyof IEvent] === value,
        ),
    );
    mocks.removeDuplicates.mockImplementation((events: IEvent[]) => events);
    mocks.updateNewEventsWithExistingMetadata.mockImplementation(
      (_events: IEvent[], newItems: IEvent[]) => newItems,
    );
    mocks.getAffiliationLabel.mockReturnValue({ _id: "Either", _tag: "Left" });
  });

  it("detects whether the current ORCID has author events", async () => {
    mocks.getEvents.mockReturnValueOnce(Effect.succeed([]));
    await expect(Effect.runPromise(hasEventsForThisORCID())).resolves.toBe(
      false,
    );

    mocks.getEvents.mockReturnValueOnce(
      Effect.succeed([makeEvent({ entity: "institution" })]),
    );
    await expect(Effect.runPromise(hasEventsForThisORCID())).resolves.toBe(
      false,
    );

    mocks.getEvents.mockReturnValueOnce(Effect.succeed([makeEvent()]));
    await expect(Effect.runPromise(hasEventsForThisORCID())).resolves.toBe(
      true,
    );
  });

  it("removes pending events for the current ORCID", async () => {
    const accepted = makeEvent({
      status: "accepted",
      dataIntegrity: "accepted",
    });
    const pending = makeEvent({ status: "pending", dataIntegrity: "pending" });
    mocks.getEvents.mockReturnValue(Effect.succeed([accepted, pending]));

    await Effect.runPromise(removeAuthorPendings());

    expect(mocks.setEventsStore).toHaveBeenCalledWith([accepted]);
  });

  it("inserts a new ORCID and stores discovered author events", async () => {
    await Effect.runPromise(insert_new_ORCID());

    expect(mocks.text).toHaveBeenCalled();
    expect(mocks.updateContextStore).toHaveBeenCalledWith({
      type: "author",
      id: expect.stringContaining("https://orcid.org/0000-0001-2345-6789"),
    });
    expect(mocks.searchAuthorByORCID).toHaveBeenCalled();
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({ dataIntegrity: "new" }),
    ]);
  });

  it("validates the ORCID prompt input through every branch of the inline validator", async () => {
    await Effect.runPromise(insert_new_ORCID());

    const lastCall = mocks.text.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const validator = lastCall![2] as (
      value: string | undefined,
    ) => string | undefined;

    expect(validator(undefined)).toBe("L’ORCID est requis");
    expect(validator("")).toBe("L’ORCID est requis");
    expect(validator("   ")).toBe("L’ORCID est requis");
    expect(validator("not-an-orcid")).toBe(
      "L’ORCID doit être au format 0000-0000-0000-0000",
    );
    expect(validator("0000-0001-2345-6789")).toBeUndefined();
    expect(validator("https://orcid.org/0000-0001-2345-6789")).toBeUndefined();
  });

  it("uses the bare ORCID format and prefixes it with the canonical URL", async () => {
    mocks.text.mockReturnValue(Effect.succeed("0000-0001-2345-6789"));

    await Effect.runPromise(insert_new_ORCID());

    expect(mocks.updateContextStore).toHaveBeenCalledWith({
      type: "author",
      id: "https://orcid.org/0000-0001-2345-6789",
    });
  });

  it("extends events from a selected alternative string", async () => {
    await Effect.runPromise(extendsEventsWithAlternativeStrings());

    expect(mocks.select).toHaveBeenCalledWith(
      "Sélectionnez la forme imprimée de l'auteur à rechercher",
      [{ value: "Ada" }],
    );
    expect(mocks.getManyEvent).toHaveBeenCalledWith({
      id: orcid,
      entity: "author",
      field: "display_name_alternatives",
      value: "Ada",
    });
    expect(mocks.searchAuthorByName).toHaveBeenCalledWith(["Ada"]);
    expect(mocks.updateEventsStore).toHaveBeenCalled();
  });

  it("fails when alternative string selection is cancelled", async () => {
    mocks.select.mockReturnValue(Effect.succeed(Symbol("cancel")));

    await expect(
      Effect.runPromise(extendsEventsWithAlternativeStrings()),
    ).rejects.toThrow("Sélection invalide");
  });

  it("requires a rate limiter for work retrieval actions", async () => {
    await expect(Effect.runPromise(extendsToWorks(undefined))).rejects.toThrow(
      "RateLimiter is required",
    );
    await expect(
      Effect.runPromise(retrieveWorksByORCID(undefined)),
    ).rejects.toThrow("RateLimiter is required");
    await expect(
      Effect.runPromise(retrieveWorksByDOI(undefined)),
    ).rejects.toThrow("RateLimiter is required");
  });

  it("returns early when work retrieval actions have no context id", async () => {
    mocks.getContext.mockReturnValue(
      Effect.succeed({ ...context, id: undefined }),
    );
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);

    await Effect.runPromise(extendsToWorks(rateLimiter));
    await Effect.runPromise(retrieveWorksByORCID(rateLimiter));
    await Effect.runPromise(retrieveWorksByDOI(rateLimiter));

    expect(rateLimiter).not.toHaveBeenCalled();
  });

  it("retrieves works by ORCID and skips works without matching authorship", async () => {
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);
    mocks.searchWorksByORCID.mockReturnValue(
      Effect.succeed([
        makeWork({ authorships: [] }),
        makeWork({
          authorships: [
            {
              author: { id: openAlexId, orcid: "other" },
              raw_author_name: "Other",
              affiliations: [],
            },
          ],
        }),
      ]),
    );

    await Effect.runPromise(retrieveWorksByORCID(rateLimiter));

    expect(rateLimiter).toHaveBeenCalled();
    expect(mocks.updateEventsStore).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ entity: "work" })]),
    );
  });

  it("retrieves works by ORCID and skips reconfirmation when the author name was already rejected", async () => {
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);
    mocks.getStatusOfAuthorDisplayNameAlternative.mockReturnValue("rejected");
    mocks.getStatusOfWork.mockReturnValue(undefined);
    mocks.searchWorksByORCID.mockReturnValue(Effect.succeed([makeWork()]));

    await Effect.runPromise(retrieveWorksByORCID(rateLimiter));

    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "work",
        field: "id",
        status: "rejected",
      }),
    ]);
  });

  it("retrieves works by ORCID and rejects a work when the author name is rejected", async () => {
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);
    mocks.getStatusOfAuthorDisplayNameAlternative.mockReturnValue(undefined);
    mocks.getStatusOfWork.mockReturnValue(undefined);
    mocks.confirm.mockReturnValue(Effect.succeed(false));
    mocks.searchWorksByORCID.mockReturnValue(Effect.succeed([makeWork()]));

    await Effect.runPromise(retrieveWorksByORCID(rateLimiter));

    expect(mocks.confirm).toHaveBeenCalledWith(
      'Est-ce que "Ada Lovelace" est une forme imprimée de ce chercheur ?',
    );
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "author",
        field: "display_name_alternatives",
        status: "rejected",
      }),
    ]);
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "work",
        field: "id",
        status: "rejected",
      }),
    ]);
  });

  it("extends to works and accepts affiliations after confirmation", async () => {
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);
    const work = makeWork({
      authorships: [
        {
          author: {
            id: openAlexId,
            orcid,
            display_name: "Ada Lovelace",
          },
          raw_author_name: "Ada Lovelace",
          affiliations: [
            {
              raw_affiliation_string: "Analytical Engine Lab",
              institution_ids: ["https://openalex.org/I1"],
            },
          ],
        },
      ],
    });
    mocks.getStatusOfAuthorDisplayNameAlternative.mockReturnValue("accepted");
    mocks.getStatusOfAffiliation.mockReturnValue(undefined);
    mocks.getStatusOfWork.mockReturnValue(undefined);
    mocks.getAffiliationLabel.mockReturnValue(Either.right("Institution One"));
    mocks.searchWorksByAuthorIDs.mockReturnValue(Effect.succeed([work]));

    await Effect.runPromise(extendsToWorks(rateLimiter));

    expect(mocks.confirm).toHaveBeenCalledWith(
      "Est-ce que ces affiliations correspondent à celle de ce chercheur ?",
    );
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "author",
        field: "affiliation",
        value: "https://openalex.org/I1",
        status: "accepted",
      }),
    ]);
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "institution",
        field: "display_name_alternatives",
        value: "Analytical Engine Lab",
        status: "accepted",
      }),
    ]);
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({
        entity: "work",
        status: "accepted",
      }),
    ]);
  });

  it("retrieves works by DOI from doi.txt", async () => {
    const readFile = vi
      .spyOn(fs.promises, "readFile")
      .mockResolvedValueOnce("See 10.1234/ABC-DEF for details.");
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);
    mocks.searchWorksByDOI.mockReturnValue(Effect.succeed([makeWork()]));

    await Effect.runPromise(retrieveWorksByDOI(rateLimiter));

    expect(readFile).toHaveBeenCalledWith("doi.txt", { encoding: "utf8" });
    expect(mocks.searchWorksByDOI).toHaveBeenCalledWith(["10.1234/ABC-DEF"]);
    readFile.mockRestore();
  });

  it("returns early when doi.txt is empty or has no DOI", async () => {
    const readFile = vi.spyOn(fs.promises, "readFile");
    const rateLimiter = vi.fn((effect: Effect.Effect<unknown>) => effect);

    readFile.mockResolvedValueOnce("");
    await Effect.runPromise(retrieveWorksByDOI(rateLimiter));

    readFile.mockResolvedValueOnce("No DOI here");
    await Effect.runPromise(retrieveWorksByDOI(rateLimiter));

    expect(mocks.searchWorksByDOI).not.toHaveBeenCalled();
    readFile.mockRestore();
  });
});
