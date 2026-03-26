/**
 * `from-csv` command — reads a CSV file and resolves OpenAlex works for each researcher.
 * CSV columns: userid, last_name, middle_name, first_name, orcid
 */

import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { readFileSync } from "node:fs";
import { Effect, Either } from "effect";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-openalex";
import { parseCsv } from "../services/csv.js";
import type { ResearcherRow } from "../types.js";
import { processRow } from "./process-row.js";
import { selectResearchers } from "./select-researchers.js";

export interface FromCsvOptions {
  readonly filePath: string;
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const showQuota = (quota: RateLimitInfo | null, label: string): void => {
  if (quota === null) return;
  log.info(
    `${label} — quota: ${pc.bold(String(quota.remaining))}/${pc.bold(String(quota.limit))} requests remaining` +
      ` · ${pc.bold(String(quota.creditsUsed))} credits used` +
      ` · resets in ${pc.dim(String(quota.resetInSeconds) + "s")}`,
  );
};

export const fromCsv = async (opts: FromCsvOptions): Promise<void> => {
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

  // Load CSV
  const s = spinner();
  s.start(`Reading ${opts.filePath}…`);

  let content: string;
  try {
    content = readFileSync(opts.filePath, "utf8");
  } catch (err) {
    s.stop(pc.red("Failed to read CSV file"));
    log.error(String(err));
    process.exit(1);
  }

  const parseResult: Either.Either<readonly ResearcherRow[], unknown> =
    await Effect.runPromise(Effect.either(parseCsv(content)));

  if (Either.isLeft(parseResult)) {
    s.stop(pc.red("Failed to parse CSV file"));
    log.error(String(parseResult.left));
    process.exit(1);
  }

  const allResearchers = parseResult.right;
  s.stop(
    `Loaded ${pc.bold(String(allResearchers.length))} researchers from CSV`,
  );

  const researchers = await selectResearchers(allResearchers);

  let ok = 0;
  let skipped = 0;
  let errors = 0;
  let lastQuota: RateLimitInfo | null = null;

  for (const row of researchers) {
    const status = await processRow(row, redcapConfig, openAlexConfig, (q) => {
      lastQuota = q;
    });
    if (status === "ok") ok++;
    else if (status === "skipped") skipped++;
    else errors++;
  }

  showQuota(lastQuota, "OpenAlex quota after");

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
