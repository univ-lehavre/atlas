#!/usr/bin/env -S tsx
/**
 * Full headless bootstrap of the REDCap (CRF) side. API-only — never
 * runs SQL against REDCap's database, per project policy.
 *
 * Steps :
 *   1. Delegate to crf-sandbox (`pnpm docker:install`) — that flow
 *      creates the schema, the default project (id=1) and an API
 *      token for `site_admin`. We treat project 1 as the amarre
 *      project (renamed below). Creating a brand-new project would
 *      require a REDCap super-API token, which has to be minted by
 *      a super-user through the web UI — out of scope here.
 *   2. Read the project 1 token from
 *      `crf-sandbox/docker/config/.env.test` and use it for all
 *      subsequent calls.
 *   3. POST /api/?content=project_settings&action=import to rename
 *      project 1 to "amarre" and flip it to development status (the
 *      metadata import below is rejected by REDCap on a production
 *      project).
 *   4. POST /api/?content=metadata&action=import to load the amarre
 *      data dictionary on top.
 *   5. Persist the token in `.env` as `CRF_API_TOKEN`.
 *
 * The data dictionary lives in `data-dictionaries/127-amarre-v1.json`.
 * REDCap's export format has the metadata under `.fields[]` and that
 * shape is exactly what `content=metadata&action=import` expects, so
 * we forward the array verbatim.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");
const REPO_ROOT = resolve(SANDBOX_DIR, "../..");
const DATA_DICT_PATH = resolve(
  REPO_ROOT,
  "data-dictionaries/127-amarre-v1.json",
);
const CRF_SANDBOX_DIR = resolve(SANDBOX_DIR, "../crf-sandbox");
const CRF_TOKEN_FILE = resolve(CRF_SANDBOX_DIR, "docker/config/.env.test");

type EnvMap = Record<string, string>;

const parseEnv = (raw: string): EnvMap => {
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

const upsertEnv = async (updates: EnvMap): Promise<void> => {
  const raw = await readFile(ENV_PATH, "utf8");
  const lines = raw.split("\n");
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const eq = line.indexOf("=");
    if (eq === -1 || line.trim().startsWith("#")) return line;
    const key = line.slice(0, eq).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) next.push(`${k}=${v}`);
  }
  await writeFile(ENV_PATH, next.join("\n"));
};

const run = (cmd: string, args: string[], cwd: string): Promise<void> =>
  new Promise((resolveP, rejectP) => {
    const c = spawn(cmd, args, { cwd, stdio: "inherit" });
    c.on("error", rejectP);
    c.on("exit", (code) => {
      if (code === 0) resolveP();
      else
        rejectP(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });

interface CrfCallParams {
  crfUrl: string;
  token: string;
  body: Record<string, string>;
}

/**
 * Validate that a URL read from `.env` points somewhere we expect to
 * call (http/https + localhost / docker host). Defends against an
 * accidental or malicious `.env` rewrite redirecting the bootstrap
 * to an attacker-controlled endpoint with our token in the body —
 * CodeQL's `js/file-access-to-http` alert.
 */
