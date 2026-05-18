import { v7 } from "uuid";
import { Context, Effect, Ref } from "effect";
import type { IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";

const initialEvents: IEvent[] = [];

class EventsStore extends Context.Tag("EventsStore")<
  EventsStore,
  Ref.Ref<IEvent[]>
>() {}
const provideEventsStore = () =>
  Effect.provideServiceEffect(EventsStore, Ref.make(initialEvents));

class MetricsStore extends Context.Tag("MetricsStore")<
  MetricsStore,
  Ref.Ref<IEvent[]>
>() {}
const provideMetricsStore = () =>
  Effect.provideServiceEffect(MetricsStore, Ref.make(initialEvents));

const initialContext: IContext = {
  type: "none",
  id: undefined,
  NAMESPACE: v7(),
  backup: false,
};

class ContextStore extends Context.Tag("ContextStore")<
  ContextStore,
  Ref.Ref<IContext>
>() {}
const provideContextStore = () =>
  Effect.provideServiceEffect(ContextStore, Ref.make(initialContext));

export {
  provideEventsStore,
  provideContextStore,
  provideMetricsStore,
  EventsStore,
  ContextStore,
  MetricsStore,
};
