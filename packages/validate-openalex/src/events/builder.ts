import { Effect } from "effect";
import { getORCID } from "../context/index.js";
import { ContextStore, EventsStore } from "../store/index.js";
import { getEventData, getEvents } from "./getter-effect.js";
import { buildIntegrity } from "../tools/index.js";
import type { IEvent } from "./types.js";
import { updateNewEventsWithExistingMetadata } from "./index.js";
import { asOpenAlexID } from "@univ-lehavre/atlas-openalex-types";
import type {
  AuthorsResult,
  IInstitution,
  ORCID,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";

const buildEvent = (
  partial: Omit<
    IEvent,
    "dataIntegrity" | "createdAt" | "updatedAt" | "hasBeenExtendedAt"
  >,
): Effect.Effect<IEvent, never, ContextStore> =>
  Effect.gen(function* () {
    const data = getEventData(partial);
    const dataIntegrity: string = yield* buildIntegrity(data);
    const createdAt: string = new Date().toISOString();
    const event: IEvent = {
      ...partial,
      dataIntegrity,
      createdAt,
      updatedAt: createdAt,
      hasBeenExtendedAt: "never",
    };
    return event;
  });

const buildPendingAuthorEvent = (
  partial: Omit<
    IEvent,
    "status" | "dataIntegrity" | "createdAt" | "updatedAt" | "hasBeenExtendedAt"
  >,
): Effect.Effect<IEvent, never, ContextStore> =>
  Effect.gen(function* () {
    const event: IEvent = yield* buildEvent({
      ...partial,
      status: "pending",
    });
    return event;
  });

const buildAuthorResultsPendingEvents = (
  authors: AuthorsResult[],
): Effect.Effect<IEvent[], Error, ContextStore | EventsStore> =>
  Effect.gen(function* () {
    const items: IEvent[] = [];
    const orcid: ORCID = yield* getORCID();
    if (!orcid) throw new Error("No orcid in context");
    for (const author of authors) {
      const openalexID = asOpenAlexID(author.id);
      // Traitement des données personnelles de l'auteur
      for (const display_name_alternative of author.display_name_alternatives ??
        []) {
        const event: IEvent = yield* buildPendingAuthorEvent({
          from: openalexID,
          id: orcid,
          entity: "author",
          field: "display_name_alternatives",
          value: display_name_alternative,
        });
        items.push(event);
      }
      // Traitement des affiliations
      for (const affiliation of author.affiliations) {
        const institution: IInstitution = affiliation.institution;
        const event: IEvent = yield* buildPendingAuthorEvent({
          from: openalexID,
          id: orcid,
          entity: "author",
          field: "affiliation",
          value: institution.id,
          label: institution.display_name,
        });
        items.push(event);
      }
    }
    const events = yield* getEvents();
    const updated = updateNewEventsWithExistingMetadata(events, items);
    return updated;
  });

const buildReference = (work: WorksResult, full: boolean = false): string => {
  const authors = work.authorships
    .flatMap((a) => a.author)
    .map((au) => au.display_name)
    .join(", ");
  const ref = full
    ? `${authors} (${work.publication_year}). ${work.title}. DOI: ${work.doi}. OpenAlex ID: ${work.id}`
    : `${work.publication_year} - ${work.title}`;
  return ref;
};

export { buildAuthorResultsPendingEvents, buildEvent, buildReference };
