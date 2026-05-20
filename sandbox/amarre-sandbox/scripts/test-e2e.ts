#!/usr/bin/env -S tsx
/**
 * End-to-end smoke test of the magic-link auth flow against the sandbox.
 *
 *   1. POST /api/v1/auth/signup on the running amarre dev server.
 *   2. Poll Mailpit's API until the magic-link email lands.
 *   3. Extract the userId+secret from the email body.
 *   4. GET /login?userId=...&secret=... → expect 302 to /, with a
 *      session cookie set on the response.
 *   5. GET /api/v1/me with that cookie → expect 200 + the user payload.
 *   6. Cleanup : delete the test user via the Appwrite admin API and
 *      purge Mailpit.
 *
 * Prerequisites
 * -------------
 *   - `pnpm up` + `pnpm bootstrap` have run (Appwrite + REDCap ready,
 *     `.env` populated).
 *   - `pnpm -F amarre dev` is running on PUBLIC_LOGIN_URL.
 *
 * Exits with code 0 on success, non-zero with a clear failure message
 * otherwise.
 */

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");
const REPO_ROOT = resolve(SANDBOX_DIR, "../..");
const AMARRE_DIR = resolve(REPO_ROOT, "apps/amarre");
const MAILPIT_URL = "http://localhost:8025";

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

const sleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

interface MailpitSummary {
  messages: Array<{
    ID: string;
    To: Array<{ Address: string }>;
    Subject: string;
  }>;
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

const waitForReachable = async (
  url: string,
  label: string,
  timeoutMs = 10_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return; // 404 also means "reachable, just no route"
    } catch {
      /* not up */
    }
    await sleep(500);
  }
  throw new Error(`${label} unreachable at ${url}`);
};

