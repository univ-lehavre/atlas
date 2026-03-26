/**
 * Shared per-researcher processing logic:
 *   1. Resolve OpenAlex authors (with Effect log suppression)
 *   2. Multiselect which authors to keep
 *   3. Fetch works for selected authors
 *   4. Show works sample
 *   5. Confirm and write to REDCap
 */

import {
  spinner,
  log,
  confirm,
  multiselect,
  isCancel,
  cancel,
} from "@clack/prompts";
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
import { resolveAuthors, fetchWorksForAuthors } from "../services/openalex.js";
import { writeOaAuthorIds, writeOaReferences } from "../services/redcap.js";
import type { ResearcherRow } from "../types.js";

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const silenced = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Logger.withMinimumLogLevel(LogLevel.None));

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

export const processRow = async (
  row: ResearcherRow,
  redcapConfig: RedcapConfig,
  openAlexConfig: OpenAlexConfig,
  onRateLimit?: (info: RateLimitInfo) => void,
): Promise<"ok" | "skipped" | "error"> => {
  const label = `${row.first_name} ${row.last_name} (${row.userid})`;
  const researcher = `${row.first_name} ${row.last_name}`;

  // Check if OpenAlex search should be skipped (imported less than 1 month ago)
  if (row.oa_author_ids_imported_date !== "") {
    const importedAt = new Date(row.oa_author_ids_imported_date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (importedAt > oneMonthAgo) {
      const nextUpdate = new Date(importedAt);
      nextUpdate.setMonth(nextUpdate.getMonth() + 1);
      const daysUntil = Math.ceil(
        (nextUpdate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      log.info(
        `[${label}] Author IDs already imported on ${row.oa_author_ids_imported_date} — next update in ${String(daysUntil)} day(s)`,
      );
      return "skipped";
    }

    // Outdated — ask for confirmation before re-running
    const confirmed = await confirm({
      message: `[${label}] Last import: ${row.oa_author_ids_imported_date} (> 1 month ago). Re-run OpenAlex search?`,
    });

    if (isCancel(confirmed)) {
      cancel("Cancelled");
      process.exit(0);
    }

    if (!confirmed) {
      log.warn(`Skipped ${label}`);
      return "skipped";
    }
  }

  // Step 1: Resolve authors
  const s = spinner();
  s.start(`[${label}] Searching authors on OpenAlex…`);

  const authorsResult: Either.Either<readonly AuthorsResult[], unknown> =
    await Effect.runPromise(
      Effect.either(silenced(resolveAuthors(row, openAlexConfig))),
    );

  if (Either.isLeft(authorsResult)) {
    s.stop(pc.red(`[${label}] Author search failed`));
    log.error(JSON.stringify(authorsResult.left, null, 2));
    return "error";
  }

  const allAuthors = authorsResult.right;
  s.stop(
    `[${label}] Found ${pc.bold(String(allAuthors.length))} author profile(s)`,
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

  const chosenAuthors = allAuthors.filter((a) =>
    (selected as readonly string[]).includes(a.id),
  );

  if (chosenAuthors.length === 0) {
    log.warn(`  No authors selected — skipping ${label}`);
    return "skipped";
  }

  // Step 3: Write selected author IDs to REDCap
  const idsSpinner = spinner();
  idsSpinner.start(`[${label}] Saving author IDs to REDCap…`);

  const idsResult: Either.Either<void, unknown> = await Effect.runPromise(
    Effect.either(writeOaAuthorIds(redcapConfig, row.userid, chosenAuthors)),
  );

  if (Either.isLeft(idsResult)) {
    idsSpinner.stop(pc.yellow(`[${label}] Could not save author IDs`));
    log.warn(JSON.stringify(idsResult.left, null, 2));
  } else {
    idsSpinner.stop(`[${label}] Author IDs saved`);
  }

  // Step 4: Fetch works for selected authors
  const worksSpinner = spinner();
  worksSpinner.start(
    `[${label}] Fetching works… (0/${String(chosenAuthors.length)} authors)`,
  );

  const worksResult: Either.Either<readonly WorksResult[], unknown> =
    await Effect.runPromise(
      Effect.either(
        silenced(
          fetchWorksForAuthors(
            chosenAuthors,
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

  if (Either.isLeft(worksResult)) {
    worksSpinner.stop(pc.red(`[${label}] Works fetch failed`));
    log.error(JSON.stringify(worksResult.left, null, 2));
    return "error";
  }

  const works = worksResult.right;
  worksSpinner.stop(`[${label}] ${pc.bold(String(works.length))} work(s)`);

  // Step 4: Show works sample
  showWorks(works);

  // Step 5: Confirm and write
  const confirmed = await confirm({
    message: `Write ${String(works.length)} works to REDCap for ${label}?`,
  });

  if (isCancel(confirmed)) {
    cancel("Cancelled");
    process.exit(0);
  }

  if (!confirmed) {
    log.warn(`Skipped ${label}`);
    return "skipped";
  }

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
