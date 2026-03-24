import type { IEvent } from "./types.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import color from "picocolors";
import { log } from "@clack/prompts";

/**
 * Agrège les événements pour compter le nombre de publications par année et par affiliation
 * @param events Liste des événements à agréger
 * @returns Une carte des comptes de publications par année et par affiliation
 */
export const aggregateEvents = (orcid: ORCID, events: IEvent[]) => {
  const filtered = events.filter(
    (e) =>
      e.id === orcid &&
      e.entity === "institution" &&
      e.field === "publication_date" &&
      e.status === "accepted",
  );
  const counts = new Map<string, Map<string, number>>();
  for (const event of filtered) {
    const year = event.value;
    const affiliation = event.label ?? "unknown";
    if (!counts.has(affiliation)) {
      counts.set(affiliation, new Map<string, number>());
    }
    const yearCounts = counts.get(affiliation)!;
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }
  return counts;
};

export const print_aggregate = (
  aggregate: Map<string, Map<string, number>>,
) => {
  if (!aggregate || aggregate.size === 0) {
    log.message("Aucun résultat à afficher.");
    return;
  }

  // Trier les affiliations par nom pour sortie stable
  const affiliations = Array.from(aggregate.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [affiliation, yearsMap] of affiliations) {
    // Trier les années (chaîne) de façon ascendante
    const years = Array.from(yearsMap.entries()).sort(([y1], [y2]) =>
      y1.localeCompare(y2),
    );
    const parts = years.map(([year, count]) => `${year}: ${count}`);

    // Affichage : Affiliation — 2020: 2, 2021: 1
    log.message(`${color.cyan(affiliation)} — ${parts.join(", ")}`);
  }
};
