import color from "picocolors";
import { uniqueSorted } from "../tools/index.js";
import {
  asOpenAlexID,
  type OpenAlexID,
  type ORCID,
} from "@univ-lehavre/atlas-openalex-types";
import type { IEntity, IEvent, IField, Status } from "./types.js";
import { Effect } from "effect";
import type { IContext } from "../context/types.js";
import { getContext } from "../context/index.js";
import { getEvents } from "./getter-effect.js";

/**
 * Return the intersection of two string arrays.
 *
 * The result contains values from `arr1` that are also present in `arr2`.
 * The order of items in the returned array follows the order in `arr1`.
 * Comparison is done with strict equality (case-sensitive).
 *
 * This function is non-mutating: input arrays are not modified.
 *
 * @param arr1 - The array whose elements are filtered by membership in `arr2`.
 * @param arr2 - The array used to test membership of `arr1`'s elements.
 * @returns A new array containing the elements present in both `arr1` and `arr2`.
 *
 * @example
 * // returns ['b', 'c']
 * intersect(['a', 'b', 'c'], ['b', 'c', 'd']);
 */
const intersect = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter((value) => set2.has(value));
};

const union = <T>(arr1: T[], arr2: T[]): T[] => {
  const set = new Set(arr1);
  arr2.forEach((value) => set.add(value));
  return Array.from(set);
};

const outerRight = <T>(arr1: T[], arr2: T[]): T[] => {
  const set1 = new Set(arr1);
  return arr2.filter((value) => !set1.has(value));
};

const outerLeft = <T>(arr1: T[], arr2: T[]): T[] => {
  const set2 = new Set(arr2);
  return arr1.filter((value) => !set2.has(value));
};

/**
 * Extract OpenAlex IDs for an author identified by an ORCID from a set of events.
 *
 * This function:
 * 1. Filters `events` for accepted `author` affiliation entries whose `id` matches the provided `orcid`
 *    and collects their `from` values into `affiliations`.
 * 2. Filters `events` for accepted `author` display name alternatives entries whose `id` matches the provided `orcid`
 *    and collects their `from` values into `display_name_alternatives`.
 * 3. Computes the intersection of those two collections.
 * 4. If the intersection is non-empty, returns the result deduplicated and sorted via `uniqueSorted`.
 *    Otherwise, returns an empty array.
 *
 * Notes:
 * - Matching uses strict equality for `id`, `entity`, `field`, and `status` (case-sensitive).
 * - Relies on the `IEvent` shape to contain `id`, `entity`, `field`, `status`, and `from` properties.
 * - `uniqueSorted` is used to deduplicate and sort the intersection before returning.
 *
 * @param orcid - The ORCID identifier for the author to look up.
 * @param events - An array of events to search through.
 * @returns An array of OpenAlex IDs (strings) that appear both as accepted affiliations and
 *          as accepted display name alternatives for the given author ORCID. Returns [] if none found.
 *
 * @example
 * // returns ['A1', 'A2'] if both appear in accepted affiliation and display_name_alternatives events
 * getOpenAlexIDs('0000-0001-2345-6789', events);
 */
const getOpenAlexIDs = (orcid: ORCID, events: IEvent[]): OpenAlexID[] => {
  if (events.length === 0) return [];

  const affiliations = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "author" &&
        e.field === "affiliation" &&
        e.status === "accepted",
    )
    .map((e) => e.from);

  const display_name_alternatives = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "author" &&
        e.field === "display_name_alternatives" &&
        e.status === "accepted",
    )
    .map((e) => e.from);

  const intersectIDs: OpenAlexID[] = intersect<OpenAlexID>(
    affiliations,
    display_name_alternatives,
  );

  const works = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "work" &&
        e.field === "id" &&
        e.status === "accepted",
    )
    .map((e) => e.from);

  const unionIDs: OpenAlexID[] = union<OpenAlexID>(intersectIDs, works);

  const uniques: OpenAlexID[] = uniqueSorted<OpenAlexID>(unionIDs);

  return uniques;
};

