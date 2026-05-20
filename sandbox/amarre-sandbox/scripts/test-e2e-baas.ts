#!/usr/bin/env -S tsx
/**
 * End-to-end smoke test for the Appwrite admin auth path. Validates
 * that the credentials in `.env` actually log into the console
 * project, that the org and project provisioned by bootstrap-baas.ts
 * are visible, and that the session lifecycle (login → identity →
 * logout) works.
 *
 * Pure API — does NOT exercise the console SPA, because:
 *   - the SPA is upstream Appwrite Cloud-first and has known holes
 *     in self-hosted (e.g. some /v1/project/platforms routes 404)
 *   - the bootstrap, the amarre app, and our automation all talk to
 *     the API directly anyway. If the API auth works, amarre works.
 *
 * Steps:
 *   1. GET /v1/health/version (sanity: API up)
 *   2. POST /v1/account/sessions/email (admin login, capture
 *      a_session_console cookie)
 *   3. GET /v1/account → expect 200, email matches root creds
 *   4. GET /v1/teams → expect APPWRITE_ORG_ID present in the list
 *   5. GET /v1/projects → expect APPWRITE_PROJECT_ID under the org
 *   6. DELETE /v1/account/sessions/current → expect 204
 *   7. GET /v1/account with the now-stale cookie → expect 401
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");

type EnvMap = Record<string, string>;

const parseEnv = async (): Promise<EnvMap> => {
  const raw = await readFile(ENV_PATH, "utf8").catch(() => {
    throw new Error(`Missing ${ENV_PATH}. Run bootstrap first.`);
  });
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

const extractSessionCookie = (setCookieHeaders: string[]): string => {
  const pair = setCookieHeaders
    .map((h) => h.split(";")[0])
    .find((c) => c.startsWith("a_session_console"));
  if (!pair) throw new Error("No a_session_console cookie in response");
  return pair;
};

interface TeamDoc {
  $id: string;
  name: string;
}

interface TeamListResponse {
  total: number;
  teams: TeamDoc[];
}

interface ProjectDoc {
  $id: string;
  name: string;
  teamId: string;
}

interface ProjectListResponse {
  total: number;
  projects: ProjectDoc[];
}

interface AccountDoc {
  $id: string;
  email: string;
  name: string;
}

const main = async (): Promise<void> => {
  const env = await parseEnv();
  const endpoint =
    env["PUBLIC_APPWRITE_ENDPOINT"] || "http://localhost:8090/v1";
  const email = env["APPWRITE_ROOT_EMAIL"];
  const password = env["APPWRITE_ROOT_PASSWORD"];
  const orgId = env["APPWRITE_ORG_ID"] || "org-amarre-sandbox";
  const projectId = env["APPWRITE_PROJECT_ID"] || "amarre";

  if (!email || !password) {
    throw new Error(
      "APPWRITE_ROOT_EMAIL / APPWRITE_ROOT_PASSWORD must be set in .env",
    );
  }

  const headers: Record<string, string> = {
    "X-Appwrite-Project": "console",
    "Content-Type": "application/json",
  };

  console.log(`==> Pre-flight: API health`);
  const health = await fetch(`${endpoint}/health/version`, { headers });
  if (!health.ok) {
    throw new Error(`API unhealthy: HTTP ${health.status}`);
  }
  console.log(`  ✓ ${endpoint}/health/version → 200`);

  console.log(`==> Login: POST /account/sessions/email (${email})`);
  const loginRes = await fetch(`${endpoint}/account/sessions/email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  if (loginRes.status !== 201) {
    const body = await loginRes.text();
    throw new Error(`Login failed (HTTP ${loginRes.status}): ${body}`);
  }
  const sessionCookie = extractSessionCookie(
    loginRes.headers.getSetCookie?.() ?? [],
  );
  console.log(`  ✓ Session created, cookie captured`);

  const authedHeaders = { ...headers, Cookie: sessionCookie };

  console.log(`==> Identity: GET /account`);
  const me = await fetch(`${endpoint}/account`, { headers: authedHeaders });
  if (!me.ok) throw new Error(`/account failed (HTTP ${me.status})`);
  const meDoc = (await me.json()) as AccountDoc;
  if (meDoc.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error(`/account returned ${meDoc.email}, expected ${email}`);
  }
  console.log(`  ✓ Authenticated as ${meDoc.email}`);

  console.log(`==> Org check: GET /teams`);
  const teamsRes = await fetch(`${endpoint}/teams`, { headers: authedHeaders });
  if (!teamsRes.ok) throw new Error(`/teams failed (HTTP ${teamsRes.status})`);
  const teamsDoc = (await teamsRes.json()) as TeamListResponse;
  const team = teamsDoc.teams.find((t) => t.$id === orgId);
  if (!team) {
    throw new Error(
      `Org ${orgId} not found in /teams (got: ${teamsDoc.teams.map((t) => t.$id).join(", ") || "none"})`,
    );
  }
  console.log(`  ✓ Org '${team.$id}' (${team.name}) present`);

  console.log(`==> Project check: GET /projects`);
  const projectsRes = await fetch(`${endpoint}/projects`, {
    headers: authedHeaders,
  });
  if (!projectsRes.ok) {
    throw new Error(`/projects failed (HTTP ${projectsRes.status})`);
  }
  const projectsDoc = (await projectsRes.json()) as ProjectListResponse;
  const project = projectsDoc.projects.find((p) => p.$id === projectId);
  if (!project) {
    throw new Error(
      `Project ${projectId} not found in /projects (got: ${projectsDoc.projects.map((p) => p.$id).join(", ") || "none"})`,
    );
  }
  if (project.teamId !== orgId) {
    throw new Error(
      `Project ${projectId} is under team ${project.teamId}, expected ${orgId}`,
    );
  }
  console.log(
    `  ✓ Project '${project.$id}' (${project.name}) under '${orgId}'`,
  );

  console.log(`==> Logout: DELETE /account/sessions/current`);
  const logoutRes = await fetch(`${endpoint}/account/sessions/current`, {
    method: "DELETE",
    headers: authedHeaders,
  });
  if (logoutRes.status !== 204) {
    throw new Error(`Logout returned HTTP ${logoutRes.status}, expected 204`);
  }
  console.log(`  ✓ Session deleted`);

  console.log(`==> Stale-cookie check: GET /account again`);
  const meAgain = await fetch(`${endpoint}/account`, {
    headers: authedHeaders,
  });
  if (meAgain.status !== 401) {
    throw new Error(
      `Expected 401 with stale cookie, got HTTP ${meAgain.status}`,
    );
  }
  console.log(`  ✓ Stale cookie correctly rejected (401)\n`);

  console.log(`E2E Appwrite admin auth: PASS`);
};

main().catch((err) => {
  console.error(`\n✗ E2E baas auth test failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
