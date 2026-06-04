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
**mappées sur ces référentiels** (WCAG, EN 301 549, RGAA) et cible par défaut le
**niveau AA du WCAG 2.x** — le niveau attendu par le RGAA et l'EN 301 549.

> **Ce que cela ne dit pas.** Passer les tests axe **n'équivaut pas** à une
> conformité RGAA ou EN 301 549 formelle : un audit complet couvre aussi des
> critères non automatisables (parcours clavier réel, pertinence des alternatives,
> compréhension). Le dépôt **outille** la conformité, il ne la **prononce** pas — la
> déclaration d'accessibilité d'une instance déployée relève de son exploitant.

## Vérifié automatiquement

L'accessibilité n'est pas laissée à l'appréciation : elle est **contrôlée par la
chaîne de qualité**, comme le reste.

| Pratique                        | Comment c'est appliqué                                                                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Règles a11y au lint**         | Le preset Svelte strict active les règles d'accessibilité de Svelte (`a11y-*`) via `eslint-plugin-svelte` (`flat/recommended`) — `config/shared-config/eslint/svelte.js`, [ADR 0020](/atlas/decisions/0020-svelte-eslint-strict/). |
| **Type explicite des boutons**  | `svelte/button-has-type` en `error` : tout `<button>` déclare son `type`, ce qui évite les soumissions de formulaire implicites et clarifie le rôle de l'élément.                                                                  |
| **Tests d'accessibilité (axe)** | Des tests dédiés `*.a11y.test.ts` exécutent **axe-core** (via `vitest-axe`) sur les composants rendus et échouent en cas de violation — `ui/atlas-ui/tests/`, `apps/find-an-expert/`.                                              |
| **Projet de test isolé**        | Les tests a11y tournent dans un projet vitest séparé (`a11y`), pour les lancer et les suivre indépendamment des tests unitaires — `ui/atlas-ui/vitest.config.ts`.                                                                  |

## Appliqué dans les composants

Le design system partagé (`ui/atlas-ui`) et les applications portent les
attributs d'accessibilité directement dans le balisage.

- **Attributs ARIA** (`aria-*`) et **rôles** (`role=`) sur les composants
  interactifs (barre de navigation, carrousel, modales, formulaires) pour
  exposer leur état et leur fonction aux technologies d'assistance.
- **Textes alternatifs** (`alt=`) sur les images porteuses de sens.
- Les composants partagés sont testés une fois pour toutes ; leurs
  consommateurs (apps, Storybook) en héritent.

## Ce qui n'est pas encore couvert

Par souci d'honnêteté, ces points sont **connus et tracés**, pas résolus :

- **Marquage des modales Bootstrap.** L'état _fermé_ des modales Bootstrap 5
  porte `aria-hidden="true"` tout en contenant des éléments focusables, ce
  qu'axe signale (`aria-hidden-focus`). À l'ouverture, le JavaScript de Bootstrap
  corrige le marquage (`role="dialog"`, `aria-modal="true"`), si bien que la
  violation n'atteint pas l'utilisateur réel. La règle est donc désactivée
  **uniquement pour l'état fermé**, toutes les autres restant actives ; la
  refonte du marquage est tracée dans le code (`TODO(... ) a11y:`).
- **Niveau WCAG non épinglé dans les tests.** Les tests utilisent le jeu de règles
  **par défaut** d'axe-core (WCAG 2.x AA), sans restreindre explicitement aux balises
  `wcag2aa` / `wcag22aa`. Figer le niveau cible rendrait l'intention contractuelle et
  stable face aux évolutions d'axe-core.
- **Audit des pages assemblées.** Les tests axe couvrent les **composants** ;
  un audit au niveau **page rendue** (parcours clavier complet, contraste global)
  n'est pas encore systématisé.
- **Aucun outil de mesure externe** (Lighthouse, pa11y) n'est branché en CI : la
  couverture repose aujourd'hui sur axe-core au niveau composant.

Ces éléments rejoindront cette page au fur et à mesure de leur mise en œuvre.
