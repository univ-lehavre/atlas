import { beforeEach, describe, expect, it, vi } from "vitest";
import { Effect } from "effect";

const mocks = vi.hoisted(() => ({
  saveStoresAndExit: vi.fn(),
  hasPendings: vi.fn(),
  insert_new_ORCID: vi.fn(),
  mark_alternative_strings_reliable: vi.fn(),
  isContext: vi.fn(),
  extendsEventsWithAlternativeStrings: vi.fn(),
  extendsToWorks: vi.fn(),
  notHasPendings: vi.fn(),
  hasAuthorAlternativeStrings: vi.fn(),
  hasAcceptedValues: vi.fn(),
  retrieveWorksByORCID: vi.fn(),
  retrieveWorksByDOI: vi.fn(),
  hasAcceptedAuthorAffiliations: vi.fn(),
  hasAcceptedAuthorDisplayNameAlternatives: vi.fn(),
  hasAcceptedInstitutionDisplayNameAlternatives: vi.fn(),
  hasAcceptedCitationIDs: vi.fn(),
  hasAcceptedWorks: vi.fn(),
  listAcceptedAuthorAffiliations: vi.fn(),
  listAcceptedAuthorDisplayNameAlternatives: vi.fn(),
  listAcceptedInstitutionDisplayNameAlternatives: vi.fn(),
  listAcceptedCitationIDs: vi.fn(),
  listAcceptedWorks: vi.fn(),
}));

vi.mock("../store/index.js", () => ({
  saveStoresAndExit: mocks.saveStoresAndExit,
}));

vi.mock("./index.js", () => ({
  hasPendings: mocks.hasPendings,
  insert_new_ORCID: mocks.insert_new_ORCID,
  mark_alternative_strings_reliable: mocks.mark_alternative_strings_reliable,
  isContext: mocks.isContext,
  extendsEventsWithAlternativeStrings:
    mocks.extendsEventsWithAlternativeStrings,
  extendsToWorks: mocks.extendsToWorks,
  notHasPendings: mocks.notHasPendings,
  hasAuthorAlternativeStrings: mocks.hasAuthorAlternativeStrings,
  hasAcceptedValues: mocks.hasAcceptedValues,
  retrieveWorksByORCID: mocks.retrieveWorksByORCID,
  retrieveWorksByDOI: mocks.retrieveWorksByDOI,
}));

vi.mock("../events/index.js", () => ({
  hasAcceptedAuthorAffiliations: mocks.hasAcceptedAuthorAffiliations,
  hasAcceptedAuthorDisplayNameAlternatives:
    mocks.hasAcceptedAuthorDisplayNameAlternatives,
  hasAcceptedInstitutionDisplayNameAlternatives:
    mocks.hasAcceptedInstitutionDisplayNameAlternatives,
  hasAcceptedCitationIDs: mocks.hasAcceptedCitationIDs,
  hasAcceptedWorks: mocks.hasAcceptedWorks,
}));

vi.mock("../prompt/index.js", () => ({
  listAcceptedAuthorAffiliations: mocks.listAcceptedAuthorAffiliations,
  listAcceptedAuthorDisplayNameAlternatives:
    mocks.listAcceptedAuthorDisplayNameAlternatives,
  listAcceptedInstitutionDisplayNameAlternatives:
    mocks.listAcceptedInstitutionDisplayNameAlternatives,
  listAcceptedCitationIDs: mocks.listAcceptedCitationIDs,
  listAcceptedWorks: mocks.listAcceptedWorks,
}));

import { actions } from "./actions.js";

