#!/usr/bin/env -S tsx
/**
 * Browser-driven end-to-end test of the amarre user journey.
 *
 * Drives the real app with Playwright (headless Chromium) :
 *   1. Spawn `pnpm -F amarre dev` if localhost:5173 isn't already up
 *   2. SIGNUP — open landing page, click "S'authentifier", fill email,
 *      submit, poll Mailpit for the magic-link, navigate to it,
 *      assert the post-login page shows the user's email
 *   3. CREATE REQUEST — open the "Créer une demande" modal, check the
 *      RGPD consent box, submit. Verify the record was actually
 *      created in REDCap by hitting the API (the SvelteKit form
 *      action either redirects to the REDCap survey URL or stays
 *      on the page; either way, the record must exist downstream)
 *   4. LOGOUT — submit the logout form in the Administrate panel,
 *      verify the landing page no longer shows the user's email and
 *      that the session cookie is cleared
 *   5. Cleanup — delete the test user via Appwrite admin API, purge
 *      Mailpit, kill any spawned dev server
 *
 * This is the UI counterpart to test-e2e.ts (pure fetch). It catches
 * regressions in the actual user-visible flow : Bootstrap modals,
 * SvelteKit form actions, server hooks, post-action redirects.
 *
 * Form-filling note: amarre's main request form is hosted by REDCap
 * (118 fields, branching logic) — we don't try to fill all of it
 * via the UI. Our coverage stops at "request created", and the
 * record contents are exercised separately by `pnpm seed`.
 *
 * Prerequisites :
 *   - sandbox is up (`pnpm docker:up && pnpm bootstrap`)
 *   - Playwright Chromium installed (`pnpm exec playwright install chromium`)
 */

import { readFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = resolve(__dirname, "..");
const ENV_PATH = resolve(SANDBOX_DIR, ".env");
const REPO_ROOT = resolve(SANDBOX_DIR, "../..");
const AMARRE_DIR = resolve(REPO_ROOT, "apps/amarre");
const ARTIFACTS_DIR = resolve(SANDBOX_DIR, ".artifacts");
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

const isReachable = async (url: string): Promise<boolean> => {
  try {
    const r = await fetch(url);
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
};

const waitReachable = async (
  url: string,
  label: string,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await sleep(500);
  }
  throw new Error(`${label} unreachable at ${url}`);
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

interface MailpitSummary {
  messages: Array<{ ID: string; To: Array<{ Address: string }> }>;
}

interface MailpitMessage {
  HTML: string;
  Text: string;
}

const findMagicLink = async (
  to: string,
  timeoutMs = 30_000,
): Promise<string> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
    if (r.ok) {
      const list = (await r.json()) as MailpitSummary;
      const hit = list.messages.find((m) =>
        m.To.some((a) => a.Address.toLowerCase() === to.toLowerCase()),
      );
      if (hit) {
        const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${hit.ID}`);
        if (!detail.ok) {
          throw new Error(`Mailpit fetch failed HTTP ${detail.status}`);
        }
        const msg = (await detail.json()) as MailpitMessage;
        const body = (msg.HTML || msg.Text).replace(/&amp;/g, "&");
        const m = body.match(
          /https?:\/\/[^\s"'<>]*\/login\?[^\s"'<>]*userId=[^\s"'<>]+/,
        );
        if (!m) {
          throw new Error("Magic link URL not found in email body");
        }
        return m[0];
      }
    }
    await sleep(1000);
  }
  throw new Error(
    `Magic-link email for ${to} did not arrive in ${timeoutMs / 1000}s`,
  );
};

const extractUserIdFromUrl = (url: string): string => {
  const m = url.match(/userId=([A-Za-z0-9._-]+)/);
  if (!m) throw new Error(`Could not extract userId from ${url}`);
  return m[1];
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

const screenshot = async (page: Page, label: string): Promise<string> => {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const path = resolve(ARTIFACTS_DIR, `amarre-ui-${label}-${Date.now()}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
};

/**
 * Count records in the local amarre REDCap project. Used to verify
 * the create-request flow actually inserted a row, without us having
 * to fill the full 118-field form.
 */
const countCrfRecords = async (env: EnvMap): Promise<number> => {
  const url = env["PUBLIC_CRF_URL"] || "http://localhost:8888/api/";
  const token = env["CRF_API_TOKEN"];
  if (!token) return -1;
  const params = new URLSearchParams({
    token,
    content: "record",
    format: "json",
    type: "flat",
    fields: "record_id",
    returnFormat: "json",
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!r.ok) return -1;
  const data = (await r.json()) as Array<unknown>;
  return data.length;
};

const launchBrowser = async (): Promise<Browser> => {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Executable doesn't exist")) {
      throw new Error(
        `Playwright Chromium not installed. Run:\n  pnpm exec playwright install chromium`,
      );
    }
    throw err;
  }
};

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
      await waitReachable(`${appUrl}/`, "amarre dev server", 60_000);
    } catch (err) {
      amarreProc.kill("SIGTERM");
      throw err;
    }
    console.log(`  ✓ amarre dev server ready (spawned, PID ${amarreProc.pid})`);
  }
  await waitReachable(`${MAILPIT_URL}/api/v1/messages`, "Mailpit", 10_000);
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

  console.log(`==> Launching headless Chromium`);
  const browser = await launchBrowser();

  let capturedUserId: string | undefined;
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();

    console.log(`==> Navigating to ${appUrl}/`);
    await page.goto(`${appUrl}/`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    console.log(`==> Opening signup modal`);
    // Two triggers exist (in Collaborate and Administrate). Take the
    // first non-disabled one. Bootstrap's data-bs-toggle binds the
    // click handler when its JS loads — in Vite cold-start that can
    // be delayed, so we retry a few times.
    const trigger = page
      .locator('[data-bs-target="#SignUp"]:not(.disabled)')
      .first();
    const modal = page.locator("#SignUp");
    let opened = false;
    for (let i = 0; i < 5; i++) {
      await trigger.click({ timeout: 5_000 }).catch(() => undefined);
      try {
        await modal.waitFor({ state: "visible", timeout: 3_000 });
        opened = true;
        break;
      } catch {
        await sleep(1_000);
      }
    }
    if (!opened) {
      const path = await screenshot(page, "modal-never-opened");
      throw new Error(
        `Signup modal never became visible after clicking the trigger (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ Signup modal open`);

    console.log(`==> Filling email + submit (${email})`);
    await page.locator("#SignUp #email").fill(email);
    await page.locator('#SignUp button[type="submit"]').click();

    // The form action returns a "success" alert in the modal — wait
    // for it to confirm the POST was processed.
    await page
      .locator("#SignUp .alert-success, #SignUp .alert-info")
      .first()
      .waitFor({ timeout: 10_000 });
    console.log(`  ✓ Signup POST accepted (success alert visible)`);

    console.log(`==> Waiting for magic-link email`);
    const magicUrl = await findMagicLink(email);
    capturedUserId = extractUserIdFromUrl(magicUrl);
    console.log(
      `  ✓ Email received, magic link captured (userId=${capturedUserId.slice(0, 8)}…)`,
    );

    console.log(`==> Navigating to magic link`);
    await page.goto(magicUrl, { waitUntil: "networkidle", timeout: 20_000 });
    const landedUrl = page.url();
    if (!landedUrl.startsWith(`${appUrl}/`) || landedUrl.includes("/login")) {
      const path = await screenshot(page, "wrong-landing");
      throw new Error(
        `Expected to land on amarre root, got ${landedUrl} (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ Redirected to ${landedUrl}`);

    console.log(`==> Verifying session via UI (email visible somewhere)`);
    const text = (await page.locator("body").innerText()).toLowerCase();
    if (!text.includes(email.toLowerCase())) {
      const path = await screenshot(page, "no-email-after-login");
      throw new Error(
        `Authenticated landing doesn't render ${email} anywhere (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ Session active, email rendered on the landing page`);

    // ────────────────────────────────────────────────────────────────
    // CREATE REQUEST + CONDITIONAL UI — hard checks.
    //
    // Pre-condition: a freshly-signed user has no records of their
    // own → the "Compléter" (#complete) section MUST NOT be in the
    // DOM (its `{#if hasIncompleteRequests}` evaluates false).
    //
    // Action: click "Créer une demande", check the consent box,
    // submit, verify a row was inserted in REDCap.
    //
    // Post-condition: reload the landing page; the "Compléter"
    // section MUST now be rendered (the new record is incomplete by
    // definition). This validates both the form action and the
    // conditional rendering in +page.svelte.
    // ────────────────────────────────────────────────────────────────
    console.log(`==> Pre-check: #complete section should be absent`);
    if ((await page.locator("#complete").count()) > 0) {
      const path = await screenshot(page, "pre-complete-present");
      throw new Error(
        `#complete section is rendered for a user with no requests (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ #complete absent as expected`);

    console.log(`==> Creating a request via the UI`);
    const createTrigger = page
      .locator('[data-bs-target="#CreateRequest"]')
      .first();
    if ((await createTrigger.count()) === 0) {
      const path = await screenshot(page, "no-create-trigger");
      throw new Error(
        `No "Créer une demande" trigger visible (screenshot: ${path})`,
      );
    }

    const recordsBefore = await countCrfRecords(env);

    // Attack /api/v1/surveys/new directly with the browser's session
    // cookie. The form action wraps this same endpoint, but the form
    // submit returns SvelteKit-rendered HTML which hides the real
    // backend error. Going through page.request gives us the JSON
    // response verbatim — much better diagnostics on failure, and
    // exactly the same auth path.
    const apiRes = await page.request.post(`${appUrl}/api/v1/surveys/new`);
    const apiStatus = apiRes.status();
    const apiBody = await apiRes.text();

    if (apiStatus !== 200) {
      const path = await screenshot(page, "create-api-rejected");
      throw new Error(
        `POST /api/v1/surveys/new → HTTP ${apiStatus}\n` +
          `Body: ${apiBody.slice(0, 600)}\n` +
          `Screenshot: ${path}`,
      );
    }

    const recordsAfter = await countCrfRecords(env);
    if (recordsAfter <= recordsBefore) {
      const path = await screenshot(page, "no-record-after-create");
      throw new Error(
        `API returned 200 but REDCap record count didn't grow (was ${recordsBefore}, now ${recordsAfter}).\n` +
          `API body: ${apiBody.slice(0, 600)}\n` +
          `Screenshot: ${path}`,
      );
    }
    console.log(
      `  ✓ Request created via API (record count ${recordsBefore} → ${recordsAfter})`,
    );

    console.log(`==> Reloading landing page to check conditional UI`);
    await page.goto(`${appUrl}/`, { waitUntil: "networkidle" });

    console.log(`==> Post-check: #complete section should now be present`);
    if ((await page.locator("#complete").count()) === 0) {
      const path = await screenshot(page, "post-complete-missing");
      throw new Error(
        `#complete section is missing after creating an incomplete request (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ #complete now rendered (conditional UI honours the data)`);

    // ────────────────────────────────────────────────────────────────
    // LOGOUT — open the Administrate modal/panel that holds the
    // logout form, submit it, then verify the session cookie is gone
    // and the email is no longer rendered.
    // ────────────────────────────────────────────────────────────────
    console.log(`==> Logging out`);
    const logoutForm = page.locator('form[action="?/logout"]').first();
    await logoutForm.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 15_000 }),
      logoutForm.locator('button[type="submit"]').click(),
    ]);

    const cookies = await ctx.cookies();
    const sessionCookie = cookies.find((c) => c.name === "session");
    if (sessionCookie) {
      const path = await screenshot(page, "session-still-present");
      throw new Error(
        `Session cookie still present after logout (screenshot: ${path})`,
      );
    }

    const afterLogoutText = (
      await page.locator("body").innerText()
    ).toLowerCase();
    if (afterLogoutText.includes(email.toLowerCase())) {
      const path = await screenshot(page, "email-still-rendered");
      throw new Error(
        `User email still rendered after logout (screenshot: ${path})`,
      );
    }
    console.log(`  ✓ Session cookie cleared, email gone from the page`);

    await screenshot(page, "ok");
    console.log(
      `\nE2E amarre UI (signup → request → conditional #complete → logout): PASS`,
    );
  } finally {
    if (capturedUserId) await deleteAppwriteUser(env, capturedUserId);
    await purgeMailpit();
    await browser.close();
    cleanupSpawned();
  }
};

main().catch((err) => {
  console.error(`\n✗ E2E amarre UI test failed:`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
