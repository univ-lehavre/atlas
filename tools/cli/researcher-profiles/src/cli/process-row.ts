/**
 * Shared per-researcher processing logic:
 *   1. Check lock
 *   2. Fetch existing oa_data
 *   3. Resolve OpenAlex authors
 *   4. Fetch works for resolved authors
 *   5. Multiselect which name variants to keep
 *   6. Filter works by name and affiliation
 *   7. Write updated oa_data to REDCap
 */

import { spinner, log, multiselect, isCancel } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either, Logger, LogLevel } from "effect";
import type {
  AuthorsResult,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import type {
  OpenAlexConfig,
  RateLimitInfo,
} from "@univ-lehavre/atlas-fetch-openalex";
import {
  resolveAuthors,
  fetchWorksForAuthors,
  type ResolveAuthorsResult,
} from "@univ-lehavre/atlas-researcher-profiles";
import {
  writeResearcherData,
  fetchResearcherData,
} from "@univ-lehavre/atlas-researcher-profiles";
import {
  daysUntilNextUpdate,
  type ResearcherRow,
  type ResearcherData,
} from "@univ-lehavre/atlas-researcher-profiles";

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const silenced = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Logger.withMinimumLogLevel(LogLevel.None));

const showWorks = (works: readonly WorksResult[]): void => {
  if (works.length === 0) {
    log.warn("  No works found");
  }
};

