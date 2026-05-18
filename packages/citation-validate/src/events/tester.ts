import { getEvents } from "./index.js";
import { Effect } from "effect";
import { EventsStore } from "../store/index.js";
import { filterPending } from "./filter.js";
import type { IEvent } from "./types.js";

const hasPending = (events: IEvent[], opts: Partial<IEvent>): boolean =>
  filterPending(events, opts).length > 0;

const hasORCID = (orcid: string): Effect.Effect<boolean, never, EventsStore> =>
  Effect.gen(function* () {
    const events = yield* getEvents();
    return events.some((e) => e.entity === "author" && e.id === orcid);
  });

export { hasPending, hasORCID };