const isReachable = async (url: string): Promise<boolean> => {
  try {
    const r = await fetch(url);
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
};

const spawnAmarreDev = (): ChildProcess => {
  const child = spawn("pnpm", ["dev"], {
    cwd: AMARRE_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  child.stdout?.on("data", () => undefined);
  child.stderr?.on("data", () => undefined);
  return child;
};

const purgeMailpit = async (): Promise<void> => {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" }).catch(
    () => undefined,
  );
};

const findMagicEmail = async (
  to: string,
  timeoutMs = 30_000,
): Promise<{ id: string; body: string }> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (r.ok) {
      const list = (await r.json()) as MailpitSummary;
      const hit = list.messages.find((m) =>
        m.To.some((addr) => addr.Address.toLowerCase() === to.toLowerCase()),
      );
      if (hit) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${hit.ID}`);
        if (!detail.ok)
          throw new Error(
            `Mailpit message fetch failed: HTTP ${detail.status}`,
          );
        const msg = (await detail.json()) as MailpitMessage;
        return { id: hit.ID, body: msg.HTML || msg.Text };
      }
    }
    await sleep(1000);
  }
  throw new Error(
    `Magic-link email for ${to} did not arrive within ${timeoutMs / 1000}s`,
  );
};

const extractMagicUrl = (body: string): { userId: string; secret: string } => {
  // Appwrite formats the magic URL as the LOGIN_URL with userId+secret
  // query params. The body may be HTML-escaped (&amp;).
  const cleaned = body.replace(/&amp;/g, "&");
  const m = cleaned.match(
    /userId=([A-Za-z0-9._-]+)[^"'\s]*?secret=([A-Za-z0-9._-]+)/,
  );
  if (!m) {
    const m2 = cleaned.match(
      /secret=([A-Za-z0-9._-]+)[^"'\s]*?userId=([A-Za-z0-9._-]+)/,
    );
    if (!m2)
      throw new Error("Could not find userId+secret in magic-link email body");
    return { userId: m2[2], secret: m2[1] };
  }
  return { userId: m[1], secret: m[2] };
};

const deleteAppwriteUser = async (
  env: EnvMap,
  userId: string,
): Promise<void> => {
  const endpoint =
    env["PUBLIC_APPWRITE_ENDPOINT"] || "http://localhost:8090/v1";
  const projectId = env["PUBLIC_APPWRITE_PROJECT"];
  const apiKey = env["APPWRITE_KEY"];
  if (!projectId || !apiKey || apiKey.startsWith("__")) return;
  await fetch(`${endpoint}/users/${userId}`, {
    method: "DELETE",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
  }).catch(() => undefined);
};

interface SessionPayload {
  data: { id: string; email: string } | null;
  error: { code: string; message: string } | null;
}

const main = async (): Promise<void> => {
  const env = await parseEnv();
  const appUrl = env["PUBLIC_LOGIN_URL"] || "http://localhost:5173";
  const email = env["E2E_TEST_EMAIL"] || "e2e-tester@amarre.local";

  console.log(`==> Pre-flight checks`);
  let amarreProc: ChildProcess | undefined;
  if (!(await isReachable(`${appUrl}/`))) {
    console.log(`  • amarre dev server not running — spawning it`);
    amarreProc = spawnAmarreDev();
    try {
      await waitForReachable(`${appUrl}/`, "amarre dev server", 60_000);
    } catch (err) {
      amarreProc.kill("SIGTERM");
      throw err;
    }
    console.log(`  ✓ amarre dev server ready (spawned, PID ${amarreProc.pid})`);
  }
  await waitForReachable(`${MAILPIT_URL}/api/v1/messages`, "Mailpit");
  console.log(`  ✓ amarre + Mailpit reachable`);

  const cleanupSpawned = (): void => {
    if (amarreProc && !amarreProc.killed) {
      amarreProc.kill("SIGTERM");
      console.log(`  ✓ amarre dev server stopped`);
    }
  };
  process.on("exit", cleanupSpawned);
  process.on("SIGINT", () => {
    cleanupSpawned();
    process.exit(130);
  });

  console.log(`==> Purging Mailpit inbox`);
  await purgeMailpit();

  console.log(`==> POST /api/v1/auth/signup (${email})`);
  const signup = await fetch(`${appUrl}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const signupBody = (await signup.json()) as { data: unknown; error: unknown };
  if (!signup.ok || signupBody.error) {
    throw new Error(
      `Signup failed (HTTP ${signup.status}): ${JSON.stringify(signupBody)}`,
    );
  }
  console.log(`  ✓ Signup accepted`);

  console.log(`==> Waiting for magic-link email`);
  const mail = await findMagicEmail(email);
  console.log(`  ✓ Email received (Mailpit id ${mail.id})`);

  const { userId, secret } = extractMagicUrl(mail.body);
  console.log(
    `==> Magic link: userId=${userId.slice(0, 8)}…  secret=${secret.slice(0, 8)}…`,
  );

  console.log(`==> GET /login?userId=…&secret=…`);
  const loginRes = await fetch(
    `${appUrl}/login?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(secret)}`,
    { redirect: "manual" },
  );
  if (loginRes.status !== 302) {
    throw new Error(
      `Expected 302 redirect from /login, got ${loginRes.status}`,
    );
  }
  // amarre stores the Appwrite session in a cookie named `session` (cf.
  // SESSION_COOKIE in @univ-lehavre/atlas-baas). It's flagged HttpOnly +
  // Secure + SameSite=Strict — fine here because we're calling from a
  // fetch client that ignores Secure on HTTP.
  const sessionCookie = loginRes.headers
    .getSetCookie?.()
    .find((c) => c.split("=")[0] === "session");
  if (!sessionCookie) {
    throw new Error(
      `No session cookie set by /login. Headers: ${JSON.stringify([...loginRes.headers.entries()])}`,
    );
  }
  console.log(`  ✓ Redirect + session cookie set`);

  const cookiePair = sessionCookie.split(";")[0];

  console.log(`==> GET /api/v1/me with session cookie`);
  const me = await fetch(`${appUrl}/api/v1/me`, {
    headers: { Cookie: cookiePair },
  });
  const meBody = (await me.json()) as SessionPayload;
  if (!me.ok || !meBody.data) {
    throw new Error(
      `/api/v1/me failed (HTTP ${me.status}): ${JSON.stringify(meBody)}`,
    );
  }
  if (meBody.data.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error(
      `/api/v1/me returned email ${meBody.data.email}, expected ${email}`,
    );
  }
  console.log(`  ✓ Session is valid for ${meBody.data.email}`);

  console.log(`==> Cleanup`);
  await deleteAppwriteUser(env, userId);
  await purgeMailpit();
  cleanupSpawned();
  console.log(`  ✓ User + Mailpit purged\n`);

  console.log(`E2E magic-link flow: PASS`);
};

main().catch((err) => {
  console.error(`\n✗ E2E test failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
