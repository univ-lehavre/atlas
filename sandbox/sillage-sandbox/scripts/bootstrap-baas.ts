#!/usr/bin/env -S tsx
/**
 * Full headless bootstrap of the self-hosted Appwrite stack used by sillage.
 *
 * Steps (all idempotent — safe to re-run) :
 *   1. Wait for /v1/health
 *   2. Create the root account via POST /v1/account on project `console`.
 *      First account on a fresh install is automatically promoted to root.
 *   3. Open a console session (POST /v1/account/sessions/email) and grab
 *      the `a_session_console_legacy` cookie.
 *   4. Create the organisation (POST /v1/teams) with a stable ID.
 *   5. Create the project (POST /v1/projects) with a stable ID.
 *   6. Create a server API key (POST /v1/projects/{id}/keys) with the
 *      scopes sillage needs (users.read/write, sessions.write, account).
 *   7. Persist PUBLIC_APPWRITE_PROJECT + APPWRITE_KEY to `.env`.
 *
 * The endpoints /v1/teams, /v1/projects, /v1/projects/.../keys are the
 * same ones the Appwrite console calls — they are stable across the
 * 1.x line but are not part of the public REST contract. If a future
 * Appwrite major reshuffles them, this script is the one to patch.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");

// Scopes valides sur Appwrite 1.9 — `account` n'existe pas/plus comme
// scope serveur. Pour le flow magic-link d'sillage (createMagicURLToken +
// createSession + users.delete), on a besoin des trois ci-dessous.
const REQUIRED_SCOPES = [
  "users.read",
  "users.write",
  "sessions.write",
] as const;

type EnvMap = Record<string, string>;

const parseEnv = (raw: string): EnvMap => {
  const out: EnvMap = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
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
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }
  await writeFile(ENV_PATH, next.join("\n"));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

const waitForHealth = async (
  endpoint: string,
  timeoutMs = 120_000,
): Promise<void> => {
  // /health requires health.read scope (401 for guests), but /health/version
  // is public and a perfect liveness probe — it 200s as soon as the worker
  // is up and connected to the DB.
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${endpoint}/health/version`, {
        headers: { "X-Appwrite-Project": "console" },
      });
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(2000);
  }
  throw new Error(
    `Appwrite never became healthy at ${endpoint}/health/version`,
  );
};

interface AppwriteContext {
  endpoint: string;
  cookies: string;
}

const consoleHeaders = (
  ctx: Pick<AppwriteContext, "cookies">,
): Record<string, string> => ({
  "X-Appwrite-Project": "console",
  "X-Appwrite-Response-Format": "1.9.0",
  "Content-Type": "application/json",
  ...(ctx.cookies ? { Cookie: ctx.cookies } : {}),
});

const extractCookies = (setCookieHeaders: string[]): string =>
  setCookieHeaders
    .map((h) => h.split(";")[0])
    .filter((c) => c.startsWith("a_session_console"))
    .join("; ");

const callAppwrite = async <T>(
  ctx: AppwriteContext,
  path: string,
  init: RequestInit & { acceptStatuses?: number[] } = {},
): Promise<{ status: number; body: T | undefined; setCookie: string[] }> => {
  const { acceptStatuses, ...rest } = init;
  const r = await fetch(`${ctx.endpoint}${path}`, {
    ...rest,
    headers: {
      ...consoleHeaders(ctx),
      ...(rest.headers ?? {}),
    },
  });
  const setCookie = r.headers.getSetCookie?.() ?? [];
  const accept = acceptStatuses ?? [200, 201];
  let body: T | undefined;
  const text = await r.text();
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = undefined;
    }
  }
  if (!r.ok && !accept.includes(r.status)) {
    throw new Error(
      `Appwrite ${path} → HTTP ${r.status}\n${typeof body === "object" ? JSON.stringify(body, null, 2) : text}`,
    );
  }
  return { status: r.status, body, setCookie };
};

interface RootAccountConfig {
  email: string;
  password: string;
  name: string;
}

const ensureRootAccountAndSession = async (
  endpoint: string,
  cfg: RootAccountConfig,
): Promise<AppwriteContext> => {
  const ctx: AppwriteContext = { endpoint, cookies: "" };
  const created = await callAppwrite<{ $id: string }>(ctx, "/account", {
    method: "POST",
    body: JSON.stringify({
      userId: "unique()",
      email: cfg.email,
      password: cfg.password,
      name: cfg.name,
    }),
    acceptStatuses: [201, 409],
  });
  if (created.status === 201) {
    console.log(`  ✓ Root account created (${cfg.email})`);
  } else {
    console.log(`  • Root account already exists, logging in`);
  }
  const session = await callAppwrite<{ $id: string }>(
    ctx,
    "/account/sessions/email",
    {
      method: "POST",
      body: JSON.stringify({ email: cfg.email, password: cfg.password }),
    },
  );
  const cookies = extractCookies(session.setCookie);
  if (!cookies)
    throw new Error("No console session cookie returned by Appwrite");
  console.log(`  ✓ Console session opened`);
  return { endpoint, cookies };
};

const ensureTeam = async (
  ctx: AppwriteContext,
  teamId: string,
  name: string,
): Promise<string> => {
  const res = await callAppwrite<{ $id: string }>(ctx, "/teams", {
    method: "POST",
    body: JSON.stringify({ teamId, name }),
    acceptStatuses: [201, 409],
  });
  if (res.status === 201) {
    console.log(`  ✓ Team created (${teamId})`);
  } else {
    console.log(`  • Team already exists (${teamId})`);
  }
  return teamId;
};

interface ProjectConfig {
  projectId: string;
  name: string;
  teamId: string;
  region: string;
}

const ensureProject = async (
  ctx: AppwriteContext,
  cfg: ProjectConfig,
): Promise<string> => {
  const res = await callAppwrite<{ $id: string }>(ctx, "/projects", {
    method: "POST",
    body: JSON.stringify({
      projectId: cfg.projectId,
      name: cfg.name,
      teamId: cfg.teamId,
      region: cfg.region,
    }),
    acceptStatuses: [201, 409],
  });
  if (res.status === 201) {
    console.log(`  ✓ Project created (${cfg.projectId})`);
  } else {
    console.log(`  • Project already exists (${cfg.projectId})`);
  }
  return cfg.projectId;
};

interface KeyDoc {
  $id: string;
  name: string;
  secret: string;
  scopes: string[];
}

interface KeyListResponse {
  total: number;
  keys: KeyDoc[];
}

const ensureApiKey = async (
  ctx: AppwriteContext,
  projectId: string,
  keyName = "sillage-sandbox",
): Promise<string> => {
  const list = await callAppwrite<KeyListResponse>(
    ctx,
    `/projects/${projectId}/keys`,
    {
      method: "GET",
    },
  );
  const existing = list.body?.keys?.find((k) => k.name === keyName);
  if (existing?.secret) {
    console.log(`  • Reusing existing API key (${keyName})`);
    return existing.secret;
  }
  const created = await callAppwrite<KeyDoc>(
    ctx,
    `/projects/${projectId}/keys`,
    {
      method: "POST",
      body: JSON.stringify({
        name: keyName,
        scopes: [...REQUIRED_SCOPES],
        expire: null,
      }),
    },
  );
  if (!created.body?.secret) {
    throw new Error("Appwrite returned a key with no secret — aborting");
  }
  console.log(`  ✓ API key created (${keyName})`);
  return created.body.secret;
};

const main = async (): Promise<void> => {
  const raw = await readFile(ENV_PATH, "utf8").catch(() => {
    throw new Error(`Missing ${ENV_PATH}. Run \`cp .env.example .env\` first.`);
  });
  const env = parseEnv(raw);

  const endpoint =
    env["PUBLIC_APPWRITE_ENDPOINT"] || "http://localhost:8090/v1";
  const root: RootAccountConfig = {
    email: env["APPWRITE_ROOT_EMAIL"] || "admin@sillage.local",
    password: env["APPWRITE_ROOT_PASSWORD"] || "",
    name: env["APPWRITE_ROOT_NAME"] || "Sillage Sandbox Admin",
  };
  if (root.password.length < 8) {
    throw new Error("APPWRITE_ROOT_PASSWORD must be ≥ 8 characters");
  }

  console.log(`==> Waiting for Appwrite health (${endpoint}/health)`);
  await waitForHealth(endpoint);
  console.log(`  ✓ Appwrite is healthy`);

  console.log(`==> Ensuring root account + console session`);
  const ctx = await ensureRootAccountAndSession(endpoint, root);

  const teamId = env["APPWRITE_ORG_ID"] || "org-sillage-sandbox";
  const teamName = env["APPWRITE_ORG_NAME"] || "Sillage Sandbox";
  console.log(`==> Ensuring organisation`);
  await ensureTeam(ctx, teamId, teamName);

  const projectCfg: ProjectConfig = {
    projectId: env["APPWRITE_PROJECT_ID"] || "sillage",
    name: env["APPWRITE_PROJECT_NAME"] || "sillage",
    teamId,
    region: env["APPWRITE_PROJECT_REGION"] || "fra",
  };
  console.log(`==> Ensuring project`);
  const projectId = await ensureProject(ctx, projectCfg);

  console.log(`==> Ensuring server API key`);
  const apiKey = await ensureApiKey(ctx, projectId);

  console.log(`==> Writing PUBLIC_APPWRITE_PROJECT and APPWRITE_KEY to .env`);
  await upsertEnv({
    PUBLIC_APPWRITE_PROJECT: projectId,
    APPWRITE_KEY: apiKey,
  });
  console.log(`  ✓ .env updated\n`);
  console.log(`Done. Project '${projectId}' ready at ${endpoint}.`);
};

main().catch((err) => {
  console.error(`\n✗ bootstrap-baas failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