const extractInstitutions = (
  works: readonly WorksResult[],
  authorIds: Set<string>,
): { id: string; display_name: string; country_code: string }[] => {
  const seen = new Map<
    string,
    { id: string; display_name: string; country_code: string }
  >();
  for (const work of works) {
    for (const authorship of work.authorships) {
      if (!authorIds.has(authorship.author.id)) continue;
      for (const inst of authorship.institutions) {
        if (!seen.has(inst.id)) seen.set(inst.id, inst);
      }
    }
  }
  return [...seen.values()].toSorted((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );
};

const fetchWorks = async (
  chosenAuthors: readonly Pick<AuthorsResult, "id">[],
  label: string,
  researcher: string,
  openAlexConfig: OpenAlexConfig,
  onRateLimit?: (info: RateLimitInfo) => void,
): Promise<Either.Either<readonly WorksResult[], unknown>> => {
  const worksSpinner = spinner();
  worksSpinner.start(
    `[${label}] Fetching works… (0/${String(chosenAuthors.length)} authors)`,
  );

  const pagesPerAuthor = new Map<number, number>();
  let lastAuthorTotal = 0;

  const result: Either.Either<readonly WorksResult[], unknown> =
    await Effect.runPromise(
      Effect.either(
        silenced(
          fetchWorksForAuthors(
            chosenAuthors as readonly AuthorsResult[],
            openAlexConfig,
            researcher,
            (authorIndex, authorTotal, page, pageTotal) => {
              pagesPerAuthor.set(authorIndex, page);
              lastAuthorTotal = authorTotal;
              const pagePart =
                pageTotal !== null
                  ? `page ${String(page)}/${String(pageTotal)}`
                  : `page ${String(page)}`;
              worksSpinner.message(
                `[${label}] Fetching works… author ${String(authorIndex)}/${String(authorTotal)} · ${pagePart}`,
              );
            },
            onRateLimit,
          ),
        ),
      ),
    );

  if (Either.isLeft(result)) {
    worksSpinner.stop(pc.red(`[${label}] Works fetch failed`));
  } else {
    const totalPages = [...pagesPerAuthor.values()].reduce((s, p) => s + p, 0);
    worksSpinner.stop(
      `[${label}] ${pc.bold(String(result.right.length))} work(s)` +
        pc.dim(
          ` · ${String(lastAuthorTotal)} author(s) · ${String(totalPages)} page(s)`,
        ),
    );
  }

  return result;
};

export const processRow = async (
  row: ResearcherRow,
  redcapConfig: RedcapConfig,
  openAlexConfig: OpenAlexConfig,
  onRateLimit?: (info: RateLimitInfo) => void,
  batch?: boolean,
): Promise<"ok" | "skipped" | "error"> => {
  const label = `${row.first_name} ${row.last_name} (${row.userid})`;
  const researcher = `${row.first_name} ${row.last_name}`;

  // Check lock
  if (row.oa_locked_at !== "") {
    log.error(`[${label}] Locked since ${row.oa_locked_at} — aborting`);
    process.exit(1);
  }

  // Fetch existing oa_data once
  const dataResult = await Effect.runPromise(
    Effect.either(fetchResearcherData(redcapConfig, row.userid)),
  );
  if (Either.isLeft(dataResult)) {
    log.error(`[${label}] Failed to fetch oa_data`);
    log.error(JSON.stringify(dataResult.left, null, 2));
    return "error";
  }
  let data: ResearcherData = dataResult.right;

  // eslint-disable-next-line no-useless-assignment -- initialized for the two branches below
  let allAuthorIdsForFetch: readonly string[] = [];
  let allAuthorIds = new Set<string>();
  let selectedNameFilter = new Set<string>();
  let prefetchedWorks: readonly WorksResult[] | null = null;

  const importedDays = daysUntilNextUpdate(row.oa_imported_at);

  if (importedDays !== null) {
    // Data is fresh — reuse stored entries from oa_data
    allAuthorIdsForFetch = [...new Set(data.fullnames.map((e) => e.authorId))];
    allAuthorIds = new Set(allAuthorIdsForFetch);
    selectedNameFilter = new Set(
      data.fullnames.filter((e) => e.selected).map((e) => e.name),
    );
    if (allAuthorIdsForFetch.length === 0) {
      log.warn(
        `[${label}] Data marked fresh but no stored author IDs found — skipping`,
      );
      return "skipped";
    }
    if (selectedNameFilter.size === 0) {
      log.warn(`[${label}] No names selected in stored entries — skipping`);
      return "skipped";
    }
    log.info(
      `[${label}] Data up to date (next update in ${String(importedDays)} day(s)) — ${String(allAuthorIdsForFetch.length)} author(s)`,
    );
  } else {
    // Step 1: Resolve authors
    const s = spinner();
    s.start(`[${label}] Searching authors on OpenAlex…`);

    const authorsResult: Either.Either<ResolveAuthorsResult, unknown> =
      await Effect.runPromise(
        Effect.either(silenced(resolveAuthors(row, openAlexConfig))),
      );

    if (Either.isLeft(authorsResult)) {
      s.stop(pc.red(`[${label}] Author search failed`));
      log.error(JSON.stringify(authorsResult.left, null, 2));
      return "error";
    }

    const { byName, byOrcid, unique: allAuthors } = authorsResult.right;
    const namePart = `by name: ${pc.bold(String(byName.length))}`;
    const orcidPart =
      row.orcid !== "" ? ` · by ORCID: ${pc.bold(String(byOrcid.length))}` : "";
    s.stop(
      `[${label}] ${pc.bold(String(allAuthors.length))} unique profile(s) (${namePart}${orcidPart})`,
    );

    if (allAuthors.length === 0) {
      log.warn(`  No OpenAlex profiles found for ${label}`);
      return "skipped";
    }

    allAuthorIdsForFetch = allAuthors.map((a) => a.id);

    // Step 2: Fetch works for all resolved authors
    const worksResult = await fetchWorks(
      allAuthors,
      label,
      researcher,
      openAlexConfig,
      onRateLimit,
    );

    if (Either.isLeft(worksResult)) {
      log.error(JSON.stringify(worksResult.left, null, 2));
      return "error";
    }

    prefetchedWorks = worksResult.right;

    // Step 3: Extract raw_author_name from authorships
    allAuthorIds = new Set(allAuthors.map((a) => a.id));
    const rawNameMap = new Map<string, string>(); // name → authorId (first seen)
    for (const work of prefetchedWorks) {
      for (const authorship of work.authorships) {
        const aid = authorship.author.id;
        const name = authorship.raw_author_name;
        if (allAuthorIds.has(aid) && name !== "" && !rawNameMap.has(name)) {
          rawNameMap.set(name, aid);
        }
      }
    }
    const sortedNameEntries = [...rawNameMap.entries()]
      .map(([name, authorId]) => ({ name, authorId }))
      .toSorted((a, b) => a.name.localeCompare(b.name));

    // Step 4: Present only new names
    const existingNames = new Set(data.fullnames.map((e) => e.name));
    const newNameEntries = sortedNameEntries.filter(
      (e) => !existingNames.has(e.name),
    );

    let mergedFullnames: ResearcherData["fullnames"];

    if (newNameEntries.length === 0) {
      log.info(
        `[${label}] No new names — using existing ${pc.bold(String(data.fullnames.length))} entries`,
      );
      mergedFullnames = data.fullnames;
    } else {
      let selectedNames: Set<string>;

      if (batch === true) {
        selectedNames = new Set(newNameEntries.map((e) => e.name));
        log.info(
          `[${label}] Batch mode — auto-selecting ${pc.bold(String(newNameEntries.length))} new name(s)`,
        );
      } else {
        const selected = await multiselect({
          message: `Select author name variants found in OpenAlex article metadata for ${pc.bold(label)} (${String(newNameEntries.length)} new):`,
          options: newNameEntries.map((e) => ({
            value: e.name,
            label: e.name,
          })),
          initialValues: newNameEntries.map((e) => e.name),
        });

        if (isCancel(selected)) {
          log.warn(`[${label}] Skipped (cancelled)`);
          return "skipped";
        }

        selectedNames = new Set(Array.isArray(selected) ? selected : []);
      }

      const newFullnameEntries = newNameEntries.map((e) => ({
        ...e,
        selected: selectedNames.has(e.name),
      }));

      mergedFullnames = [...data.fullnames, ...newFullnameEntries];
    }

    selectedNameFilter = new Set(
      mergedFullnames.filter((e) => e.selected).map((e) => e.name),
    );

    if (selectedNameFilter.size === 0) {
      log.warn(`  No names selected — skipping ${label}`);
      return "skipped";
    }

    // Update data with merged fullnames (affiliations updated below)
    data = { ...data, fullnames: mergedFullnames };
  }

  // Check if works write should be skipped (data already fresh)
  if (importedDays !== null) {
    log.info(
      `[${label}] Works already imported — next update in ${String(importedDays)} day(s)`,
    );
    return "skipped";
  }

  // Fetch works if not already prefetched
  let allWorks: readonly WorksResult[];
  if (prefetchedWorks !== null) {
    allWorks = prefetchedWorks;
  } else {
    const worksResult = await fetchWorks(
      allAuthorIdsForFetch.map((id) => ({ id })),
      label,
      researcher,
      openAlexConfig,
      onRateLimit,
    );

    if (Either.isLeft(worksResult)) {
      log.error(JSON.stringify(worksResult.left, null, 2));
      return "error";
    }

    allWorks = worksResult.right;
  }

  // Filter works by selected name
  const works = allWorks.filter((w) =>
    w.authorships.some((a) => selectedNameFilter.has(a.raw_author_name)),
  );

  log.info(
    `[${label}] ${pc.bold(String(works.length))}/${pc.bold(String(allWorks.length))} work(s) after name filter`,
  );

  // Auto-select all institutions
  const allInstitutions = extractInstitutions(works, allAuthorIds);
  const existingAffs = new Set(data.affiliations.map((e) => e.affiliation));
  const newInstitutions = allInstitutions.filter(
    (i) => !existingAffs.has(i.id),
  );

  let mergedAffEntries: ResearcherData["affiliations"];

  if (newInstitutions.length === 0) {
    log.info(
      `[${label}] No new institutions — using existing ${pc.bold(String(data.affiliations.length))} entries`,
    );
    mergedAffEntries = data.affiliations;
  } else {
    log.info(
      `[${label}] Auto-selecting ${pc.bold(String(newInstitutions.length))} new institution(s)`,
    );
    const newAffEntries: ResearcherData["affiliations"] = newInstitutions.map(
      (i) => ({ affiliation: i.id, selected: true }),
    );
    mergedAffEntries = [...data.affiliations, ...newAffEntries];
  }

  const selectedAffiliationFilter = new Set(
    mergedAffEntries.filter((e) => e.selected).map((e) => e.affiliation),
  );

  if (selectedAffiliationFilter.size === 0) {
    log.warn(`  No institutions selected — skipping ${label}`);
    return "skipped";
  }

  // Filter works by affiliation (keep works with no institution too)
  const worksAfterAffFilter = works.filter((w) =>
    w.authorships.some(
      (a) =>
        allAuthorIds.has(a.author.id) &&
        (a.institutions.length === 0 ||
          a.institutions.some((i) => selectedAffiliationFilter.has(i.id))),
    ),
  );

  log.info(
    `[${label}] ${pc.bold(String(worksAfterAffFilter.length))}/${pc.bold(String(works.length))} work(s) after affiliation filter`,
  );

  showWorks(worksAfterAffFilter);

  // Write updated data
  const updatedData: ResearcherData = {
    ...data,
    affiliations: mergedAffEntries,
    oa_references: worksAfterAffFilter,
  };

  const writeSpinner = spinner();
  writeSpinner.start(`[${label}] Writing to REDCap…`);

  const writeResult = await Effect.runPromise(
    Effect.either(writeResearcherData(redcapConfig, row.userid, updatedData)),
  );

  if (Either.isLeft(writeResult)) {
    writeSpinner.stop(pc.red(`[${label}] REDCap write failed`));
    log.error(JSON.stringify(writeResult.left, null, 2));
    return "error";
  }

  writeSpinner.stop(`[${label}] Written to REDCap`);
  return "ok";
};
