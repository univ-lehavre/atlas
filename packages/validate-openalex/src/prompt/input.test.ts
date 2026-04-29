import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";

const mocks = vi.hoisted(() => ({
  intro: vi.fn(),
  outro: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  autocompleteMultiselect: vi.fn(),
  text: vi.fn(),
  taskLog: vi.fn(),
  getContext: vi.fn(),
  hasEventsForThisORCID: vi.fn(),
  getEvents: vi.fn(),
  getOpenAlexIDs: vi.fn(),
  getAcceptedAuthorAffiliations: vi.fn(),
  getAcceptedAuthorDisplayNameAlternatives: vi.fn(),
  getAcceptedInstitutionDisplayNameAlternatives: vi.fn(),
  getAcceptedWorks: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  intro: mocks.intro,
  outro: mocks.outro,
  confirm: mocks.confirm,
  select: mocks.select,
  multiselect: mocks.multiselect,
  autocompleteMultiselect: mocks.autocompleteMultiselect,
  text: mocks.text,
  taskLog: mocks.taskLog,
}));

vi.mock("../context/index.js", () => ({
  getContext: mocks.getContext,
}));

vi.mock("../actions/index.js", () => ({
  hasEventsForThisORCID: mocks.hasEventsForThisORCID,
}));

vi.mock("../events/index.js", () => ({
  getEvents: mocks.getEvents,
  getOpenAlexIDs: mocks.getOpenAlexIDs,
  getAcceptedAuthorAffiliations: mocks.getAcceptedAuthorAffiliations,
  getAcceptedAuthorDisplayNameAlternatives:
    mocks.getAcceptedAuthorDisplayNameAlternatives,
  getAcceptedInstitutionDisplayNameAlternatives:
    mocks.getAcceptedInstitutionDisplayNameAlternatives,
  getAcceptedWorks: mocks.getAcceptedWorks,
}));

import {
  autocompleteMultiselect,
  confirm,
  end,
  listAcceptedAuthorAffiliations,
  listAcceptedAuthorDisplayNameAlternatives,
  listAcceptedInstitutionDisplayNameAlternatives,
  listAcceptedOpenAlexIDs,
  listAcceptedWorks,
  multiselect,
  print_title,
  select,
  taskLog,
  text,
} from "./input.js";

