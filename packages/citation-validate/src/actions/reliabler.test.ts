import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import type { IEvent } from "../events/types.js";

const mocks = vi.hoisted(() => ({
  getORCID: vi.fn(),
  getEvents: vi.fn(),
  filterPending: vi.fn(),
  updateEventsStore: vi.fn(),
  autocompleteMultiselect: vi.fn(),
  events2options: vi.fn(),
}));

vi.mock("../context/index.js", () => ({
  getORCID: mocks.getORCID,
}));

vi.mock("../store/index.js", () => ({
  updateEventsStore: mocks.updateEventsStore,
}));

vi.mock("../events/index.js", () => ({
  getEvents: mocks.getEvents,
  filterPending: mocks.filterPending,
}));

vi.mock("../prompt/index.js", () => ({
  autocompleteMultiselect: mocks.autocompleteMultiselect,
  events2options: mocks.events2options,
}));

import { mark_alternative_strings_reliable } from "./reliabler.js";

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent =>
  ({
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    dataIntegrity: "uuid-1",
    hasBeenExtendedAt: null,
    status: "pending",
    from: "A1",
    id: "https://orcid.org/0000-0001-2345-6789",
    entity: "author",
    field: "display_name_alternatives",
    value: "Ada",
    ...overrides,
  }) as IEvent;

describe("mark_alternative_strings_reliable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getORCID.mockReturnValue(
      Effect.succeed("https://orcid.org/0000-0001-2345-6789"),
    );
    mocks.getEvents.mockReturnValue(
      Effect.succeed([
        makeEvent({ dataIntegrity: "uuid-1", value: "Ada" }),
        makeEvent({ dataIntegrity: "uuid-2", value: "A. Lovelace" }),
      ]),
    );
    mocks.filterPending.mockImplementation((events: IEvent[]) => events);
    mocks.events2options.mockReturnValue([
      { value: "Ada" },
      { value: "A. Lovelace" },
    ]);
    mocks.autocompleteMultiselect.mockReturnValue(Effect.succeed(["Ada"]));
    mocks.updateEventsStore.mockReturnValue(Effect.void);
  });

  it("marks selected pending values as accepted and the others as rejected", async () => {
    await Effect.runPromise(
      mark_alternative_strings_reliable("Select reliable values", {
        entity: "author",
        field: "display_name_alternatives",
      }),
    );

    expect(mocks.getORCID).toHaveBeenCalled();
    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      "Select reliable values",
      false,
      [{ value: "Ada" }, { value: "A. Lovelace" }],
    );
    expect(mocks.updateEventsStore).toHaveBeenCalledWith([
      expect.objectContaining({ value: "Ada", status: "accepted" }),
      expect.objectContaining({ value: "A. Lovelace", status: "rejected" }),
    ]);
    const updated = mocks.updateEventsStore.mock.calls[0][0] as IEvent[];
    expect(updated.every((event) => event.updatedAt !== "2024-01-01")).toBe(
      true,
    );
  });

  it("uses the provided id without reading the current ORCID", async () => {
    await Effect.runPromise(
      mark_alternative_strings_reliable("Select reliable values", {
        id: "existing-id" as IEvent["id"],
        entity: "author",
      }),
    );

    expect(mocks.getORCID).not.toHaveBeenCalled();
    expect(mocks.filterPending).toHaveBeenCalledWith(expect.any(Array), {
      id: "existing-id",
      entity: "author",
    });
  });

  it("fails when the multiselect prompt is cancelled", async () => {
    mocks.autocompleteMultiselect.mockReturnValue(
      Effect.succeed(Symbol("cancel")),
    );

    await expect(
      Effect.runPromise(
        mark_alternative_strings_reliable("Select reliable values", {
          entity: "author",
        }),
      ),
    ).rejects.toThrow("La sélection a été annulée");

    expect(mocks.updateEventsStore).not.toHaveBeenCalled();
  });
});
