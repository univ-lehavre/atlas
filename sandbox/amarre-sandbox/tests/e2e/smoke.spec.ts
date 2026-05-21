// Level-5 smoke : drive the full amarre stack end-to-end in a real
// browser via @playwright/test.
//
// Scenario :
//   1. Open the home in an anonymous state. Verify the "S'authentifier"
//      tile is the only active CTA.
//   2. Trigger signup via the modal. Submit a fake email.
//   3. Poll Mailpit for the magic-link email. Visit the URL.
//   4. Now authenticated — verify the "Créer une nouvelle" tile is
//      active.
//   5. Open the CreateRequest modal, tick consent, submit. amarre
//      hits REDCap (or its no-op fallback) and a new record is
//      created.
//   6. Reload the page. Verify the "Compléter" section now renders.
//   7. Click logout. Verify we're back to anonymous state.
//
// The suite self-skips when Mailpit + Appwrite aren't reachable so
// `pnpm test:smoke` is safe to run without the docker stack — it just
// reports "skipped".

import { expect, test } from "@playwright/test";
import { deleteAppwriteUser } from "./fixtures/appwrite";
import {
  extractUserId,
  purgeMailpit,
  waitForMagicLink,
} from "./fixtures/mailpit";
import { isStackReachable } from "./fixtures/preflight";

const stackReady = await isStackReachable();
const TEST_PREFIX = "amarre-e2e-";
const testEmail = (): string => `${TEST_PREFIX}${Date.now()}@example.org`;

test.describe("amarre smoke — full stack", () => {
  test.skip(
    !stackReady,
    "Mailpit or Appwrite not reachable — start the stack via `pnpm -F @univ-lehavre/atlas-amarre-sandbox start` to exercise.",
  );

  let capturedUserId: string | null = null;

  test.beforeEach(async () => {
    await purgeMailpit();
    capturedUserId = null;
  });

  test.afterEach(async () => {
    if (capturedUserId) await deleteAppwriteUser(capturedUserId);
    await purgeMailpit();
  });

  test("signup → magic-link → create request → logout", async ({ page }) => {
    const email = testEmail();

    // ---- 1. Anonymous home ----
    await page.goto("/");
    const signupCta = page
      .locator('[data-bs-target="#SignUp"]:not(.disabled)')
      .first();
    await expect(signupCta).toBeVisible();

    // Bootstrap JS is dynamic-imported in +layout.svelte's onMount, so
    // its `data-bs-toggle` delegation isn't attached at navigation
    // time. Wait for `window.bootstrap` before the first modal click
    // or the click silently no-ops.
    await page.waitForFunction(
      () => Boolean((window as unknown as { bootstrap?: unknown }).bootstrap),
      null,
      { timeout: 10_000 },
    );

    // ---- 2. Signup ----
    await signupCta.click();
    const signupModal = page.locator("#SignUp");
    await expect(signupModal).toBeVisible();
    await signupModal.locator("#email").fill(email);
    await signupModal.locator('button[type="submit"]').click();
    // Either the success alert or the info alert renders.
    await expect(
      signupModal.locator(".alert-success, .alert-info").first(),
    ).toBeVisible({ timeout: 15_000 });

    // ---- 3. Magic-link round-trip ----
    const magicUrl = await waitForMagicLink(email);
    capturedUserId = extractUserId(magicUrl);
    await page.goto(magicUrl);
    // After login the home should display the user's email somewhere.
    await expect(page.locator("body")).toContainText(email, {
      timeout: 10_000,
    });

    // ---- 4. Pre-create state ----
    // The Compléter section is wrapped in `{#if hasIncompleteRequests}`
    // — at this point we don't have any request yet.
    expect(await page.locator("#complete").count()).toBe(0);

    // ---- 5. Create request via API (the UI modal posts a form action
    // that redirects to a 118-field REDCap survey — we shortcut by
    // hitting the JSON endpoint directly). The UX coverage of the
    // CreateRequest modal itself lives in level-1 (`forms.test.ts`).
    const createResponse = await page.request.post("/api/v1/surveys/new", {
      data: {},
    });
    if (!createResponse.ok()) {
      // Surface what REDCap (or the amarre handler) actually returned —
      // the bare `expect(ok).toBe(true)` makes debugging schema drifts
      // way harder than necessary.
      const body = await createResponse.text().catch(() => "<unreadable>");
      throw new Error(
        `POST /api/v1/surveys/new failed : HTTP ${createResponse.status()}\n${body}`,
      );
    }

    // ---- 6. Reload, verify Compléter renders ----
    await page.reload();
    await expect(page.locator("#complete")).toBeVisible();

    // ---- 7. Logout ----
    const logoutForm = page.locator('form[action="?/logout"]');
    await logoutForm.scrollIntoViewIfNeeded();
    await logoutForm.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    // Back to anonymous : the signup CTA is active again.
    await expect(
      page.locator('[data-bs-target="#SignUp"]:not(.disabled)').first(),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(email);
  });
});
