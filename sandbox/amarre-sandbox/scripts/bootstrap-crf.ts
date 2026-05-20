#!/usr/bin/env -S tsx
/**
 * Full headless bootstrap of the REDCap (CRF) side :
 *   1. Delegate to crf-sandbox (`pnpm docker:install`) — that creates the
 *      database schema and a default test project (id=1) with its own
 *      API token. We leave that project alone — it's the generic test
 *      project the crf-sandbox tests rely on.
 *   2. Create a dedicated `amarre` REDCap project (id=2) via SQL INSERT
 *      into `redcap_projects`, grant API access to `site_admin`, and
 *      import the amarre data dictionary into it.
 *   3. Persist `CRF_API_TOKEN` (the amarre project token) in `.env`.
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
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");
const REPO_ROOT = resolve(SANDBOX_DIR, "../..");
const DATA_DICT_PATH = resolve(
  REPO_ROOT,
  "data-dictionaries/127-amarre-v1.json",
);
const CRF_SANDBOX_DIR = resolve(SANDBOX_DIR, "../crf-sandbox");

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

const dockerExec = (container: string, cmd: string[]): Promise<string> =>
  new Promise((resolveP, rejectP) => {
    const c = spawn("docker", ["exec", container, ...cmd], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    c.stdout.on("data", (d) => (stdout += d.toString()));
    c.stderr.on("data", (d) => (stderr += d.toString()));
    c.on("error", rejectP);
    c.on("exit", (code) => {
      if (code === 0) resolveP(stdout);
      else
        rejectP(
          new Error(`docker exec ${container} failed (${code}):\n${stderr}`),
        );
    });
  });

const findMariadbContainer = async (): Promise<string> => {
  const out = await new Promise<string>((resolveP, rejectP) => {
    const c = spawn("docker", ["ps", "--format", "{{.Names}}"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    c.stdout.on("data", (d) => (stdout += d.toString()));
    c.on("error", rejectP);
    c.on("exit", () => resolveP(stdout));
  });
  // The redcap-side MariaDB container is named `<project>-mariadb-1`.
  // Exclude `baas-mariadb` which belongs to the Appwrite stack.
  const match = out
    .split("\n")
    .map((s) => s.trim())
    .find((n) => /(^|-)mariadb-1$/.test(n) && !n.includes("baas"));
  if (!match) {
    throw new Error(
      "Could not locate the REDCap MariaDB container — is the stack up?",
    );
  }
  return match;
};

const runSql = async (container: string, sql: string): Promise<string> => {
  return dockerExec(container, [
    "mariadb",
    "-u",
    "redcap",
    "-predcap_password",
    "redcap",
    "-N",
    "-B",
    "-e",
    sql,
  ]);
};

const relaxDictionaryFk = async (container: string): Promise<void> => {
  // REDCap's metadata import API inserts rows in redcap_data_dictionaries
  // with doc_id=0 (sentinel), which violates the FK to redcap_edocs_metadata.
  // The constraint is on a snapshot index, not user data — safe to drop in
  // a sandbox. Tolerate "constraint doesn't exist" on re-runs.
  try {
    await runSql(
      container,
      "ALTER TABLE redcap_data_dictionaries DROP FOREIGN KEY redcap_data_dictionaries_ibfk_1;",
    );
    console.log(`  ✓ FK redcap_data_dictionaries_ibfk_1 dropped`);
  } catch (err) {
    if (String(err).includes("Check that column/key exists")) {
      console.log(`  • FK already dropped`);
    } else {
      throw err;
    }
  }
};

const findAmarreProjectId = async (
  container: string,
): Promise<number | null> => {
  const out = await runSql(
    container,
    "SELECT project_id FROM redcap_projects WHERE project_name='amarre' LIMIT 1;",
  );
  const trimmed = out.trim();
  return trimmed ? Number(trimmed) : null;
};

const generateApiToken = (): string =>
  randomBytes(16).toString("hex").toUpperCase();

const createAmarreProject = async (container: string): Promise<number> => {
  // Minimal viable INSERT — REDCap auto-increments project_id. We pick the
  // columns that have constraints (NOT NULL without default) or that we
  // need set explicitly:
  //   - project_name   : unique handle the bootstrap re-uses on re-runs
  //   - app_title      : display name
  //   - status=0       : development mode (so metadata import is allowed)
  //   - project_language : matches the dictionary's locale
  //   - creation_time  : NOW()
  //   - count_project  : 1 (default)
  await runSql(
    container,
    `INSERT INTO redcap_projects
       (project_name, app_title, status, project_language, creation_time, count_project)
     VALUES
       ('amarre', 'amarre', 0, 'Francais_11.3.1', NOW(), 1);`,
  );
  const id = await findAmarreProjectId(container);
  if (id === null) {
    throw new Error("Failed to read back the newly-created amarre project id");
  }
  return id;
};

const grantAmarreApiToken = async (
  container: string,
  projectId: number,
  token: string,
): Promise<void> => {
  // ON DUPLICATE KEY UPDATE makes this safe to re-run if the row already
  // exists (composite unique key on project_id+username).
  await runSql(
    container,
    `INSERT INTO redcap_user_rights
       (project_id, username, api_token, api_export, api_import,
        data_export_tool, data_import_tool, data_logging, user_rights,
        design, alerts, graphical, data_quality_design)
     VALUES (${projectId}, 'site_admin', '${token}',
             1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
     ON DUPLICATE KEY UPDATE api_token=VALUES(api_token),
                             api_export=1, api_import=1;`,
  );
};

const readExistingAmarreToken = async (
  container: string,
  projectId: number,
): Promise<string | null> => {
  const out = await runSql(
    container,
    `SELECT api_token FROM redcap_user_rights
     WHERE project_id=${projectId} AND username='site_admin' LIMIT 1;`,
  );
  const trimmed = out.trim();
  return trimmed && trimmed !== "NULL" ? trimmed : null;
};

interface AmarreProjectInfo {
  projectId: number;
  apiToken: string;
}

const ensureAmarreProject = async (
  container: string,
): Promise<AmarreProjectInfo> => {
  await relaxDictionaryFk(container);

  let projectId = await findAmarreProjectId(container);
  let apiToken: string | null = null;

  if (projectId !== null) {
    console.log(`  • Project 'amarre' already exists (id=${projectId})`);
    apiToken = await readExistingAmarreToken(container, projectId);
  } else {
    projectId = await createAmarreProject(container);
    console.log(`  ✓ Project 'amarre' created (id=${projectId})`);
  }

  if (!apiToken) {
    apiToken = generateApiToken();
    await grantAmarreApiToken(container, projectId, apiToken);
    console.log(`  ✓ API token issued for project ${projectId}`);
  } else {
    console.log(`  • Reusing existing API token for project ${projectId}`);
  }

  return { projectId, apiToken };
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
  const raw = await readFile(DATA_DICT_PATH, "utf8");
  const dict = JSON.parse(raw) as DataDictionary;
  if (!Array.isArray(dict.fields) || dict.fields.length === 0) {
    throw new Error(`No fields found in ${DATA_DICT_PATH}`);
  }

  const params = new URLSearchParams();
  params.set("token", token);
  params.set("content", "metadata");
  params.set("action", "import");
  params.set("format", "json");
  params.set("data", JSON.stringify(dict.fields));
  params.set("returnFormat", "json");

  const r = await fetch(crfUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(
      `REDCap metadata import failed (HTTP ${r.status}): ${text}`,
    );
  }
  // REDCap returns the number of fields imported as a plain number.
  console.log(`  ✓ Data dictionary imported (${text.trim()} fields)`);
};

const main = async (): Promise<void> => {
  console.log(`==> Delegating CRF install to crf-sandbox`);
  await run("pnpm", ["docker:install"], CRF_SANDBOX_DIR);

  const envRaw = await readFile(ENV_PATH, "utf8");
  const env = parseEnv(envRaw);
  const crfUrl = env["PUBLIC_CRF_URL"] || "http://localhost:8888/api/";

  console.log(`==> Provisioning dedicated 'amarre' REDCap project`);
  const container = await findMariadbContainer();
  const { projectId, apiToken } = await ensureAmarreProject(container);

  console.log(`==> Importing amarre data dictionary into project ${projectId}`);
  await importDataDictionary(crfUrl, apiToken);

  console.log(`==> Writing CRF_API_TOKEN to .env`);
  await upsertEnv({ CRF_API_TOKEN: apiToken });
  console.log(`  ✓ .env updated\n`);
  console.log(`Done. REDCap 'amarre' project ready at ${crfUrl}`);
};

main().catch((err) => {
  console.error(`\n✗ bootstrap-crf failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
