import { Effect } from "effect";
import { getContext } from "../context/index.js";
import {
  getEvents,
  getOpenAlexIDs,
  hasPending,
  isInteresting,
} from "../events/index.js";
import { ContextStore, EventsStore } from "../store/index.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import type { IEntity, IField, IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";

const hasPendings = (
  entity: IEntity,
  field?: IField,
): Effect.Effect<boolean, never, ContextStore | EventsStore> =>
  Effect.gen(function* () {
    const { type, id }: IContext = yield* getContext();
    if (type !== entity) return false;
    const events: IEvent[] = yield* getEvents();
    return field === undefined
      ? events.some((event) =>
          isInteresting(event, { id, entity, status: "pending" }),
        )
      : hasPending(events, {
          id,
          entity,
          field,
        });
  });

const notHasPendings = (
  entity: IEntity,
  field?: IField,
): Effect.Effect<boolean, never, ContextStore | EventsStore> =>
  Effect.gen(function* () {
    const has = yield* hasPendings(entity, field);
    return !has;
  });

const hasAcceptedValues = (): Effect.Effect<
  boolean,
  never,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const { type, id }: IContext = yield* getContext();
    if (type !== "author") return false;
    if (id === undefined) return false;
    const events: IEvent[] = yield* getEvents();
    return getOpenAlexIDs(id, events).length > 0;
  });

const filterAuthorAlternativeStringsToExtend = (
  id: ORCID,
): Partial<IEvent> => ({
  hasBeenExtendedAt: "never",
  id,
  entity: "author",
  field: "display_name_alternatives",
  status: "accepted",
});

const getAuthorAlternativeStrings = (): Effect.Effect<
  IEvent[],
  never,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const { type, id }: IContext = yield* getContext();
    if (type !== "author") return [];
    if (id === undefined) return [];
    const events: IEvent[] = yield* getEvents();
    return events.filter((event) =>
      isInteresting(event, filterAuthorAlternativeStringsToExtend(id)),
    );
  });

const hasAuthorAlternativeStrings = (): Effect.Effect<
  boolean,
  never,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const { type, id }: IContext = yield* getContext();
    if (type !== "author") return false;
    if (id === undefined) return false;
    const events: IEvent[] = yield* getEvents();
    return events.some((event) =>
      isInteresting(event, filterAuthorAlternativeStringsToExtend(id)),
    );
  });

const isContext = (
  entity: IEntity,
): Effect.Effect<boolean, never, ContextStore | EventsStore> =>
  Effect.gen(function* () {
    const { type }: IContext = yield* getContext();
    return type === entity;
  });

export {
  hasPendings,
  hasAcceptedValues,
  isContext,
  notHasPendings,
  hasAuthorAlternativeStrings,
  getAuthorAlternativeStrings,
};
