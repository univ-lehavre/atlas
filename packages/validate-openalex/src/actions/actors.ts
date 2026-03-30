import { Effect, Either, RateLimiter, ConfigError } from "effect";
import { getContext, getORCID } from "../context/index.js";
import { setEventsStore } from "../store/setter.js";
import { getAuthorAlternativeStrings } from "./tester.js";
import { text, select, events2options, confirm } from "../prompt/index.js";
import { asOpenAlexID, asORCID } from "@univ-lehavre/atlas-openalex-types";
import {
  searchAuthorByName,
  searchAuthorByORCID,
  searchWorksByAuthorIDs,
  searchWorksByDOI,
  searchWorksByORCID,
} from "../fetch/index.js";
import {
  ContextStore,
  EventsStore,
  updateContextStore,
  updateEventsStore,
} from "../store/index.js";
import {
  buildAuthorResultsPendingEvents,
  buildEvent,
  buildReference,
  getEvents,
  getManyEvent,
  getOpenAlexIDs,
  getStatusOfAffiliation,
  getStatusOfAuthorDisplayNameAlternative,
  getStatusOfWork,
  isInteresting,
  removeDuplicates,
  updateNewEventsWithExistingMetadata,
} from "../events/index.js";
import type {
  AuthorsResult,
  OpenAlexID,
  ORCID,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import type { IEvent, Status } from "../events/types.js";
import type { IContext } from "../context/types.js";
import { log } from "@clack/prompts";
import { getAffiliationLabel } from "../oa/getter.js";
import fs from "node:fs";

const FullORCIDRegex = /^https:\/\/orcid.org\/\d{4}-\d{4}-\d{4}-\d{3}(\d|X)$/;
const ORCIDRegex = /^\d{4}-\d{4}-\d{4}-\d{3}(\d|X)$/;

const insert_new_ORCID = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const orcid_raw = (yield* text(
      "Saisissez l’ORCID d’un chercheur",
      "0000-0000-0000-0000",
      (value: string | undefined) => {
        if (value === undefined) return "L’ORCID est requis";
        const trimmed = value.trim();
        if (trimmed === "") return "L’ORCID est requis";
        if (ORCIDRegex.test(trimmed) || FullORCIDRegex.test(trimmed)) return;
        return "L’ORCID doit être au format 0000-0000-0000-0000";
      },
    ))
      .toString()
      .trim();
    const orcid = FullORCIDRegex.test(orcid_raw)
      ? asORCID(orcid_raw)
      : asORCID(`https://orcid.org/${orcid_raw}`);
    yield* updateContextStore({ type: "author", id: orcid });
    const authors = yield* searchAuthorByORCID([orcid]);
    const items = yield* buildAuthorResultsPendingEvents([...authors]);
    yield* updateEventsStore(items);
  });

const extendsEventsWithAlternativeStrings = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const orcid: ORCID = yield* getORCID();
    const authorAlternativeStringEvents: IEvent[] =
      yield* getAuthorAlternativeStrings();
    const options = events2options(authorAlternativeStringEvents);
    const selected: symbol | string = yield* select(
      "Sélectionnez la forme imprimée de l'auteur à rechercher",
      options,
    );
    if (typeof selected !== "string") throw new Error("Sélection invalide");

    // Mise à jour de la date d'extension des événements existants
    const eventsToUpdate = yield* getManyEvent({
      id: orcid,
      entity: "author",
      field: "display_name_alternatives",
      value: selected,
    });
    const hasBeenExtendedAt = new Date().toISOString();
    const updatedEvents = eventsToUpdate.map((event) => ({
      ...event,
      hasBeenExtendedAt,
    }));
    yield* updateEventsStore(updatedEvents);

    const authors: readonly AuthorsResult[] = yield* searchAuthorByName([
      selected,
    ]);
    const newItems: IEvent[] = yield* buildAuthorResultsPendingEvents([
      ...authors,
    ]);
    const events: IEvent[] = yield* getEvents();
    // remove from newItems the events that are already in events
    const filteredNewItems = updateNewEventsWithExistingMetadata(
      events,
      newItems.filter(
        (newItem) =>
          !events.some(
            (event) => event.dataIntegrity === newItem.dataIntegrity,
          ),
      ),
    );
    const uniques = removeDuplicates(filteredNewItems);
    if (uniques.length > 0) yield* updateEventsStore(uniques);
  });

