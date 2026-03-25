/**
 * CLI entry point for atlas-researcher-profiles.
 *
 * Commands:
 *   from-csv <file>  — resolve OpenAlex works from a CSV file
 *   from-redcap      — resolve OpenAlex works from REDCap researchers
 */

import { intro, log } from "@clack/prompts";
import pc from "picocolors";
import { fromCsv } from "./from-csv.js";
import { fromRedcap } from "./from-redcap.js";

const VERSION = "1.0.0";

const getEnv = (name: string): string => process.env[name] ?? "";

const printHelp = (): void => {
  console.log(`
${pc.bold("atlas-researcher-profiles")} v${VERSION}

Resolve OpenAlex works for researchers and write results to REDCap.

${pc.bold("Usage:")}
  atlas-researcher-profiles from-csv <file>   Read researchers from CSV file
  atlas-researcher-profiles from-redcap        Read researchers from REDCap

${pc.bold("Environment variables:")}
  REDCAP_API_URL             REDCap API URL
  REDCAP_API_TOKEN           REDCap API token
  OPENALEX_USER_AGENT        User-Agent for OpenAlex API (e.g. mailto:you@example.com)

${pc.bold("CSV columns:")}
  userid, last_name, middle_name, first_name, orcid
`);
};

export const main = async (): Promise<void> => {
  const command = process.argv[2];

  if (command === undefined || command === "--help" || command === "-h") {
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

  if (redcapUrl === "" || redcapToken === "") {
    log.error(
      "Missing required environment variables: REDCAP_API_URL and REDCAP_API_TOKEN",
    );
    process.exit(1);
  }

  if (command === "from-csv") {
    const filePath = process.argv[3];
    if (filePath === undefined) {
      log.error("Usage: atlas-researcher-profiles from-csv <file>");
      process.exit(1);
    }
    intro(pc.cyan("atlas-researcher-profiles") + pc.dim(" · from-csv"));
    await fromCsv({ filePath, redcapUrl, redcapToken, openAlexUserAgent });
    return;
  }

  if (command === "from-redcap") {
    intro(pc.cyan("atlas-researcher-profiles") + pc.dim(" · from-redcap"));
    await fromRedcap({ redcapUrl, redcapToken, openAlexUserAgent });
    return;
  }

  log.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
};