describe("actions registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(mocks)) {
      fn.mockReturnValue(Effect.succeed(true));
    }
    mocks.saveStoresAndExit.mockReturnValue(Effect.void);
    mocks.insert_new_ORCID.mockReturnValue(Effect.void);
    mocks.mark_alternative_strings_reliable.mockReturnValue(Effect.void);
    mocks.extendsEventsWithAlternativeStrings.mockReturnValue(Effect.void);
    mocks.extendsToWorks.mockReturnValue(Effect.void);
    mocks.retrieveWorksByORCID.mockReturnValue(Effect.void);
    mocks.retrieveWorksByDOI.mockReturnValue(Effect.void);
    mocks.listAcceptedAuthorAffiliations.mockReturnValue(Effect.void);
    mocks.listAcceptedAuthorDisplayNameAlternatives.mockReturnValue(
      Effect.void,
    );
    mocks.listAcceptedInstitutionDisplayNameAlternatives.mockReturnValue(
      Effect.void,
    );
    mocks.listAcceptedCitationIDs.mockReturnValue(Effect.void);
    mocks.listAcceptedWorks.mockReturnValue(Effect.void);
  });

  it("exposes the expected actions in order", () => {
    expect(actions.map((action) => action.name)).toEqual([
      "Fiabiliser les formes imprimées du patronyme de ce chercheur",
      "Fiabiliser le parcours de ce chercheur",
      "Étendre la recherche à une forme imprimée de ce chercheur",
      "Ajouter les publications de ce chercheur à partir de son ORCID",
      "Ajouter les publications de ce chercheur à partir des formes imprimées de patronyme et d’affiliations",
      "Ajouter les publications de ce chercheur à partir d’une liste de références",
      "Lister les identifiants OpenAlex de ce chercheur",
      "Lister les formes imprimées de ce chercheur",
      "Lister les affiliations de ce chercheur",
      "Lister les formes imprimées des institutions de ce chercheur",
      "Lister les publications de ce chercheur",
      "Ajouter un chercheur avec son ORCID",
      "Quitter l’application",
    ]);
  });

  it("wires visibility predicates to the expected testers", async () => {
    for (const action of actions.filter((item) => item.visible !== undefined)) {
      for (const visible of action.visible ?? []) {
        await Effect.runPromise(visible());
      }
    }

    expect(mocks.isContext).toHaveBeenCalledWith("author");
    expect(mocks.hasPendings).toHaveBeenCalledWith(
      "author",
      "display_name_alternatives",
    );
    expect(mocks.hasPendings).toHaveBeenCalledWith("author", "affiliation");
    expect(mocks.notHasPendings).toHaveBeenCalledWith(
      "author",
      "display_name_alternatives",
    );
    expect(mocks.hasAuthorAlternativeStrings).toHaveBeenCalled();
    expect(mocks.hasAcceptedValues).toHaveBeenCalled();
    expect(mocks.hasAcceptedCitationIDs).toHaveBeenCalled();
    expect(mocks.hasAcceptedWorks).toHaveBeenCalled();
  });

  it("wires action handlers to their implementations", async () => {
    for (const action of actions) {
      await Effect.runPromise(action.action(undefined));
    }

    expect(mocks.mark_alternative_strings_reliable).toHaveBeenCalledWith(
      "Sélectionnez les formes imprimées correspondantes à ce chercheur",
      { entity: "author", field: "display_name_alternatives" },
    );
    expect(mocks.mark_alternative_strings_reliable).toHaveBeenCalledWith(
      "Sélectionnez les affiliations correspondantes au chercheur",
      { entity: "author", field: "affiliation" },
    );
    expect(mocks.extendsEventsWithAlternativeStrings).toHaveBeenCalled();
    expect(mocks.retrieveWorksByORCID).toHaveBeenCalledWith(undefined);
    expect(mocks.extendsToWorks).toHaveBeenCalledWith(undefined);
    expect(mocks.retrieveWorksByDOI).toHaveBeenCalledWith(undefined);
    expect(mocks.listAcceptedCitationIDs).toHaveBeenCalled();
    expect(mocks.listAcceptedAuthorDisplayNameAlternatives).toHaveBeenCalled();
    expect(mocks.listAcceptedAuthorAffiliations).toHaveBeenCalled();
    expect(
      mocks.listAcceptedInstitutionDisplayNameAlternatives,
    ).toHaveBeenCalled();
    expect(mocks.listAcceptedWorks).toHaveBeenCalled();
    expect(mocks.insert_new_ORCID).toHaveBeenCalled();
    expect(mocks.saveStoresAndExit).toHaveBeenCalled();
  });
});