const hasEventsForThisORCID = (): Effect.Effect<
  boolean,
  Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const orcid: string = yield* getORCID();
    const events: IEvent[] = yield* getEvents();
    if (events.length === 0) return false;
    const hasSome: boolean = events.some(
      (event) => event.entity === "author" && event.id === orcid,
    );
    return hasSome;
  });

const removeAuthorPendings = (): Effect.Effect<
  void,
  Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const orcid: ORCID = yield* getORCID();
    const events = yield* getEvents();
    const notPendings = events.filter(
      (event) => !isInteresting(event, { id: orcid, status: "pending" }),
    );
    yield* setEventsStore(notPendings);
  });

const checkWork = (
  orcid: ORCID,
  authorOpenalexID: OpenAlexID,
  work: WorksResult,
): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    // On regarde chaque publication
    let isRejected: boolean = false;

    const authorships = work.authorships;
    if (authorships.length === 0) return;

    const authorship = authorships.find(
      (authorship) => authorship.author.id === authorOpenalexID,
    );
    if (authorship === undefined) return;

    const status = getStatusOfAuthorDisplayNameAlternative(
      authorship.raw_author_name,
      orcid,
      yield* getEvents(),
    );
    if (status === "rejected") {
      isRejected = true;
    } else if (status === undefined || status === "pending") {
      const confirmed = yield* confirm(
        `Est-ce que "${authorship.raw_author_name}" est une forme imprimée de ce chercheur ?`,
      );
      if (typeof confirmed !== "boolean") throw new Error("Réponse invalide");
      if (!confirmed) isRejected = true;
    }
    if (status !== "accepted")
      yield* updateEventsStore([
        yield* buildEvent({
          from: authorOpenalexID,
          id: orcid,
          entity: "author",
          field: "display_name_alternatives",
          value: authorship.raw_author_name,
          label: authorship.author.display_name ?? undefined,
          status: isRejected ? "rejected" : "accepted",
        }),
      ]);
    // On passe aux affiliations
    const institutions: {
      id: string;
      label: string;
      status: Status | undefined;
    }[] = [];
    const raw_affiliation_strings: string[] = [];
    for (const affiliation of authorship.affiliations) {
      raw_affiliation_strings.push(affiliation.raw_affiliation_string);
      // On regarde s’il n’y a pas déjà une affiliation rejetée
      for (const institutionID of affiliation.institution_ids) {
        const status: Status | undefined = getStatusOfAffiliation(
          institutionID,
          orcid,
          yield* getEvents(),
        );
        if (status === "rejected") isRejected = true;
        const label = getAffiliationLabel(work, institutionID);
        institutions.push({
          id: institutionID,
          label: Either.isRight(label) ? label.right : institutionID,
          status,
        });
      }
    }
    if (
      !isRejected &&
      institutions.length > 0 &&
      institutions.some(
        (inst) => inst.status === undefined || inst.status === "pending",
      )
    ) {
      log.info("Co-affiliations");
      log.message("Noms officiels :");
      for (const inst of institutions) log.message(`- ${inst.label}`);
      log.message("Formes imprimées :");
      for (const raw of raw_affiliation_strings) log.message(`- ${raw}`);
      const selected = yield* confirm(
        "Est-ce que ces affiliations correspondent à celle de ce chercheur ?",
      );
      if (typeof selected !== "boolean") throw new Error("Réponse invalide");
      if (!selected) isRejected = true;
    }
    for (const institution of institutions) {
      const status = getStatusOfAffiliation(
        institution.id,
        orcid,
        yield* getEvents(),
      );
      if (status !== "accepted") {
        yield* updateEventsStore([
          yield* buildEvent({
            from: authorOpenalexID,
            id: orcid,
            entity: "author",
            field: "affiliation",
            value: institution.id,
            label: institution.label,
            status: isRejected ? "rejected" : "accepted",
          }),
        ]);
      }
    }
    for (const raw_affiliation_string of raw_affiliation_strings) {
      yield* updateEventsStore([
        yield* buildEvent({
          from: authorOpenalexID,
          id: orcid, // Irrelevant here
          entity: "institution",
          field: "display_name_alternatives",
          value: raw_affiliation_string,
          status: isRejected ? "rejected" : "accepted",
        }),
      ]);
    }
    const statusWork = getStatusOfWork(work.id, orcid, yield* getEvents());
    if (statusWork !== "accepted")
      yield* updateEventsStore([
        yield* buildEvent({
          from: authorOpenalexID,
          id: orcid,
          entity: "work",
          field: "id",
          value: work.id,
          label: buildReference(work),
          status: isRejected ? "rejected" : "accepted",
        }),
      ]);
  });