const ALLOWED_CRF_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const ensureSafeCrfUrl = (raw: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`PUBLIC_CRF_URL is not a valid URL: ${raw}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(
      `PUBLIC_CRF_URL must be http(s); got ${parsed.protocol} (${raw})`,
    );
  }
  if (!ALLOWED_CRF_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `PUBLIC_CRF_URL must point to localhost (allowed: ${[...ALLOWED_CRF_HOSTS].join(", ")}); got ${parsed.hostname}`,
    );
  }
  return parsed.href;
};

/**
 * Single point of contact for REDCap's API. Always urlencoded,
 * always returns the raw text response. Callers parse as needed.
 */
const crfCall = async ({
  crfUrl,
  token,
  body,
}: CrfCallParams): Promise<string> => {
  const safeUrl = ensureSafeCrfUrl(crfUrl);
  const params = new URLSearchParams({ token, returnFormat: "json", ...body });
  const r = await fetch(safeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(
      `REDCap ${body.content}/${body.action ?? "export"} failed (HTTP ${r.status}): ${text.slice(0, 500)}`,
    );
  }
  return text;
};

interface ProjectSettings {
  project_id?: number;
  project_title?: string;
  in_production?: number; // 1 = production, 0 = development
  [k: string]: unknown;
}

const exportProjectSettings = async (
  crfUrl: string,
  token: string,
): Promise<ProjectSettings> => {
  const text = await crfCall({
    crfUrl,
    token,
    body: { content: "project", format: "json" },
  });
  // REDCap returns either an object or an array with one element.
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed[0] : parsed;
};

const renameToAmarre = async (crfUrl: string, token: string): Promise<void> => {
  // project_settings/import (JSON format) expects an OBJECT, not an
  // array — REDCap's PHP iterates project_fields and reads keys by
  // header from `$data`. CSV format would use the first row of the
  // array; JSON uses the object directly.
  //
  // Note: in_production is NOT in this endpoint's allowed-fields list
  // (cf. moveProjectToDev() above for the production-to-dev toggle).
  const data = {
    project_title: "amarre",
    project_language: "Francais_11.3.1",
  };
  await crfCall({
    crfUrl,
    token,
    body: {
      content: "project_settings",
      action: "import",
      format: "json",
      data: JSON.stringify(data),
    },
  });
};

interface DataDictionaryField {
  field_name: string;
  form_name: string;
  field_type: string;
  field_label: string;
  [k: string]: unknown;
}

interface DataDictionary {
  fields: DataDictionaryField[];
}

const importDataDictionary = async (
  crfUrl: string,
  token: string,
): Promise<void> => {
  const raw = await readFile(DATA_DICT_PATH, "utf8").catch(() => {
    throw new Error(
      `Data dictionary not found at ${DATA_DICT_PATH}\n` +
        `\n` +
        `This file is gitignored (potentially sensitive : field labels +\n` +
        `branching logic) so it must be generated locally before the first\n` +
        `bootstrap. Two options :\n` +
        `\n` +
        `  1. Export from prod REDCap (requires REDCAP_API_TOKEN in repo .env\n` +
        `     or redcap-token.csv at the repo root) :\n` +
        `       pnpm crf:dictionaries:export --apply\n` +
        `\n` +
        `  2. Ask a teammate to send you the anonymised export and drop it\n` +
        `     in data-dictionaries/ at the repo root.\n` +
        `\n` +
        `See apps/amarre/tests/RUNBOOK.md → "Préparer le data dictionary".`,
    );
  });
  const dict = JSON.parse(raw) as DataDictionary;
  if (!Array.isArray(dict.fields) || dict.fields.length === 0) {
    throw new Error(`No fields found in ${DATA_DICT_PATH}`);
  }
  // The export at data-dictionaries/127-amarre-v1.json carries a few
  // field_names with brackets (e.g. `alignement_[REDACTED]`) — REDCap
  // accepts them via metadata/import but later rejects record imports
  // for those columns. Strip them upfront.
  const validName = /^[a-z][a-z0-9_]*$/;
  const fields = dict.fields.filter((f) => validName.test(f.field_name));
  const dropped = dict.fields.length - fields.length;

  const text = await crfCall({
    crfUrl,
    token,
    body: {
      content: "metadata",
      action: "import",
      format: "json",
      data: JSON.stringify(fields),
    },
  });
  if (dropped > 0) {
    console.log(
      `  ✓ Data dictionary imported (${text.trim()} fields; ${dropped} placeholder names skipped)`,
    );
  } else {
    console.log(`  ✓ Data dictionary imported (${text.trim()} fields)`);
  }
};

const main = async (): Promise<void> => {
  console.log(`==> Delegating CRF install to crf-sandbox`);
  await run("pnpm", ["docker:install"], CRF_SANDBOX_DIR);

  const envRaw = await readFile(ENV_PATH, "utf8");
  const env = parseEnv(envRaw);
  const crfUrl = env["PUBLIC_CRF_URL"] || "http://localhost:8888/api/";

  console.log(`==> Reading project 1 API token from crf-sandbox`);
  const tokenRaw = await readFile(CRF_TOKEN_FILE, "utf8").catch(() => {
    throw new Error(`Expected ${CRF_TOKEN_FILE} after crf-sandbox install`);
  });
  const tokenEnv = parseEnv(tokenRaw);
  const token =
    tokenEnv["REDCAP_API_TOKEN"] ||
    tokenEnv["REDCAP_TOKEN_PROJECT_1"] ||
    tokenEnv["CRF_API_TOKEN"];
  if (!token) {
    throw new Error(`No REDCap token in ${CRF_TOKEN_FILE}`);
  }
  console.log(`  ✓ Token loaded`);

  console.log(`==> Checking current project state via API`);
  const before = await exportProjectSettings(crfUrl, token);
  console.log(
    `  • project_id=${before.project_id} title='${before.project_title}' in_production=${before.in_production}`,
  );

  if (before.in_production === 1) {
    throw new Error(
      `Project ${before.project_id} is in production (in_production=1). ` +
        `Metadata import is blocked by REDCap in that state and the API ` +
        `doesn't expose a production-to-development toggle. ` +
        `Re-run \`pnpm docker:reset && pnpm docker:up\` to get a fresh install ` +
        `where install-crf.sh keeps the project in development.`,
    );
  }

  if (before.project_title !== "amarre") {
    console.log(`==> Renaming project to 'amarre'`);
    await renameToAmarre(crfUrl, token);
    const after = await exportProjectSettings(crfUrl, token);
    console.log(`  ✓ Now title='${after.project_title}'`);
  } else {
    console.log(`  • Project already named 'amarre'`);
  }

  console.log(`==> Importing amarre data dictionary`);
  await importDataDictionary(crfUrl, token);

  console.log(`==> Writing CRF_API_TOKEN to .env`);
  await upsertEnv({ CRF_API_TOKEN: token });
  console.log(`  ✓ .env updated\n`);
  console.log(`Done. REDCap 'amarre' project ready at ${crfUrl}`);
};

main().catch((err) => {
  console.error(`\n✗ bootstrap-crf failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
