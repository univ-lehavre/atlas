/**
 * Shared per-researcher processing logic:
 *   1. Resolve OpenAlex authors (with Effect log suppression)
 *   2. Multiselect which authors to keep
 *   3. Fetch works for selected authors
 *   4. Show works sample
 *   5. Confirm and write to REDCap
 */

import { spinner, log, multiselect, isCancel, cancel } from "@clack/prompts";
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
import { writeOaAuthorIds, writeOaReferences } from "../services/redcap.js";
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
    return;
  }
  log.info(`  ${String(works.length)} work(s) found — sample:`);
  for (const w of works.slice(0, 5)) {
    log.message(`  · [${pc.dim(String(w.publication_year))}] ${w.title}`);
  }
  if (works.length > 5) {
    log.message(pc.dim(`  … and ${String(works.length - 5)} more`));
  }
};

/** Parses stored author IDs JSON, returns empty array on failure. */
const parseStoredAuthorIds = (raw: string): readonly string[] => {
  if (raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
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

  const result: Either.Either<readonly WorksResult[], unknown> =
    await Effect.runPromise(
      Effect.either(
        silenced(
          fetchWorksForAuthors(
            chosenAuthors as readonly AuthorsResult[],
            openAlexConfig,
            researcher,
            (done, total) => {
              worksSpinner.message(
                `[${label}] Fetching works… (${String(done)}/${String(total)} authors)`,
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
    worksSpinner.stop(
      `[${label}] ${pc.bold(String(result.right.length))} work(s)`,
    );
  }

  return result;
};

export const processRow = async (
  row: ResearcherRow,
  redcapConfig: RedcapConfig,
  openAlexConfig: OpenAlexConfig,
  onRateLimit?: (info: RateLimitInfo) => void,
): Promise<"ok" | "skipped" | "error"> => {
  const label = `${row.first_name} ${row.last_name} (${row.userid})`;
  const researcher = `${row.first_name} ${row.last_name}`;

  let chosenAuthors: readonly Pick<AuthorsResult, "id">[];

  const authorDays = daysUntilNextUpdate(row.oa_author_ids_imported_date);

  if (authorDays !== null) {
    // Author IDs are fresh — reuse stored IDs
    const storedIds = parseStoredAuthorIds(row.researcher_oa_ids);
    if (storedIds.length === 0) {
      log.warn(
        `[${label}] Author IDs marked fresh but no stored IDs found — skipping`,
      );
      return "skipped";
    }
    log.info(
      `[${label}] Author IDs up to date (next update in ${String(authorDays)} day(s)) — ${String(storedIds.length)} author(s)`,
    );
    chosenAuthors = storedIds.map((id) => ({ id }));
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

    // Step 2: Multiselect authors
    const selected = await multiselect({
      message: `Select author profile(s) to include for ${pc.bold(label)}:`,
      options: allAuthors.map((a) => {
        const orcid = a.orcid !== "" && a.orcid !== "null" ? a.orcid : null;
        const orcidHint = orcid !== null ? `ORCID: ${orcid} · ` : "";
        return {
          value: a.id,
          label: a.display_name,
          hint: `${orcidHint}${a.id}`,
        };
      }),
      initialValues: allAuthors.map((a) => a.id),
    });

    if (isCancel(selected)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const chosen = allAuthors.filter((a) =>
      (selected as readonly string[]).includes(a.id),
    );

    if (chosen.length === 0) {
      log.warn(`  No authors selected — skipping ${label}`);
      return "skipped";
    }

    // Step 3: Write selected author IDs to REDCap
    const idsSpinner = spinner();
    idsSpinner.start(`[${label}] Saving author IDs to REDCap…`);

    const idsResult: Either.Either<void, unknown> = await Effect.runPromise(
      Effect.either(writeOaAuthorIds(redcapConfig, row.userid, chosen)),
    );

    if (Either.isLeft(idsResult)) {
      idsSpinner.stop(pc.yellow(`[${label}] Could not save author IDs`));
      log.warn(JSON.stringify(idsResult.left, null, 2));
    } else {
      idsSpinner.stop(`[${label}] Author IDs saved`);
    }

    chosenAuthors = chosen;
  }

  // Check if works fetch should be skipped (imported less than 1 month ago)
  const worksDays = daysUntilNextUpdate(row.oa_references_imported_at);
  if (worksDays !== null) {
    log.info(
      `[${label}] Works already imported — next update in ${String(worksDays)} day(s)`,
    );
    return "skipped";
  }

  // Step 4: Fetch works for selected authors
  const worksResult = await fetchWorks(
    chosenAuthors,
    label,
    researcher,
    openAlexConfig,
    onRateLimit,
  );

  if (Either.isLeft(worksResult)) {
    log.error(JSON.stringify(worksResult.left, null, 2));
    return "error";
  }

  const works = worksResult.right;

  // Step 5: Show works sample
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

  writeSpinner.stop(pc.green(`[${label}] Written to REDCap ✓`));
  return "ok";
};
