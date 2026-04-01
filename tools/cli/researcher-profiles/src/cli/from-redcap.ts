/**
 * `from-redcap` command — fetches researchers from REDCap and resolves their OpenAlex works.
 */

import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-openalex";
import {
  fetchResearchers,
  daysUntilNextUpdate,
} from "@univ-lehavre/atlas-researcher-profiles";
import type { ResearcherRow } from "@univ-lehavre/atlas-researcher-profiles";
import { processRow } from "./process-row.js";
import { selectResearchers } from "./select-researchers.js";

interface FromRedcapOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
  readonly batch?: boolean;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const showQuota = (
  quota: RateLimitInfo | null,
  totalCredits: number,
  label: string,
): void => {
  if (quota === null) return;
  log.info(
    `${label} — quota: ${pc.bold(String(quota.remaining))}/${pc.bold(String(quota.limit))} requests remaining` +
      ` · ${pc.bold(String(totalCredits))} credits used this session` +
      ` · resets in ${pc.dim(String(quota.resetInSeconds) + "s")}`,
  );
};

export const fromRedcap = async (
  opts: FromRedcapOptions,
): Promise<readonly ResearcherRow[]> => {
  const redcapConfig: RedcapConfig = {
    url: opts.redcapUrl,
    token: opts.redcapToken,
  };
  const openAlexConfig: OpenAlexConfig = {
    userAgent: opts.openAlexUserAgent,
    ...(opts.openAlexApiKey !== undefined
      ? { apiKey: opts.openAlexApiKey }
      : {}),
  };

  // Fetch researchers from REDCap
  const s = spinner();
  s.start("Fetching researchers from REDCap…");

  const fetchResult: Either.Either<readonly ResearcherRow[], unknown> =
    await Effect.runPromise(Effect.either(fetchResearchers(redcapConfig)));

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const allResearchers = fetchResult.right;
  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  const isComplete = (row: ResearcherRow): boolean =>
    row.openalex_complete === "2";

  const isUpToDate = (row: ResearcherRow): boolean => {
    const days = daysUntilNextUpdate(row.oa_imported_at);
    return days !== null;
  };

  const complete = allResearchers.filter(isComplete);
  const upToDate = allResearchers.filter(
    (r) => !isComplete(r) && isUpToDate(r),
  );
  const pending = allResearchers.filter(
    (r) => !isComplete(r) && !isUpToDate(r),
  );

  if (complete.length > 0) {
    log.info(
      `${pc.dim(String(complete.length))} researcher(s) complete (openalex_complete = 2) — excluded`,
    );
  }
  if (upToDate.length > 0) {
    log.info(
      `${pc.dim(String(upToDate.length))} researcher(s) already up-to-date — excluded from selection`,
    );
  }

  if (pending.length === 0) {
    outro("All researchers are up-to-date — nothing to do");
    return [];
  }

  const researchers = await selectResearchers(pending);

  let skipped = 0;
  let errors = 0;
  let lastQuota: RateLimitInfo | null = null;
  let totalCredits = 0;

  for (const [i, row] of researchers.entries()) {
    const label = `${row.first_name} ${row.last_name} (${row.userid})`;
    log.info(
      pc.bold(`── ${label} ──`) +
        pc.dim(` [${String(i + 1)}/${String(researchers.length)}]`),
    );

    const t0 = Date.now();
    const status = await processRow(
      row,
      redcapConfig,
      openAlexConfig,
      (q) => {
        lastQuota = q;
        totalCredits += q.creditsUsed;
      },
      opts.batch,
    );
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (lastQuota !== null) {
      showQuota(lastQuota, totalCredits, "OpenAlex quota");
    }

    if (status === "ok") {
      log.success(`[${label}] Done ${pc.dim(`(${elapsed}s)`)}`);
    } else if (status === "skipped") {
      skipped++;
      log.info(`[${label}] Skipped ${pc.dim(`(${elapsed}s)`)}`);
    } else {
      errors++;
      log.error(`[${label}] Error ${pc.dim(`(${elapsed}s)`)}`);
    }
  }

  const parts: string[] = [];
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
  return researchers;
};