describe("prompt input wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.select.mockResolvedValue("selected");
    mocks.multiselect.mockResolvedValue(["a", "b"]);
    mocks.autocompleteMultiselect.mockResolvedValue(["a"]);
    mocks.text.mockResolvedValue("typed");
    mocks.taskLog.mockReturnValue({ message: vi.fn() });
    mocks.getContext.mockReturnValue(
      Effect.succeed({
        type: "author",
        id: "https://orcid.org/0000-0001-2345-6789",
        backup: false,
        NAMESPACE: "ns",
      }),
    );
    mocks.hasEventsForThisORCID.mockReturnValue(Effect.succeed(true));
    mocks.getEvents.mockReturnValue(Effect.succeed([]));
    mocks.getOpenAlexIDs.mockReturnValue(["A2", "A1"]);
    mocks.getAcceptedAuthorAffiliations.mockReturnValue(Effect.succeed(["I1"]));
    mocks.getAcceptedAuthorDisplayNameAlternatives.mockReturnValue(
      Effect.succeed(["Ada"]),
    );
    mocks.getAcceptedInstitutionDisplayNameAlternatives.mockReturnValue(
      Effect.succeed(["University"]),
    );
    mocks.getAcceptedWorks.mockReturnValue([
      { title: "Z paper" },
      { title: undefined },
      { title: "A paper" },
    ]);
  });

  it("prints an ORCID title when context has events", async () => {
    await Effect.runPromise(print_title());

    expect(mocks.intro).toHaveBeenCalledWith(
      expect.stringContaining("https://orcid.org/0000-0001-2345-6789"),
    );
  });

  it("prints the default title when no context id is available", async () => {
    mocks.getContext.mockReturnValue(
      Effect.succeed({
        type: "none",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      }),
    );

    await Effect.runPromise(print_title());

    expect(mocks.intro).toHaveBeenCalledWith(
      expect.stringContaining("OpenAlex"),
    );
    expect(mocks.hasEventsForThisORCID).not.toHaveBeenCalled();
  });

  it("prints the outro", () => {
    end();

    expect(mocks.outro).toHaveBeenCalledWith(expect.stringContaining("Fin"));
  });

  it("delegates confirmation, select, multiselect, autocomplete and text prompts", async () => {
    await expect(Effect.runPromise(confirm("Confirm?"))).resolves.toBe(true);
    await expect(
      Effect.runPromise(select("Pick", [{ value: "a" }])),
    ).resolves.toBe("selected");
    await expect(
      Effect.runPromise(multiselect("Pick many", true, [{ value: "a" }])),
    ).resolves.toEqual(["a", "b"]);
    await expect(
      Effect.runPromise(
        autocompleteMultiselect("Find", false, [{ value: "a" }]),
      ),
    ).resolves.toEqual(["a"]);
    await expect(
      Effect.runPromise(text("Text", "placeholder", () => undefined)),
    ).resolves.toBe("typed");

    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith({
      message: "Find",
      options: [{ value: "a" }],
      required: false,
      placeholder: "Taper pour filtrer l'option...",
      maxItems: 20,
    });
  });

  it("wraps prompt failures in domain errors", async () => {
    mocks.confirm.mockRejectedValueOnce(new Error("nope"));
    mocks.select.mockRejectedValueOnce(new Error("nope"));
    mocks.multiselect.mockRejectedValueOnce(new Error("nope"));
    mocks.autocompleteMultiselect.mockRejectedValueOnce(new Error("nope"));
    mocks.text.mockRejectedValueOnce(new Error("nope"));

    await expect(Effect.runPromise(confirm("Confirm?"))).rejects.toThrow(
      "Erreur lors de la confirmation",
    );
    await expect(Effect.runPromise(select("Pick", []))).rejects.toThrow(
      "Erreur lors de la sélection",
    );
    await expect(
      Effect.runPromise(multiselect("Pick", false, [])),
    ).rejects.toThrow("Erreur lors de la sélection");
    await expect(
      Effect.runPromise(autocompleteMultiselect("Pick", false, [])),
    ).rejects.toThrow("Erreur lors de la sélection");
    await expect(
      Effect.runPromise(text("Text", "placeholder", () => undefined)),
    ).rejects.toThrow("Erreur lors de la saisie");
  });

  it("writes all task log messages", () => {
    const message = vi.fn();
    mocks.taskLog.mockReturnValue({ message });

    taskLog("Title", ["one", "two"]);

    expect(mocks.taskLog).toHaveBeenCalledWith({ title: "Title" });
    expect(message).toHaveBeenCalledWith("one");
    expect(message).toHaveBeenCalledWith("two");
  });

  it("lists accepted OpenAlex ids for the current context", async () => {
    await Effect.runPromise(listAcceptedOpenAlexIDs());

    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [{ value: "A2" }, { value: "A1" }],
        required: false,
      }),
    );
  });

  it("does not list OpenAlex ids without context id", async () => {
    mocks.getContext.mockReturnValue(
      Effect.succeed({
        type: "none",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      }),
    );

    await Effect.runPromise(listAcceptedOpenAlexIDs());

    expect(mocks.getEvents).not.toHaveBeenCalled();
  });

  it("lists accepted author and institution labels", async () => {
    await Effect.runPromise(listAcceptedAuthorDisplayNameAlternatives());
    await Effect.runPromise(listAcceptedAuthorAffiliations());
    await Effect.runPromise(listAcceptedInstitutionDisplayNameAlternatives());

    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({ options: [{ value: "Ada" }] }),
    );
    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({ options: [{ value: "I1" }] }),
    );
    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({ options: [{ value: "University" }] }),
    );
  });

  it("lists accepted works sorted by title", async () => {
    await Effect.runPromise(listAcceptedWorks());

    expect(mocks.autocompleteMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [{ value: "A paper" }, { value: "Z paper" }],
      }),
    );
  });

  it("does not list works without context id", async () => {
    mocks.getContext.mockReturnValue(
      Effect.succeed({
        type: "none",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      }),
    );

    await Effect.runPromise(listAcceptedWorks());

    expect(mocks.getEvents).not.toHaveBeenCalled();
  });
});
