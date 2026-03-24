import { Config, Effect, Logger, LogLevel, RateLimiter } from "effect";
import { note } from "@clack/prompts";
import {
  action2option,
  actions,
  active_actions,
  getEvents,
  getORCID,
  isAuthorContext,
  loadStores,
  print_title,
  provideContextStore,
  provideEventsStore,
  saveStores,
  select,
  getGlobalStatuses,
  getStatusesByValue,
  getOpenAlexIDByStatusDashboard,
  provideMetricsStore,
  type Action,
  type ContextStore,
  type EventsStore,
  type IEvent,
  type MetricsStore,
} from "@univ-lehavre/atlas-validate-openalex";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import { NodeRuntime } from "@effect/platform-node";
import { DevTools } from "@effect/experimental";
import type { ConfigError } from "effect/ConfigError";

const start = (): Effect.Effect<
  void,
  Error | ConfigError,
  ContextStore | EventsStore | MetricsStore
> =>
  Effect.gen(function* () {
    yield* loadStores();
    yield* Effect.forever(ask());
  });

const dashboard = (): Effect.Effect<void, Error, ContextStore | EventsStore> =>
  Effect.gen(function* () {
    if (!(yield* isAuthorContext())) return;
    const orcid: ORCID = yield* getORCID();
    const events: IEvent[] = yield* getEvents();
    const board: string[] = [];

    const authors: string | null = getOpenAlexIDByStatusDashboard(
      orcid,
      events,
    );
    if (authors !== null)
      board.push(`${authors} identifiants OpenAlex d'auteurs`);

    const display_name_alternatives: string | null = getStatusesByValue(
      orcid,
      "author",
      "display_name_alternatives",
      events,
    );
    if (display_name_alternatives !== null)
      board.push(`${display_name_alternatives} formes imprimées d'auteurs`);

    const affiliations: string | null = getStatusesByValue(
      orcid,
      "author",
      "affiliation",
      events,
    );
    if (affiliations !== null) board.push(`${affiliations} affiliations`);

    const affiliations_display_name_alternatives: string | null =
      getStatusesByValue(
        orcid,
        "institution",
        "display_name_alternatives",
        events,
      );
    if (affiliations_display_name_alternatives !== null)
      board.push(
        `${affiliations_display_name_alternatives} formes imprimées d'affiliations`,
      );

    const works: string | null = getStatusesByValue(
      orcid,
      "work",
      "id",
      events,
    );
    if (works !== null) board.push(`${works} publications`);

    const global = getGlobalStatuses(orcid, events);
    if (global !== null) board.push(`${global} objets`);

    if (board.length > 0)
      note(board.join("\n"), "Tableau de bord", {
        format: (line: string) => `${line}`,
      });
  });

const ask = (): Effect.Effect<
  void,
  Error | ConfigError,
  ContextStore | EventsStore | MetricsStore
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const rateLimit = JSON.parse(yield* Config.string("RATE_LIMIT"));
      const rateLimiter: RateLimiter.RateLimiter =
        yield* RateLimiter.make(rateLimit);
      yield* print_title();
      yield* dashboard();
      const actives: Action[] = yield* active_actions();
      const options = actives.map(action2option);
      const selected_action_value: string = (yield* select(
        "Que souhaitez-vous faire ?",
        options,
      )).toString();
      const action: Action | undefined = actions.find(
        (action) => action.name === selected_action_value,
      );
      if (action) {
        yield* action.action(rateLimiter);
      } else {
        console.log("Action non trouvée");
      }
      yield* saveStores();
    }),
  );

const runnable = start().pipe(
  provideEventsStore(),
  provideContextStore(),
  provideMetricsStore(),
);

const DevToolsLive = DevTools.layer();

runnable.pipe(
  Logger.withMinimumLogLevel(LogLevel.None),
  Effect.provide(DevToolsLive),
  NodeRuntime.runMain,
);
