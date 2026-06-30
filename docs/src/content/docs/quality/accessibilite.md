---
title: Accessibilité
---

Cette page décrit les pratiques d'**accessibilité** (souvent abrégée _a11y_ :
le « a », 11 lettres, puis le « y ») **réellement appliquées** dans le dépôt.
L'accessibilité, c'est rendre les interfaces utilisables par tous, y compris les
personnes qui naviguent au clavier, avec un lecteur d'écran, ou avec des
contrastes adaptés. Conformément à la
[documentation vérifiable](/atlas/quality/documentation/), seules les pratiques
**en place et vérifiables** figurent ici ; les chantiers connus sont listés en
fin de page, sans être présentés comme acquis.

## Norme de référence

La référence est le **WCAG** (_Web Content Accessibility Guidelines_), le standard
international du W3C pour l'accessibilité du web. C'est lui qu'invoquent les cadres
réglementaires : la norme européenne **EN 301 549** et, en France, le **RGAA**
(Référentiel général d'amélioration de l'accessibilité) — tous deux **adossés au
WCAG**.

Le moteur de test du dépôt, **axe-core**, implémente des règles directement
**mappées sur ces référentiels** (WCAG, EN 301 549, RGAA). Le dépôt **épingle**
explicitement le **niveau AA du WCAG 2.x** — le niveau attendu par le RGAA et
l'EN 301 549 ([ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/)).

> **Ce que cela ne dit pas.** Passer les tests axe **n'équivaut pas** à une
> conformité RGAA ou EN 301 549 formelle : un audit complet couvre aussi des
> critères non automatisables (parcours clavier réel, pertinence des alternatives,
> compréhension). Le dépôt **outille** la conformité, il ne la **prononce** pas — la
> déclaration d'accessibilité d'une instance déployée relève de son exploitant.

## Vérifié automatiquement

L'accessibilité n'est pas laissée à l'appréciation : elle est **contrôlée par la
chaîne de qualité**, comme le reste.

| Pratique                        | Comment c'est appliqué                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Règles a11y au lint**         | Le preset Svelte strict active les règles d'accessibilité de Svelte (`a11y-*`) via `eslint-plugin-svelte` (`flat/recommended`) — `config/shared-config/eslint/svelte.js`, [ADR 0020](/atlas/decisions/0020-svelte-eslint-strict/).                                                                                                                                                                                              |
| **Type explicite des boutons**  | `svelte/button-has-type` en `error` : tout `<button>` déclare son `type`, ce qui évite les soumissions de formulaire implicites et clarifie le rôle de l'élément.                                                                                                                                                                                                                                                               |
| **Tests d'accessibilité (axe)** | Des tests dédiés `*.a11y.test.ts` exécutent **axe-core** (via `vitest-axe`) sur les composants rendus et échouent en cas de violation — `ui/atlas-ui/tests/`, `apps/find-an-expert/`.                                                                                                                                                                                                                                           |
| **Niveau WCAG épinglé**         | Les tests ciblent explicitement le **WCAG 2.x niveau AA** (config `runOnly` partagée `@univ-lehavre/atlas-shared-config/a11y`, importée par les deux codebases) — [ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/).                                                                                                                                                                                           |
| **Projet de test isolé**        | Les tests a11y tournent dans un projet vitest séparé (`a11y`), pour les lancer et les suivre indépendamment des tests unitaires — `apps/find-an-expert/vite.config.ts`.                                                                                                                                                                                                                                                         |
| **Audit a11y page rendue**      | Le Storybook test-runner pilote un **vrai Chromium** sur chaque story et exécute **axe-core** (même cible WCAG 2.x AA) ; sur les **pages assemblées** (`Pages/…`) il ajoute un **parcours clavier** (focus atteignable et visible). Ce que JSDOM ne voit pas : contraste effectif, focus, page complète — `ui/atlas-ui/.storybook/test-runner.ts`, job CI `a11y` ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)). |

## Appliqué dans les composants

Le design system partagé (`ui/atlas-ui`) et les applications portent les
attributs d'accessibilité directement dans le balisage.

- **Attributs ARIA** (`aria-*`) et **rôles** (`role=`) sur les composants
  interactifs (barre de navigation, carrousel, modales, formulaires) pour
  exposer leur état et leur fonction aux technologies d'assistance.
- **Textes alternatifs** (`alt=`) sur les images porteuses de sens.
- **Modales inertes à l'état fermé** : les modales Bootstrap (`Signup`,
  `CreateRequest`) portent l'attribut `inert` tant qu'elles sont fermées
  (action `modalInert`, qui le retire à l'ouverture via les événements
  Bootstrap). `inert` retire les éléments focusables de la navigation **et** de
  l'arbre d'accessibilité, sans l'incohérence d'`aria-hidden` sur du focusable.
- Les composants partagés sont testés une fois pour toutes ; leurs
  consommateurs (apps, Storybook) en héritent.

## Ce qui n'est pas encore couvert

Par souci d'honnêteté, ces points sont **connus et tracés**, pas résolus :

- **Couverture par composant encore partielle.** L'audit page-rendue et les
  tests par composant existent, mais tous les composants ne sont pas encore
  couverts un par un (suivi : couverture `atlas-ui` et `find-an-expert`).
- **Pas d'outil de mesure externe** (Lighthouse, pa11y) — **choix assumé** : ces
  outils reposent sur le même moteur `axe-core` que le dépôt exécute déjà (un
  spike l'a tranché, [note 2026-06-30](/atlas/audit/2026-06-30-spike-outil-a11y-externe/)).
  La couverture page-rendue passe par `@axe-core`/le test-runner, pas par un
  second scanner.
- **Tests manuels.** L'automatique ne couvre qu'une part des critères WCAG ;
  l'audit humain (lecteurs d'écran, navigation réelle) reste nécessaire.

Ces éléments rejoindront cette page au fur et à mesure de leur mise en œuvre.
Leur avancement est suivi dans le milestone
[**Transverse — Accessibilité**](https://github.com/univ-lehavre/atlas/milestone/1) :
chaque chantier comblé y est clos et bascule de cette section vers
« Vérifié automatiquement ».
