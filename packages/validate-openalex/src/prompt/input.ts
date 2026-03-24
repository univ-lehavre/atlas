import color from "picocolors";
import { Effect } from "effect";
import { getContext } from "../context/index.js";
import { ContextStore, EventsStore } from "../store/index.js";
import {
  type Option,
  intro,
  outro,
  confirm as confirm_prompt,
  select as select_prompt,
  multiselect as multiselect_prompt,
  taskLog as taskLog_prompt,
  text as text_prompt,
  autocompleteMultiselect as autocompleteMultiselect_prompt,
} from "@clack/prompts";
import type { IContext } from "../context/types.js";
import { hasEventsForThisORCID } from "../actions/index.js";
import {
  getAcceptedAuthorAffiliations,
  getAcceptedAuthorDisplayNameAlternatives,
  getAcceptedInstitutionDisplayNameAlternatives,
  getAcceptedWorks,
  getEvents,
  getOpenAlexIDs,
} from "../events/index.js";
import type { IEvent } from "../events/types.js";

const print_title = (): Effect.Effect<
  void,
  Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const hasORCIDEvents: boolean = id ? yield* hasEventsForThisORCID() : false;
    const title: string = id && hasORCIDEvents ? `${id}` : "OpenAlex";
    intro(`${color.bgCyan(color.black(` ${title} `))}\n`);
  });

const end = (): void => outro(`${color.bgGreen(color.black(` Fin `))}`);

const confirm = (
  message: string,
): Effect.Effect<boolean | symbol, Error, never> =>
  Effect.tryPromise({
    try: () =>
      confirm_prompt({
        message,
      }),
    catch: (cause) => new Error("Erreur lors de la confirmation", { cause }),
  });

const select = (
  message: string,
  options: Option<string>[],
): Effect.Effect<string | symbol, Error, never> =>
  Effect.tryPromise({
    try: () =>
      select_prompt({
        message,
        options,
      }),
    catch: (cause) => new Error("Erreur lors de la sélection", { cause }),
  });

const multiselect = (
  message: string,
  required: boolean,
  options: Option<string>[],
): Effect.Effect<symbol | string[], Error, never> =>
  Effect.tryPromise({
    try: () =>
      multiselect_prompt({
        message,
        options,
        required,
      }),
    catch: (cause) => new Error("Erreur lors de la sélection", { cause }),
  });

const autocompleteMultiselect = (
  message: string,
  required: boolean,
  options: Option<string>[],
): Effect.Effect<symbol | string[], Error, never> =>
  Effect.tryPromise({
    try: () =>
      autocompleteMultiselect_prompt({
        message,
        options,
        required,
        placeholder: "Taper pour filtrer l'option...",
        maxItems: 20,
      }),
    catch: (cause) => new Error("Erreur lors de la sélection", { cause }),
  });

const text = (
  message: string,
  placeholder: string,
  validate: (value: string | undefined) => string | undefined | Error,
): Effect.Effect<string | symbol, Error, never> =>
  Effect.tryPromise({
    try: () =>
      text_prompt({
        message,
        placeholder,
        validate,
      }),
    catch: () => new Error("Erreur lors de la saisie"),
  });

const taskLog = (title: string, list: string[]) => {
  const task = taskLog_prompt({ title });
  for (const item of list) {
    task.message(item);
  }
};

export const listAcceptedOpenAlexIDs = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    if (!id) return;
    const events: IEvent[] = yield* getEvents();
    const openAlexIDs: string[] = getOpenAlexIDs(id, events);
    yield* autocompleteMultiselect(
      "Identifiants OpenAlex acceptés (appuyez sur entrée pour continuer)",
      false,
      openAlexIDs.map((a) => ({ value: a })),
    );
  });

const listAcceptedAuthorDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const alternatives: string[] =
      yield* getAcceptedAuthorDisplayNameAlternatives();
    yield* autocompleteMultiselect(
      "Formes imprimées d’auteurs acceptées (appuyez sur entrée pour continuer)",
      false,
      alternatives.map((a) => ({ value: a })),
    );
  });

const listAcceptedAuthorAffiliations = () =>
  Effect.gen(function* () {
    const affiliations: string[] = yield* getAcceptedAuthorAffiliations();
    yield* autocompleteMultiselect(
      "Affiliations acceptées (appuyez sur entrée pour continuer)",
      false,
      affiliations.map((a) => ({ value: a })),
    );
  });

const listAcceptedInstitutionDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const alternatives: string[] =
      yield* getAcceptedInstitutionDisplayNameAlternatives();
    yield* autocompleteMultiselect(
      "Formes imprimées d’affiliations acceptées (appuyez sur entrée pour continuer)",
      false,
      alternatives.map((a) => ({ value: a })),
    );
  });

const listAcceptedWorks = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    if (!id) return;
    const events: IEvent[] = yield* getEvents();
    const works: string[] = getAcceptedWorks(id, events)
      .map((e) => e.title)
      .filter((e) => e !== undefined)
      .sort((a, b) => a.localeCompare(b));
    yield* autocompleteMultiselect(
      "publications acceptées (appuyez sur entrée pour continuer)",
      false,
      works.map((a) => ({ value: a })),
    );
  });

export {
  select,
  multiselect,
  text,
  autocompleteMultiselect,
  print_title,
  end,
  confirm,
  taskLog,
  listAcceptedAuthorDisplayNameAlternatives,
  listAcceptedAuthorAffiliations,
  listAcceptedInstitutionDisplayNameAlternatives,
  listAcceptedWorks,
};