const extendsToWorks = (
  rateLimiter: RateLimiter.RateLimiter | undefined,
): Effect.Effect<
  void,
  ConfigError.ConfigError | Error,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    if (rateLimiter === undefined) throw new Error("RateLimiter is required");
    const { id }: IContext = yield* getContext();
    if (id === undefined) return;
    const openalexIDs: OpenAlexID[] = getOpenAlexIDs(id, yield* getEvents());
    for (const authorOpenalexID of openalexIDs) {
      log.message(
        `Recherche des publications pour l’identifiant OpenAlex ${authorOpenalexID}`,
      );
      // On travaille sur un chercheur
      const works: readonly WorksResult[] = yield* rateLimiter(
        searchWorksByAuthorIDs([authorOpenalexID]),
      );
      if (works.length === 0) continue;
      for (const work of works) yield* checkWork(id, authorOpenalexID, work);
    }
  });

export const retrieveWorksByORCID = (
  rateLimiter: RateLimiter.RateLimiter | undefined,
): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    if (rateLimiter === undefined) throw new Error("RateLimiter is required");
    const { id }: IContext = yield* getContext();
    if (id === undefined) return;
    log.message(`Recherche des publications pour l’ORCID ${id}`);
    const works: readonly WorksResult[] = yield* rateLimiter(
      searchWorksByORCID(id),
    );
    for (const work of works) {
      const authorship = work.authorships.find(
        (auth) => auth.author.orcid === id,
      );
      if (authorship === undefined) continue;
      const authorOpenalexID = asOpenAlexID(authorship.author.id);
      yield* checkWork(id, authorOpenalexID, work);
    }
  });

const retrieveWorksByDOI = (rateLimiter: RateLimiter.RateLimiter | undefined) =>
  Effect.gen(function* () {
    if (rateLimiter === undefined) throw new Error("RateLimiter is required");
    const { id }: IContext = yield* getContext();
    if (id === undefined) return;

    const raw = yield* Effect.tryPromise({
      try: () => fs.promises.readFile("doi.txt", { encoding: "utf8" }),
      catch: (cause) => new Error(`Error while reading doi.txt`, { cause }),
    });

    if (typeof raw !== "string" || raw.trim() === "") return;
    const dois = raw.match(/10.\d{4,9}\/[-._;()/:A-Z0-9]+/gi);
    if (dois === null || dois.length === 0) return;
    log.message(
      `Téléchargement de ${dois.length} DOI, trouvés dans le fichier doi.txt`,
    );
    for (const doi of dois) {
      const works: readonly WorksResult[] = yield* rateLimiter(
        searchWorksByDOI([doi]),
      );
      for (const work of works) {
        const authorship = work.authorships.find(
          (auth) => auth.author.orcid === id,
        );
        if (authorship === undefined) continue;
        const authorOpenalexID = asOpenAlexID(authorship.author.id);
        yield* checkWork(id, authorOpenalexID, work);
      }
    }
  });

export {
  insert_new_ORCID,
  removeAuthorPendings,
  hasEventsForThisORCID,
  extendsEventsWithAlternativeStrings,
  extendsToWorks,
  retrieveWorksByDOI,
};
