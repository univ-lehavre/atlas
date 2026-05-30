// Level-5 smoke : drive the full sillage stack end-to-end in a real
// browser via @playwright/test.
//
// Scenario (phase 5 scope — pre-REDCap wiring) :
//   1. Open the home in an anonymous state. Verify the trombinoscope
//      and the central "Meet the community" tile are visible.
//   2. Click the tile. The <dialog> signup modal opens.
//   3. Fill a fake email + submit. The modal closes on success.
//   4. Poll Mailpit for the magic-link email. Visit the URL.
//   5. Now authenticated — verify the welcome heading, the 3-card
//      Quarto projects carousel and the questionnaires invite.
//   6. Click the logout button. Verify we're back to the anonymous
//      trombinoscope.
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
const TEST_PREFIX = "sillage-e2e-";
const testEmail = (): string => `${TEST_PREFIX}${Date.now()}@example.org`;

// Phase 4.8 — Retries configurés au cas où la stack docker (Appwrite +
// MongoDB + Mailpit) répond lentement sur le premier essai.
test.describe.configure({ retries: 1 });

test.describe("sillage smoke — full stack", () => {
  test.skip(
    !stackReady,
    "Mailpit or Appwrite not reachable — start the stack via `pnpm -F @univ-lehavre/atlas-sillage-sandbox start` to exercise.",
  );

  let capturedUserId: string | null = null;

  test.beforeEach(async ({ context }) => {
    await purgeMailpit();
    await context.clearCookies();
    capturedUserId = null;
  });

  test.afterEach(async ({ context }) => {
    if (capturedUserId) await deleteAppwriteUser(capturedUserId);
    await purgeMailpit();
    await context.clearCookies();
  });

  test("signup → magic-link → authenticated → logout", async ({ page }) => {
    const email = testEmail();

    // ---- 1. Anonymous home ----
    await page.goto("/");
    const discoverTile = page.locator('button:has-text("Meet the community")');
    await expect(discoverTile).toBeVisible();
    // The dialog exists in the DOM but is closed (not visible).
    const dialog = page.locator("dialog");
    await expect(dialog).toBeAttached();

    // ---- 2. Open signup modal ----
    // Wait for SvelteKit hydration to finish wiring DOM listeners.
    // `__sveltekit_*` globals appear early ; a final networkidle pass
    // ensures the start.js bundle has executed all attach effects
    // before we click the button.
    await page.waitForFunction(
      () => Object.keys(window).some((k) => k.startsWith("__sveltekit_")),
      null,
      { timeout: 10_000 },
    );
    await page.waitForLoadState("networkidle");
    await discoverTile.click();
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // ---- 3. Submit signup ----
    await dialog.locator('input[type="email"]').fill(email);
    await dialog.locator('button[type="submit"]').click();
    // Modal closes on success.
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // ---- 4. Magic-link round-trip ----
    const magicUrl = await waitForMagicLink(email);
    capturedUserId = extractUserId(magicUrl);
    await page.goto(magicUrl);

    // ---- 5. Authenticated state ----
    await expect(page.locator("h1")).toContainText("Welcome", {
      timeout: 10_000,
    });
    // Carousel : exactly 3 project cards rendered (one active, two
    // hidden behind Bootstrap's `carousel-item` rotation).
    const projectCards = page.locator(
      'section[aria-label$="in focus"] article',
    );
    await expect(projectCards).toHaveCount(3);
    // Questionnaires invite : the priority instruments section is
    // present with at least one active CTA.
    await expect(
      page.locator('section[aria-label="Your contribution"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        'section[aria-label="Your contribution"] a:has-text("Fill in")',
      ),
    ).toHaveCount(1);

    // ---- 6. Logout ----
    await page.locator('button:has-text("Log out")').click();
    await page.waitForLoadState("networkidle");
    // Back to anonymous — the trombinoscope tile is visible again.
    await expect(
      page.locator('button:has-text("Meet the community")'),
    ).toBeVisible();
  });
});
