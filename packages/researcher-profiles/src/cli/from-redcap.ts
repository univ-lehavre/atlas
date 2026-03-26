/**
 * `from-redcap` command — fetches researchers from REDCap and resolves their OpenAlex works.
 */

import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import { fetchQuota, type OpenAlexQuota } from "../services/openalex.js";
import { fetchResearchers } from "../services/redcap.js";
import type { ResearcherRow } from "../types.js";
import { processRow } from "./process-row.js";
import { selectResearchers } from "./select-researchers.js";

export interface FromRedcapOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const showQuota = (quota: OpenAlexQuota | null, label: string): void => {
  if (quota === null) return;
  log.info(
    `${label} — quota: ${pc.bold(String(quota.remaining))}/${pc.bold(String(quota.limit))} requests remaining` +
      ` · ${pc.bold(String(quota.creditsUsed))} credits used` +
      ` · resets in ${pc.dim(String(quota.resetInSeconds) + "s")}`,
  );
};

export const fromRedcap = async (opts: FromRedcapOptions): Promise<void> => {
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

  // Fetch quota after loading, before processing
  const quotaBefore = await fetchQuota(openAlexConfig);
  showQuota(quotaBefore, "OpenAlex quota");

  const researchers = await selectResearchers(allResearchers);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of researchers) {
    const status = await processRow(row, redcapConfig, openAlexConfig);
    if (status === "ok") ok++;
    else if (status === "skipped") skipped++;
    else errors++;
  }

  // Fetch final quota
  const quotaAfter = await fetchQuota(openAlexConfig);
  showQuota(quotaAfter, "OpenAlex quota after");

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
