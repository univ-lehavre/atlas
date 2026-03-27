/**
 * CLI entry point for atlas-researcher-profiles.
 *
 * Commands:
 *   from-redcap      — resolve OpenAlex works from REDCap researchers
 *   match-references — match publications file against oa_references (default)
 */

import { intro, log, text, isCancel, cancel } from "@clack/prompts";
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
  atlas-researcher-profiles [match-references] [--threshold N]
  atlas-researcher-profiles from-redcap

${pc.bold("Options:")}
  --threshold N   Fuse.js match threshold (0–1, default 0.2; lower = stricter)

${pc.bold("Environment variables:")}
  REDCAP_API_URL             REDCap API URL
  REDCAP_API_TOKEN           REDCap API token
  OPENALEX_USER_AGENT        User-Agent for OpenAlex API (e.g. mailto:you@example.com)
`);
};

const promptThreshold = async (): Promise<number> => {
  const answer = await text({
    message: "Fuse.js match threshold (0–1, lower = stricter):",
    initialValue: "0.2",
    validate: (v) => {
      const n = Number.parseFloat(v ?? "");
      if (Number.isNaN(n) || n < 0 || n > 1)
        return "Must be a number between 0 and 1";
      return void 0;
    },
  });
  if (isCancel(answer)) {
    cancel("Cancelled.");
    process.exit(0);
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- answer is string | symbol; symbol case is handled by isCancel above
  return Number.parseFloat(answer as string);
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

  const knownCommands = ["from-redcap", "match-references"];
  if (command !== undefined && !knownCommands.includes(command)) {
    log.error(`Unknown command: ${pc.bold(command)}`);
    printHelp();
    process.exit(1);
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

  process.stdout.write("\u001Bc");
  intro(pc.cyan("atlas-researcher-profiles") + pc.dim(` v${VERSION}`));

  if (command === undefined) {
    await fromRedcap(opts);
    const threshold = await promptThreshold();
    await matchReferencesCommand({
      redcapUrl,
      redcapToken,
      threshold,
      openAlexUserAgent,
      openAlexApiKey,
    });
    return;
  }

  if (command === "from-redcap") {
    const args = process.argv.slice(3);
    if (args.length > 0) {
      log.error(
        `Unknown option(s) for from-redcap: ${args.map((a) => pc.bold(a)).join(", ")}`,
      );
      log.message(`Usage: atlas-researcher-profiles from-redcap`);
      process.exit(1);
    }
    await fromRedcap(opts);
    return;
  }

  if (command === "match-references") {
    const args = process.argv.slice(3);
    const thresholdIdx = args.indexOf("--threshold");
    const unknownArgs = args.filter(
      (a, i) => a !== "--threshold" && args[i - 1] !== "--threshold",
    );
    if (unknownArgs.length > 0) {
      log.error(
        `Unknown option(s) for match-references: ${unknownArgs.map((a) => pc.bold(a)).join(", ")}`,
      );
      log.message(
        `Usage: atlas-researcher-profiles match-references [--threshold N]`,
      );
      process.exit(1);
    }
    const thresholdArg =
      thresholdIdx !== -1 ? args[thresholdIdx + 1] : undefined;
    if (thresholdIdx !== -1 && thresholdArg === undefined) {
      log.error("--threshold requires a numeric value (e.g. --threshold 0.3)");
      process.exit(1);
    }
    const threshold = await (async () => {
      if (thresholdArg !== undefined) {
        const v = Number.parseFloat(thresholdArg);
        if (Number.isNaN(v)) {
          log.error(
            `Invalid threshold value: ${pc.bold(thresholdArg)} — must be a number between 0 and 1`,
          );
          process.exit(1);
        }
        return v;
      }
      return promptThreshold();
    })();
    await matchReferencesCommand({
      redcapUrl,
      redcapToken,
      threshold,
      openAlexUserAgent,
      openAlexApiKey,
    });
    return;
  }
};
