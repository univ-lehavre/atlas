/**
 * Unified per-researcher pipeline: resolves OpenAlex works (processRow) then
 * matches publications file against oa_references (matchRow) for each researcher
 * in sequence, relying on oa_imported_at to skip already-fresh steps.
 */

import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import type {
  OpenAlexConfig,
  RateLimitInfo,
} from "@univ-lehavre/atlas-fetch-openalex";
import { fetchResearchers } from "@univ-lehavre/atlas-researcher-profiles";
import { processRow } from "./process-row.js";
import { matchRow } from "./match-row.js";
import { selectResearchers } from "./select-researchers.js";

export interface RunOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
  readonly threshold: number;
  readonly batch?: boolean;
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

export const run = async (opts: RunOptions): Promise<void> => {
  const redcapConfig = { url: opts.redcapUrl, token: opts.redcapToken };
  const openAlexConfig: OpenAlexConfig = {
    userAgent: opts.openAlexUserAgent,
    ...(opts.openAlexApiKey !== undefined
      ? { apiKey: opts.openAlexApiKey }
      : {}),
  };

  // Fetch researchers
  const s = spinner();
  s.start("Fetching researchers from REDCap…");

  const fetchResult = await Effect.runPromise(
    Effect.either(fetchResearchers(redcapConfig)),
  );

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const allResearchers = fetchResult.right;
  const pending = allResearchers.filter((r) => r.openalex_complete !== "2");
  const complete = allResearchers.filter((r) => r.openalex_complete === "2");

  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  if (complete.length > 0) {
    log.info(
      `${pc.dim(String(complete.length))} researcher(s) complete (openalex_complete = 2) — excluded`,
    );
  }

  if (pending.length === 0) {
    outro("All researchers are already complete");
    return;
  }

  const researchers = await selectResearchers(pending);

  log.info(
    `Match threshold: ${pc.bold(String(opts.threshold))} (lower = stricter)`,
  );

  let skipped = 0;
  let errors = 0;
  let lastQuota: RateLimitInfo | null = null;
  let totalCredits = 0;

  for (const [i, row] of researchers.entries()) {
    const label = `${row.first_name} ${row.last_name} (${row.userid})`;
    const t0 = Date.now();
    log.info(
      pc.bold(`── ${label} ──`) +
        pc.dim(` [${String(i + 1)}/${String(researchers.length)}]`),
    );

    const processStatus = await processRow(
      row,
      redcapConfig,
      openAlexConfig,
      (q) => {
        lastQuota = q;
        totalCredits += q.creditsUsed;
      },
      opts.batch,
    );

    const matchStatus = await matchRow(row, {
      redcap: redcapConfig,
      openAlex: openAlexConfig,
      threshold: opts.threshold,
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (lastQuota !== null) {
      showQuota(lastQuota, totalCredits, "OpenAlex quota");
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // Combined status: error > ok > skipped
    const combined =
      processStatus === "error" || matchStatus === "error"
        ? "error"
        : processStatus === "ok" || matchStatus === "ok"
          ? "ok"
          : "skipped";

    if (combined === "ok") {
      log.success(`[${label}] Done ${pc.dim(`(${elapsed}s)`)}`);
    } else if (combined === "skipped") {
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
};
