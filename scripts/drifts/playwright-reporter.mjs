/**
 * @fileoverview Reporter Playwright qui capture un brouillon de drift sur échec
 * (ADR 0080, volet a).
 *
 * Un _reporter_ Playwright est un greffon que le pilote de navigateur appelle au
 * fil d'un test (ici `onTestEnd`) pour en rapporter l'issue. Ce reporter ne fait
 * **rien** sur succès ou _skip_ ; sur **échec** (`failed`/`timedOut`), il dépose
 * un brouillon (cf. `draft.mjs`) avec le message d'erreur capturé à chaud. Il ne
 * change ni le verdict du run, ni sa sortie : c'est un observateur.
 *
 * Branchement (dans un `playwright.config.ts`) :
 *
 *   reporter: [
 *     [process.env.CI ? "list" : "html"],
 *     ["../../scripts/drifts/playwright-reporter.mjs", { label: "amarre-smoke" }],
 *   ]
 *
 * @module
 */

import { writeDraft } from "./draft.mjs";

/**
 * @typedef {object} ReporterOptions
 * @property {string} [label] suffixe de source (`playwright:<label>`), pour
 *   distinguer amarre de sillage dans le nom du brouillon.
 */

// Implémente l'interface `Reporter` de Playwright par duck-typing : Playwright
// instancie cette classe et appelle `onTestEnd`. On ne référence pas le type
// `@playwright/test/reporter` en JSDoc — il n'est pas une dépendance de ce
// workspace (il vit dans les sandboxes) et l'annotation n'apporte ici aucune
// vérification réelle.
class DriftDraftReporter {
  /** @param {ReporterOptions} [options] */
  constructor(options = {}) {
    /** @type {string} */
    this.source = `playwright:${options.label ?? "e2e"}`;
  }

  /**
   * Appelé par Playwright à la fin de chaque test. On ne capture que les vrais
   * échecs (pas les `skipped`, état assumé du _self-skip_, ni les `passed`).
   * @param {{ title: string, titlePath: () => string[] }} test cas de test Playwright.
   * @param {{ status: string, workerIndex?: number, error?: { message?: string, stack?: string } }} result résultat du test.
   */
  onTestEnd(test, result) {
    if (result.status !== "failed" && result.status !== "timedOut") return;

    const error = result.error;
    const message =
      [error?.message, error?.stack].filter(Boolean).join("\n\n") ||
      `Test « ${test.title} » : statut ${result.status} sans message d'erreur.`;

    // Un worker par fichier : le pid distingue deux échecs simultanés.
    writeDraft({
      source: this.source,
      symptome: message,
      campagne: test.titlePath().filter(Boolean).join(" › "),
      discriminator: String(result.workerIndex ?? process.pid),
    });
  }
}

export default DriftDraftReporter;
