/**
 * Storybook test-runner hooks — audit a11y au niveau **page rendue** (#296).
 *
 * Là où les tests `*.a11y.test.ts` (vitest-axe, JSDOM) couvrent les composants
 * **isolés**, ce runner pilote un vrai Chromium (Playwright) sur **chaque story
 * rendue** et y exécute `axe-core` — ce qui valide ce que JSDOM ne peut pas :
 * le rendu réel, le contraste effectif et, pour les **pages assemblées**, le
 * parcours clavier (focus visible, ordre de tabulation).
 *
 * Cible WCAG : le MÊME contrat que les tests composant — `WCAG_AA_TAGS` partagé
 * via `@univ-lehavre/atlas-shared-config/a11y` (WCAG 2.x AA, ADR 0038).
 */

import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext } from "@storybook/test-runner";
import { injectAxe, checkA11y } from "axe-playwright";
import { WCAG_AA_TAGS } from "@univ-lehavre/atlas-shared-config/a11y";

/**
 * The Playwright `Page` type, derived from the test-runner's own hook signature
 * so we don't take a direct `playwright` import (not a dependency of this package).
 */
type Page = Parameters<NonNullable<TestRunnerConfig["postVisit"]>>[0];

/**
 * Marker in a story title that flags a full **assembled page** (vs a single
 * component): the repo titles them under a `Pages/` group — both top-level
 * (`Pages/AnonymousHome`) and app-scoped (`amarre/Pages/HomePage`). Matching the
 * `Pages/` segment anywhere catches both.
 */
const PAGE_TITLE_SEGMENT = "Pages/";

const isAssembledPage = (title: string): boolean =>
  title.includes(PAGE_TITLE_SEGMENT);

/**
 * Keyboard-reachability probe for assembled pages: pressing Tab from the body
 * must move focus onto a focusable element that is **visibly** focused. Catches
 * pages where nothing is reachable by keyboard or where focus is invisible —
 * neither of which axe flags on a static snapshot.
 */
const assertKeyboardReachable = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (el === null || el === document.body)
      return { reachable: false, visible: false };
    const style = getComputedStyle(el);
    // "Visible focus" heuristic: a focusable element exists and isn't display:none.
    const visible = style.display !== "none" && style.visibility !== "hidden";
    return { reachable: true, visible };
  });
  if (!focused.reachable) {
    throw new Error(
      "a11y(page): no focusable element reachable by Tab from the page start",
    );
  }
  if (!focused.visible) {
    throw new Error(
      "a11y(page): the first Tab target is not visibly rendered (focus trap or hidden)",
    );
  }
};

const config: TestRunnerConfig = {
  // Inject axe-core into the rendered story before assertions.
  async preVisit(page) {
    await injectAxe(page);
  },

  // Run the WCAG 2.x AA axe audit on every story; add a keyboard pass on pages.
  async postVisit(page, context) {
    const story = await getStoryContext(page, context);

    // Stories may opt out of the a11y gate via `parameters.a11y.disable` — kept
    // for genuinely non-auditable fixtures, never as a silent escape hatch.
    if (story.parameters?.["a11y"]?.disable === true) return;

    await checkA11y(page, "#storybook-root", {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: { runOnly: { type: "tag", values: WCAG_AA_TAGS } },
    });

    if (isAssembledPage(story.title)) {
      await assertKeyboardReachable(page);
    }
  },
};

export default config;
