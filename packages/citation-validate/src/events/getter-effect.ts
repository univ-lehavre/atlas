import { Effect, Ref } from "effect";
import { ContextStore, EventsStore } from "../store/index.js";
import type { IEvent, IEventData } from "./types.js";
import { getORCID } from "../context/index.js";
import { uniqueSorted } from "../tools/index.js";
import { filterEventsByAttributes } from "./filter.js";

/**
 * Récupère les données de tous les événements dans le store.
 * @returns Les données de tous les événements dans le store
 */
const getEventsData = (): Effect.Effect<IEventData[], never, EventsStore> =>
  Effect.gen(function* () {
    const store: Ref.Ref<IEvent[]> = yield* EventsStore;
    const events: IEvent[] = yield* Ref.get(store);
    const data: IEventData[] = events.map(getEventData);
    return data;
  });

/**
 * Récupère les données d'un événement.
 * @param event Un événement partiel contenant au moins les champs de IEventData
 * @returns Les données de l'événement
 */
const getEventData = (event: Partial<IEvent> & IEventData): IEventData => ({
  from: event.from,
  id: event.id,
  entity: event.entity,
  field: event.field,
  value: event.value,
});

const getManyEvent = (
  opts: Partial<IEvent>,
): Effect.Effect<IEvent[], never, EventsStore> =>
  Effect.gen(function* () {
    const events = yield* getEvents();
    const event: IEvent[] = filterEventsByAttributes(events, opts);
    return event;
  });

const getEvents = (): Effect.Effect<IEvent[], never, EventsStore> =>
  Effect.gen(function* () {
    const store: Ref.Ref<IEvent[]> = yield* EventsStore;
    const events: IEvent[] = yield* Ref.get(store) ?? [];
    return events;
  });

const getDisplayNameAlternatives = (): Effect.Effect<
  string[],
  Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const orcid: string | undefined = yield* getORCID();
    if (orcid === undefined) return [];
    const events = yield* getEvents();
    return uniqueSorted(
      events
        .filter(
          (e) =>
            e.id === orcid &&
            e.entity === "author" &&
            e.field === "display_name_alternatives" &&
            e.status === "accepted",
        )
        .map((e) => e.value),
    );
  });

const getAffiliations = (): Effect.Effect<
  string[],
  Error,
  EventsStore | ContextStore
> =>
  Effect.gen(function* () {
    const orcid: string | undefined = yield* getORCID();
    if (orcid === undefined) return [];
    const events = yield* getEvents();
    return uniqueSorted(
      events
        .filter(
          (e) =>
            e.id === orcid &&
            e.entity === "author" &&
            e.field === "affiliation" &&
            e.status === "accepted",
        )
        .map((e) => e.label || e.value),
    );
  });

export {
  getEventsData,
  getManyEvent,
  getEvents,
  getEventData,
  getDisplayNameAlternatives,
  getAffiliations,
};
