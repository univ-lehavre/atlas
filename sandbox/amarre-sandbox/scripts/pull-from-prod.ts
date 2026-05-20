#!/usr/bin/env -S tsx
/**
 * Opt-in : pull the real records from the production REDCap and import
 * them into the local sandbox. Requires PROD_CRF_URL + PROD_CRF_TOKEN
 * in `.env` (or via process env). Never commit those values.
 *
 * Workflow
 * --------
 *   1. Refuses to run unless PROD_CRF_URL + PROD_CRF_TOKEN are set.
 *   2. Prints what it's about to do and waits for `y` from stdin
 *      (skip with `--yes`).
 *   3. Pulls all records (`content=record`) from prod, JSON flat.
 *   4. Verifies the prod metadata matches the local one (warn on
 *      missing fields locally — the import will then drop them).
 *   5. Imports into the local amarre project.
 *
 * Privacy note
 * ------------
 * The records may contain nominative data. Once pulled they sit in
 * your local MariaDB volume in clear. Use `pnpm reset` to wipe.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");

type EnvMap = Record<string, string>;

const ENV_PROD_PATH = resolve(SANDBOX_DIR, ".env.prod");

const parseEnvFile = async (path: string): Promise<EnvMap> => {
  const raw = await readFile(path, "utf8").catch(() => "");
  const out: EnvMap = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return out;
};

// .env first, then .env.prod overrides (typically PROD_CRF_* persistent
// credentials kept out of the regular .env so they survive resets).
const parseEnv = async (): Promise<EnvMap> => {
  const base = await parseEnvFile(ENV_PATH);
  const overrides = await parseEnvFile(ENV_PROD_PATH);
  return { ...base, ...overrides };
};

const redcapCall = async (
  url: string,
  token: string,
  params: Record<string, string>,
): Promise<string> => {
  const body = new URLSearchParams({ token, ...params, returnFormat: "json" });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await r.text();
  if (!r.ok)
    throw new Error(
      `REDCap call (${params["content"]}) HTTP ${r.status}: ${text}`,
    );
  return text;
};

interface MetadataField {
  field_name: string;
}

const main = async (): Promise<void> => {
  const env = await parseEnv();
  const prodUrl = process.env["PROD_CRF_URL"] || env["PROD_CRF_URL"];
  const prodToken = process.env["PROD_CRF_TOKEN"] || env["PROD_CRF_TOKEN"];
  if (!prodUrl || !prodToken) {
    throw new Error(
      "PROD_CRF_URL and PROD_CRF_TOKEN must be set (in .env or env vars) for pull:prod",
    );
  }
  const localUrl = env["PUBLIC_CRF_URL"] || "http://localhost:8888/api/";
  const localToken = env["CRF_API_TOKEN"];
  if (!localToken || localToken.startsWith("__")) {
    throw new Error(
      "CRF_API_TOKEN not set in .env — run `pnpm bootstrap:crf` first",
    );
  }

  console.log(`==> About to pull real records from ${prodUrl}`);
  console.log(
    `    They will be imported into ${localUrl} (local amarre project).`,
  );
  console.log(`    The data may contain nominative information.\n`);

  const skipConfirm = process.argv.includes("--yes");
  if (!skipConfirm) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question("Continue ? [y/N] ");
    rl.close();
    if (answer.trim().toLowerCase() !== "y") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  console.log(`==> Pulling metadata from prod`);
  const prodMetaRaw = await redcapCall(prodUrl, prodToken, {
    content: "metadata",
    format: "json",
  });
  const prodMeta = JSON.parse(prodMetaRaw) as MetadataField[];
  const prodFields = new Set(prodMeta.map((f) => f.field_name));

  console.log(`==> Pulling metadata from local`);
  const localMetaRaw = await redcapCall(localUrl, localToken, {
    content: "metadata",
    format: "json",
  });
  const localMeta = JSON.parse(localMetaRaw) as MetadataField[];
  const localFields = new Set(localMeta.map((f) => f.field_name));

  const missing = [...prodFields].filter((f) => !localFields.has(f));
  if (missing.length > 0) {
    console.log(
      `  ⚠ ${missing.length} field(s) exist in prod but not locally; values will be dropped on import:`,
    );
    console.log(
      `    ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", …" : ""}`,
    );
  }

  console.log(`==> Pulling records from prod`);
  const recordsRaw = await redcapCall(prodUrl, prodToken, {
    content: "record",
    format: "json",
    type: "flat",
  });
  const records = JSON.parse(recordsRaw) as Array<Record<string, string>>;
  console.log(`  ✓ Pulled ${records.length} record(s)`);

  // Filter out fields the local instance doesn't know about (cleaner
  // logs, REDCap would just silently drop them otherwise).
  const cleaned = records.map((r) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      if (localFields.has(k.replace(/___.+$/, ""))) next[k] = v;
    }
    return next;
  });

  console.log(`==> Importing into local REDCap`);
  const batchSize = 50;
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const res = await redcapCall(localUrl, localToken, {
      content: "record",
      format: "json",
      type: "flat",
      overwriteBehavior: "overwrite",
      forceAutoNumber: "false",
      data: JSON.stringify(cleaned.slice(i, i + batchSize)),
      returnContent: "count",
    });
    console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: ${res.trim()}`);
  }
  console.log(
    `\nDone. ${cleaned.length} records pulled from prod into local sandbox.`,
  );
};

main().catch((err) => {
  console.error(`\n✗ pull-from-prod failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
