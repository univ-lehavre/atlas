/**
 * CLI entry point for atlas-researcher-profiles.
 *
 * Commands:
 *   from-redcap  — resolve OpenAlex works from REDCap researchers
 */

import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import { fromRedcap } from "./from-redcap.js";
import { matchReferencesCommand } from "./match-references.js";

const VERSION = "1.0.0";

const getEnv = (name: string): string => process.env[name] ?? "";

const printHelp = (): void => {
  console.log(`
${pc.bold("atlas-researcher-profiles")} v${VERSION}

Resolve OpenAlex works for researchers and write results to REDCap.

${pc.bold("Usage:")}
  atlas-researcher-profiles from-redcap                      Read researchers from REDCap
  atlas-researcher-profiles match-references [--threshold N] Fuzzy-match publications file against oa_references

${pc.bold("Options:")}
  --threshold N   Fuse.js match threshold (0–1, default 0.2; lower = stricter)

${pc.bold("Environment variables:")}
  REDCAP_API_URL             REDCap API URL
  REDCAP_API_TOKEN           REDCap API token
  OPENALEX_USER_AGENT        User-Agent for OpenAlex API (e.g. mailto:you@example.com)
`);
};

export const main = async (): Promise<void> => {
  const command = process.argv[2];

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return;
  }

  const redcapUrl = getEnv("REDCAP_API_URL");
  const redcapToken = getEnv("REDCAP_API_TOKEN");
  const openAlexUserAgent =
    getEnv("OPENALEX_USER_AGENT") || "atlas-researcher-profiles/1.0.0";
  const openAlexApiKey = getEnv("OPENALEX_API_TOKEN") || undefined;

  if (redcapUrl === "" || redcapToken === "") {
    log.error(
      "Missing required environment variables: REDCAP_API_URL and REDCAP_API_TOKEN",
    );
    process.exit(1);
  }

  const opts = { redcapUrl, redcapToken, openAlexUserAgent, openAlexApiKey };

  if (command === undefined || command === "from-redcap") {
    process.stdout.write("\u001Bc");
    intro(pc.cyan("atlas-researcher-profiles") + pc.dim(" · from-redcap"));
    await fromRedcap(opts);
    return;
  }

  if (command === "match-references") {
    const thresholdArg =
      process.argv[3] === "--threshold" ? process.argv[4] : undefined;
    const threshold =
      thresholdArg !== undefined ? Number.parseFloat(thresholdArg) : 0.2;
    process.stdout.write("\u001Bc");
    intro(pc.cyan("atlas-researcher-profiles") + pc.dim(" · match-references"));
    await matchReferencesCommand({ redcapUrl, redcapToken, threshold });
    return;
  }

  log.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
};
