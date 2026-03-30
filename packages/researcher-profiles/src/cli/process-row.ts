/**
 * Shared per-researcher processing logic:
 *   1. Resolve OpenAlex authors (with Effect log suppression)
 *   2. Multiselect which authors to keep
 *   3. Fetch works for selected authors
 *   4. Show works sample
 *   5. Confirm and write to REDCap
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
} from "../services/openalex.js";
import {
  writeOaReferences,
  writeAlternativeAuthorFullnames,
  fetchAlternativeAuthorFullnames,
} from "../services/redcap.js";
import type { ResearcherRow } from "../types.js";

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const silenced = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Logger.withMinimumLogLevel(LogLevel.None));

/** Returns the number of days until the next update, or null if > 1 month ago / never imported. */
export const daysUntilNextUpdate = (importedDate: string): number | null => {
  if (importedDate === "") return null;
  const importedAt = new Date(importedDate);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (importedAt <= oneMonthAgo) return null;
  const nextUpdate = new Date(importedAt);
  nextUpdate.setMonth(nextUpdate.getMonth() + 1);
  return Math.ceil((nextUpdate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const showWorks = (works: readonly WorksResult[]): void => {
  if (works.length === 0) {
    log.warn("  No works found");
  }
};

interface FullnameEntry {
  name: string;
  authorId: string;
  selected: boolean;
}

/** Parses alternative_author_fullnames JSON, returns all entries. */
const parseFullnameEntries = (buffer: ArrayBuffer): FullnameEntry[] => {
  const raw = new TextDecoder().decode(buffer);
  if (raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (
      parsed as { name?: unknown; authorId?: unknown; selected?: unknown }[]
    )
      .filter(
        (e) =>
          typeof e.name === "string" &&
          typeof e.authorId === "string" &&
          typeof e.selected === "boolean",
      )
      .map((e) => ({
        name: e.name as string,
        authorId: e.authorId as string,
        selected: e.selected as boolean,
      }));
  } catch {
    return [];
  }
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

  let allAuthorIdsForFetch: readonly string[] = [];
  let selectedNameFilter = new Set<string>();
  let prefetchedWorks: readonly WorksResult[] | null = null;

  const authorDays = daysUntilNextUpdate(row.oa_author_ids_imported_date);

  if (authorDays !== null) {
    // Author IDs are fresh — reuse stored entries from alternative_author_fullnames
    const storedResult = await Effect.runPromise(
      Effect.either(fetchAlternativeAuthorFullnames(redcapConfig, row.userid)),
    );
    const storedEntries = Either.isRight(storedResult)
      ? parseFullnameEntries(storedResult.right)
      : [];
    allAuthorIdsForFetch = [...new Set(storedEntries.map((e) => e.authorId))];
    selectedNameFilter = new Set(
      storedEntries.filter((e) => e.selected).map((e) => e.name),
    );
    if (allAuthorIdsForFetch.length === 0) {
      log.warn(
        `[${label}] Author IDs marked fresh but no stored IDs found — skipping`,
      );
      return "skipped";
    }
    if (selectedNameFilter.size === 0) {
      log.warn(`[${label}] No names selected in stored entries — skipping`);
      return "skipped";
    }
    log.info(
      `[${label}] Author IDs up to date (next update in ${String(authorDays)} day(s)) — ${String(allAuthorIdsForFetch.length)} author(s)`,
    );
  } else {
    // Step 1: Resolve authors
    log.info("Searching authors on OpenAlex…");
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

    // Step 2: Fetch works for all resolved authors (needed for raw_author_name extraction)
    log.info("Downloading works from OpenAlex…");
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
    const allAuthorIds = new Set(allAuthors.map((a) => a.id));
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
      .sort((a, b) => a.name.localeCompare(b.name));

    // Step 4: Fetch existing entries and present only new names
    const existingResult = await Effect.runPromise(
      Effect.either(fetchAlternativeAuthorFullnames(redcapConfig, row.userid)),
    );
    const existingEntries: FullnameEntry[] = Either.isRight(existingResult)
      ? parseFullnameEntries(existingResult.right)
      : [];
    const existingNames = new Set(existingEntries.map((e) => e.name));
    const newNameEntries = sortedNameEntries.filter(
      (e) => !existingNames.has(e.name),
    );

    let mergedEntries: FullnameEntry[];

    if (newNameEntries.length === 0) {
      log.info(
        `[${label}] No new names — using existing ${pc.bold(String(existingEntries.length))} entries`,
      );
      mergedEntries = existingEntries;
    } else {
      let selectedNames: Set<string>;

      if (batch === true) {
        selectedNames = new Set(newNameEntries.map((e) => e.name));
        log.info(
          `[${label}] Batch mode — auto-selecting ${pc.bold(String(newNameEntries.length))} new name(s)`,
        );
      } else {
        log.info("Select alternative names");
        const selected = await multiselect({
          message: `Select new fullname(s) to associate with ${pc.bold(label)} (${String(newNameEntries.length)} new):`,
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

      mergedEntries = [...existingEntries, ...newFullnameEntries];

      const idsSpinner = spinner();
      idsSpinner.start(`[${label}] Saving fullnames to REDCap…`);

      const fullnamesResult = await Effect.runPromise(
        Effect.either(
          writeAlternativeAuthorFullnames(
            redcapConfig,
            row.userid,
            mergedEntries,
          ),
        ),
      );

      if (Either.isLeft(fullnamesResult)) {
        idsSpinner.stop(
          pc.red(`[${label}] Could not save fullnames — aborting`),
        );
        log.error(JSON.stringify(fullnamesResult.left, null, 2));
        return "error";
      } else {
        const selectedCount = mergedEntries.filter((e) => e.selected).length;
        const chosenCount = new Set(
          mergedEntries.filter((e) => e.selected).map((e) => e.authorId),
        ).size;
        idsSpinner.stop(
          `[${label}] ${pc.bold(String(selectedCount))} fullname(s) selected · ${pc.bold(String(chosenCount))} OpenAlex author ID(s) — saved`,
        );
      }
    }

    selectedNameFilter = new Set(
      mergedEntries.filter((e) => e.selected).map((e) => e.name),
    );

    if (selectedNameFilter.size === 0) {
      log.warn(`  No names selected — skipping ${label}`);
      return "skipped";
    }
  }

  // Check if works write should be skipped (imported less than 1 month ago)
  const worksDays = daysUntilNextUpdate(row.oa_references_imported_at);
  if (worksDays !== null) {
    log.info(
      `[${label}] Works already imported — next update in ${String(worksDays)} day(s)`,
    );
    return "skipped";
  }

  // Fetch works if not already prefetched (fresh author IDs path)
  let allWorks: readonly WorksResult[];
  if (prefetchedWorks !== null) {
    allWorks = prefetchedWorks;
  } else {
    log.info("Downloading works from OpenAlex…");
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

  // Filter works to those having at least one authorship with a selected raw_author_name
  const works = allWorks.filter((w) =>
    w.authorships.some((a) => selectedNameFilter.has(a.raw_author_name)),
  );

  log.info(
    `[${label}] ${pc.bold(String(works.length))}/${pc.bold(String(allWorks.length))} work(s) after name filter`,
  );

  // Show works sample
  showWorks(works);

  const writeSpinner = spinner();
  writeSpinner.start(`[${label}] Writing to REDCap…`);

  const writeResult: Either.Either<void, unknown> = await Effect.runPromise(
    Effect.either(writeOaReferences(redcapConfig, row.userid, works)),
  );

  if (Either.isLeft(writeResult)) {
    writeSpinner.stop(pc.red(`[${label}] REDCap write failed`));
    log.error(JSON.stringify(writeResult.left, null, 2));
    return "error";
  }

  writeSpinner.stop(`[${label}] Written to REDCap`);
  return "ok";
};
