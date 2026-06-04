/**
 * Configuration partagée des tests d'accessibilité (axe-core via vitest-axe).
 *
 * Épingle le **niveau WCAG cible** des tests `*.a11y.test.ts` du dépôt, au lieu
 * de laisser axe-core sur son jeu de règles par défaut. Cible le **niveau AA du
 * WCAG 2.x** (2.0 A/AA, 2.1 A/AA, 2.2 AA) — le niveau attendu par le RGAA et la
 * norme européenne EN 301 549 (cf. ADR 0038). Figer ce contrat rend l'intention
 * explicite et stable face aux évolutions d'axe-core.
 *
 * Véhicule de partage : ce module vit dans `@univ-lehavre/atlas-shared-config`,
 * dont dépendent déjà `ui/atlas-ui` et `apps/find-an-expert` — pas besoin d'un
 * nouveau paquet. Les deux codebases importent la MÊME cible WCAG.
 *
 * @module a11y
 */

/**
 * Balises (_tags_) axe-core correspondant au niveau WCAG 2.x AA.
 *
 * Type `string[]` (non `readonly`) volontairement : axe-core attend un
 * `string[]` mutable dans `RunOptions.runOnly.values`. On n'applique donc pas
 * `Object.freeze` ici (qui produirait un `readonly string[]` incompatible).
 *
 * @type {string[]}
 */
export const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

/**
 * Options à passer à `axe(container, options)` pour ne lancer QUE les règles
 * du niveau WCAG 2.x AA.
 *
 * @example
 *   import { wcagAxeOptions } from "@univ-lehavre/atlas-shared-config/a11y";
 *   expect(await axe(container, wcagAxeOptions)).toHaveNoViolations();
 *
 * @type {{ runOnly: { type: "tag", values: string[] } }}
 */
export const wcagAxeOptions = {
  runOnly: { type: "tag", values: WCAG_AA_TAGS },
};