export const getPendingOpenAlexIDs = (
  orcid: ORCID,
  events: IEvent[],
): OpenAlexID[] => {
  if (events.length === 0) return [];

  const affiliations = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "author" &&
        e.field === "affiliation" &&
        (e.status === "accepted" || e.status === "pending"),
    )
    .map((e) => e.from);

  const display_name_alternatives = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "author" &&
        e.field === "display_name_alternatives" &&
        (e.status === "accepted" || e.status === "pending"),
    )
    .map((e) => e.from);

  const unionIDs: OpenAlexID[] = union<OpenAlexID>(
    affiliations,
    display_name_alternatives,
  );
  const accepted = getOpenAlexIDs(orcid, events);
  const outer = outerRight<OpenAlexID>(accepted, unionIDs);
  const uniques: OpenAlexID[] = uniqueSorted<OpenAlexID>(outer);

  return uniques;
};

export const getRejectedOpenAlexIDs = (
  orcid: ORCID,
  events: IEvent[],
): OpenAlexID[] => {
  if (events.length === 0) return [];

  const affiliations = events
    .filter(
      (e) =>
        e.id === orcid && e.entity === "author" && e.field === "affiliation",
    )
    .map((e) => e.from);

  const display_name_alternatives = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "author" &&
        e.field === "display_name_alternatives",
    )
    .map((e) => e.from);

  const unionIDs: OpenAlexID[] = union<OpenAlexID>(
    affiliations,
    display_name_alternatives,
  );
  const accepted = getOpenAlexIDs(orcid, events);
  const pending = getPendingOpenAlexIDs(orcid, events);
  const acceptedOrPending = union<OpenAlexID>(accepted, pending);
  const outer = outerRight<OpenAlexID>(acceptedOrPending, unionIDs);
  const uniques: OpenAlexID[] = uniqueSorted<OpenAlexID>(outer);

  return uniques;
};

const getAcceptedAuthorDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return [];
    const names: string[] = events
      .filter(
        (e) =>
          e.id === id &&
          e.entity === "author" &&
          e.field === "display_name_alternatives" &&
          e.status === "accepted",
      )
      .map((e) => e.value);
    const uniques = uniqueSorted<string>(names);
    return uniques;
  });

const hasAcceptedAuthorDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const names = yield* getAcceptedAuthorDisplayNameAlternatives();
    return names.length > 0;
  });

const getAcceptedAuthorAffiliations = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return [];
    const names: string[] = events
      .filter(
        (e) =>
          e.id === id &&
          e.entity === "author" &&
          e.field === "affiliation" &&
          e.status === "accepted",
      )
      .map((e) => `${e.label} (${e.value})`);
    const uniques = uniqueSorted<string>(names);
    return uniques;
  });

const hasAcceptedAuthorAffiliations = () =>
  Effect.gen(function* () {
    const names = yield* getAcceptedAuthorAffiliations();
    return names.length > 0;
  });

const getAcceptedAuthorInstitutions = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return [];
    const names: string[] = events
      .filter(
        (e) =>
          e.id === id &&
          e.entity === "institution" &&
          e.field === "display_name_alternatives" &&
          e.status === "accepted",
      )
      .map((e) => `${e.label} (${e.value})`);
    const uniques = uniqueSorted<string>(names);
    return uniques;
  });

const hasAcceptedAuthorInstitutions = () =>
  Effect.gen(function* () {
    const names = yield* getAcceptedAuthorInstitutions();
    return names.length > 0;
  });

const getAcceptedInstitutionDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return [];
    const names: string[] = events
      .filter(
        (e) =>
          e.id === id &&
          e.entity === "institution" &&
          e.field === "display_name_alternatives" &&
          e.status === "accepted",
      )
      .map((e) => e.value);
    const uniques = uniqueSorted<string>(names);
    return uniques;
  });

const hasAcceptedInstitutionDisplayNameAlternatives = () =>
  Effect.gen(function* () {
    const names = yield* getAcceptedInstitutionDisplayNameAlternatives();
    return names.length > 0;
  });

const getAcceptedWorks = (
  orcid: ORCID,
  events: IEvent[],
): {
  id: string;
  title: string | undefined;
}[] => {
  if (events.length === 0) return [];
  const works: {
    id: string;
    title: string | undefined;
  }[] = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "work" &&
        e.field === "id" &&
        e.status === "accepted",
    )
    .map((e) => ({ id: e.value, title: e.label }));
  return works;
};

export const hasAcceptedOpenAlexIDs = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return false;
    const ids = getOpenAlexIDs(id, events);
    return ids.length > 0;
  });

const hasAcceptedWorks = () =>
  Effect.gen(function* () {
    const { id }: IContext = yield* getContext();
    const events: IEvent[] = yield* getEvents();
    if (!id) return false;
    const works = getAcceptedWorks(id, events);
    return works.length > 0;
  });

const getStatuses = (
  id: ORCID,
  entity: IEntity,
  field: IField,
  events: IEvent[],
): string | null => {
  const statuses: {
    [key: string]: number;
  } = events
    .filter((e) => e.id === id && e.entity === entity && e.field === field)
    .map((e) => e.status)
    // compte le nombre d’occurrences de chaque status
    .reduce((acc: { [key: string]: number }, curr: string) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
  const accepted = statuses["accepted"] || "·";
  const pending = statuses["pending"] || "·";
  const rejected = statuses["rejected"] || "·";

  const maxDigits = 4;

  const values = [
    color.blueBright(String(accepted).padStart(maxDigits, " ")),
    color.yellowBright(String(pending).padStart(maxDigits, " ")),
    color.redBright(String(rejected).padStart(maxDigits, " ")),
  ].join(" ");

  const status =
    statuses["accepted"] === 0 &&
    statuses["pending"] === 0 &&
    statuses["rejected"] === 0
      ? null
      : values;

  return status;
};

const getOpenAlexIDByStatus = (orcid: ORCID, events: IEvent[]) => {
  const statuses = events
    .filter(
      (e) =>
        e.id === orcid &&
        ((e.entity === "author" &&
          (e.field === "affiliation" ||
            e.field === "display_name_alternatives")) ||
          (e.entity === "work" && e.field === "id")),
    )
    .map((e) => ({
      openalexID: e.from,
      status: e.status,
      entity: e.entity,
      field: e.field,
    }));

  // Pour attribuer un statut global à chaque OpenAlexID, on utilise la règle suivante :
  // - Si un OpenAlexID a au moins un statut "accepted", pour les fields "affiliation" ou "display_name_alternatives" de l’entité "author", alors son statut global est "accepted".
  // - Sinon, s’il a au moins un statut "pending" pour ces mêmes fields, alors son statut global est "pending".
  // - Sinon, s’il a au moins un statut "rejected" pour ces mêmes fields, alors son statut global est "rejected".
  // - Si un OpenAlexID n’a que des statuts pour d’autres fields ou entités, on l’ignore.
  // On ignore les events qui ne concernent pas l’entité "author" et les fields "affiliation" ou "display_name_alternatives"

  // pour chaque OpenAlexID, on vérifie si les couples ("affiliation" et "display_name_alternatives") existent avec un même statut "accepted" ou "pending"
  const grouped: { [key: string]: Set<string> } = {};
  statuses.forEach(({ openalexID, status, entity, field }) => {
    if (!grouped[openalexID]) {
      grouped[openalexID] = new Set();
    }
    grouped[openalexID].add(`${entity}|${field}|${status}`);
  });

  const result: Map<OpenAlexID, Status> = new Map();

  Object.keys(grouped).forEach((openalexID) => {
    const statusSet = grouped[openalexID];
    if (!statusSet) return;
    const hasAcceptedAffiliation = statusSet.has("author|affiliation|accepted");
    const hasAcceptedDisplayName = statusSet.has(
      "author|display_name_alternatives|accepted",
    );
    const hasAcceptedWork = statusSet.has("work|id|accepted");
    const hasPendingAffiliation = statusSet.has("author|affiliation|pending");
    const hasPendingDisplayName = statusSet.has(
      "author|display_name_alternatives|pending",
    );
    const hasPendingWork = statusSet.has("work|id|pending");
    const hasRejectedAffiliation = statusSet.has("author|affiliation|rejected");
    const hasRejectedDisplayName = statusSet.has(
      "author|display_name_alternatives|rejected",
    );
    const hasRejectedWork = statusSet.has("work|id|rejected");

    if (hasAcceptedAffiliation && hasAcceptedDisplayName && hasAcceptedWork) {
      result.set(asOpenAlexID(openalexID), "accepted");
    } else if (
      hasPendingAffiliation &&
      hasPendingDisplayName &&
      hasPendingWork
    ) {
      result.set(asOpenAlexID(openalexID), "pending");
    } else if (
      hasPendingAffiliation ||
      hasPendingDisplayName ||
      hasPendingWork ||
      hasAcceptedAffiliation ||
      hasAcceptedDisplayName ||
      hasAcceptedWork
    ) {
      result.set(asOpenAlexID(openalexID), "pending");
    } else if (
      hasRejectedAffiliation ||
      hasRejectedDisplayName ||
      hasRejectedWork
    ) {
      result.set(asOpenAlexID(openalexID), "rejected");
    } else {
      throw new Error(
        `Unexpected status combination for OpenAlexID ${openalexID} : ${Array.from(statusSet).join(", ")}`,
      );
    }
  });

  return result;
};

const getOpenAlexIDByStatusDashboard = (orcid: ORCID, events: IEvent[]) => {
  const accepted = getOpenAlexIDs(orcid, events).length;
  const pending = getPendingOpenAlexIDs(orcid, events).length;
  const rejected = getRejectedOpenAlexIDs(orcid, events).length;

  const maxDigits = 4;

  const values = [
    color.blueBright(
      String(accepted === 0 ? "·" : accepted).padStart(maxDigits, " "),
    ),
    color.yellowBright(
      String(pending === 0 ? "·" : pending).padStart(maxDigits, " "),
    ),
    color.redBright(
      String(rejected === 0 ? "·" : rejected).padStart(maxDigits, " "),
    ),
  ].join(" ");

  const status =
    accepted === 0 && pending === 0 && rejected === 0 ? null : values;

  return status;
};

const getGlobalStatuses = (id: ORCID, events: IEvent[]): string | null => {
  const statuses: {
    [key: string]: number;
  } = events
    .filter((e) => e.id === id)
    .map((e) => e.status)
    // compte le nombre d’occurrences de chaque status
    .reduce((acc: { [key: string]: number }, curr: string) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
  const accepted = statuses["accepted"] || "·";
  const pending = statuses["pending"] || "·";
  const rejected = statuses["rejected"] || "·";

  const maxDigits = 4;

  const values = [
    color.blueBright(String(accepted).padStart(maxDigits, " ")),
    color.yellowBright(String(pending).padStart(maxDigits, " ")),
    color.redBright(String(rejected).padStart(maxDigits, " ")),
  ].join(" ");

  const status =
    statuses["accepted"] === 0 &&
    statuses["pending"] === 0 &&
    statuses["rejected"] === 0
      ? null
      : values;

  return status;
};

/**
 * Get the status of a specific event by its ID, entity, and field.
 * Computes the status based on the number of unique `value` entries for each status.
 *
 * The status is determined as follows:
 * - If there are no events matching the criteria, returns `null`.
 * - Otherwise, returns a formatted string showing counts of unique `value` entries for each status:
 *   - Accepted count in blue
 *   - Pending count in yellow
 *   - Rejected count in red
 *
 * Counts are right-aligned with a width of 4 characters, and a dot (`·`) is used to indicate zero counts.
 *
 * @param id The ORCID of the author.
 * @param entity The entity type (e.g., 'author').
 * @param field The field name (e.g., 'display_name_alternatives').
 * @param events The list of events to search.
 * @returns The status of the event or null if not found.
 * @example
 * // returns "   3    ·    1" if there are 3 accepted, 0 pending, and 1 rejected unique values
 * getStatusesByValue('0000-0001-2345-6789', 'author', 'display_name_alternatives', events);
 * @example
 * // returns null if there are no events matching the criteria
 * getStatusesByValue('0000-0001-2345-6789', 'author', 'affiliation', []);
 * @example
 * // returns "   ·    ·    ·" if there are events but none matching the criteria
 * getStatusesByValue('0000-0001-2345-6789', 'author', 'affiliation', eventsWithNoMatches);
 *
 * @remarks
 * - Matching uses strict equality for `id`, `entity`, and `field` (case-sensitive).
 * - Relies on the `IEvent` shape to contain `id`, `entity`, `field`, `status`, and `value` properties.
 */
const getStatusesByValue = (
  id: ORCID,
  entity: IEntity,
  field: IField,
  events: IEvent[],
): string | null => {
  const statuses = events
    .filter((e) => e.id === id && e.entity === entity && e.field === field)
    .map((e) => ({ key: e.value, status: e.status }));
  // compte le nombre de value unique pour chaque status
  const grouped: { [key: string]: Set<string> } = {};
  const sizes: { [key: string]: number } = {};
  statuses.forEach(({ key, status }) => {
    if (!grouped[status]) {
      grouped[status] = new Set();
    }
    grouped[status].add(key);
  });

  // transforme les sets en leur taille
  Object.keys(grouped).forEach((status) => {
    const set = grouped[status];
    if (set) sizes[status] = set.size;
  });

  const accepted = sizes["accepted"] !== undefined ? sizes["accepted"] : "·";
  const pending = sizes["pending"] !== undefined ? sizes["pending"] : "·";
  const rejected = sizes["rejected"] !== undefined ? sizes["rejected"] : "·";

  const maxDigits = 4;

  const values = [
    color.blueBright(String(accepted).padStart(maxDigits, " ")),
    color.yellowBright(String(pending).padStart(maxDigits, " ")),
    color.redBright(String(rejected).padStart(maxDigits, " ")),
  ].join(" ");

  const status =
    sizes["accepted"] === 0 && sizes["pending"] === 0 && sizes["rejected"] === 0
      ? null
      : values;

  return status;
};

const getOpenAlexIDsBasedOnAcceptedWorks = (
  orcid: ORCID,
  events: IEvent[],
): OpenAlexID[] => {
  if (events.length === 0) return [];
  const works: OpenAlexID[] = events
    .filter(
      (e) =>
        e.id === orcid &&
        e.entity === "work" &&
        e.field === "id" &&
        e.status === "accepted",
    )
    .map((e) => e.from);
  const uniques: OpenAlexID[] = uniqueSorted<OpenAlexID>(works);
  return uniques;
};

const getStatusOfAuthorDisplayNameAlternative = (
  name: string,
  orcid: string,
  events: IEvent[],
): Status | undefined => {
  const event = events.find(
    (e) =>
      e.id === orcid &&
      e.entity === "author" &&
      e.field === "display_name_alternatives" &&
      e.value === name,
  );
  return event?.status;
};

const getStatusOfAffiliation = (
  institutionID: string,
  orcid: string,
  events: IEvent[],
): Status | undefined => {
  const event = events.find(
    (e) =>
      e.id === orcid &&
      e.entity === "author" &&
      e.field === "affiliation" &&
      e.value === institutionID,
  );
  return event?.status;
};

const getStatusOfInstitutionAlternativesStrings = (
  institutionID: string,
  orcid: string,
  events: IEvent[],
): Status | undefined => {
  const event = events.find(
    (e) =>
      e.id === orcid &&
      e.entity === "institution" &&
      e.field === "display_name_alternatives" &&
      e.value === institutionID,
  );
  return event?.status;
};

const getStatusOfWork = (
  workID: string,
  orcid: string,
  events: IEvent[],
): Status | undefined => {
  const event = events.find(
    (e) =>
      e.id === orcid &&
      e.entity === "work" &&
      e.field === "id" &&
      e.value === workID,
  );
  return event?.status;
};

const existsAcceptedAuthorDisplayNameAlternative = (
  name: string,
  orcid: string,
  events: IEvent[],
): boolean => {
  const event = events.find(
    (e) =>
      e.id === orcid &&
      e.entity === "author" &&
      e.field === "display_name_alternatives" &&
      e.value === name &&
      e.status === "accepted",
  );
  return event !== undefined;
};

export {
  union,
  existsAcceptedAuthorDisplayNameAlternative,
  getAcceptedWorks,
  getAcceptedAuthorDisplayNameAlternatives,
  getAcceptedAuthorAffiliations,
  getAcceptedAuthorInstitutions,
  getAcceptedInstitutionDisplayNameAlternatives,
  getGlobalStatuses,
  getOpenAlexIDs,
  getOpenAlexIDByStatus,
  getOpenAlexIDByStatusDashboard,
  getOpenAlexIDsBasedOnAcceptedWorks,
  getStatuses,
  getStatusesByValue,
  getStatusOfAffiliation,
  getStatusOfInstitutionAlternativesStrings,
  getStatusOfAuthorDisplayNameAlternative,
  getStatusOfWork,
  hasAcceptedAuthorDisplayNameAlternatives,
  hasAcceptedAuthorAffiliations,
  hasAcceptedAuthorInstitutions,
  hasAcceptedInstitutionDisplayNameAlternatives,
  hasAcceptedWorks,
  outerLeft,
  outerRight,
  intersect,
};
