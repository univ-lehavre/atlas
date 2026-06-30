---
title: "Spike — outil de mesure a11y externe (Lighthouse / pa11y) — 2026-06-30"
---

> Reconnaissance pré-implémentation ([ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)),
> en réponse à l'issue #298 (milestone _Transverse — Accessibilité_). Rend un
> verdict **GO / NO-GO** sur l'adoption d'un outil de mesure d'accessibilité
> _externe_ en CI, par-dessus l'`axe-core` déjà en place. Méthode : revue de l'état
> de l'art 2025-2026 (moteurs, recouvrement, coût CI) confrontée à l'outillage réel
> du dépôt.

## Objectif

Décider si **Lighthouse-CI** ou **pa11y** apportent une valeur nette par rapport à
la couverture `axe-core` actuelle, ou si l'effort doit aller à la **consolidation
d'axe-core au niveau page** (issue #296). Les trois questions de #298 : recouvrement
avec axe, valeur d'un score suivi, coût CI.

## Constats

**1. Les trois outils reposent sur le même moteur — `axe-core` — qu'Atlas exécute
déjà.**

- Atlas fait tourner `axe-core` via `vitest-axe` au **niveau composant**
  (`ui/atlas-ui/tests/*.a11y.test.ts`, `apps/find-an-expert/`), documenté dans
  [Accessibilité](/atlas/quality/accessibilite/).
- **Lighthouse** utilise `axe-core` mais n'exécute qu'un **sous-ensemble** (~57
  audits) du jeu complet (~96 règles), mêlé à ses audits perf/SEO/best-practices.
- **pa11y** est un _runner_ : moteur `axe-core` (option `--runner axe`) **ou**
  HTML_CodeSniffer (défaut, réputé plus bruyant et en retard sur WCAG 2.2). Avec
  `axe-core`, pa11y hérite exactement du même taux de détection que l'axe déjà
  présent.

**2. La seule valeur ajoutée _structurelle_ d'un outil externe est l'audit de la
page réellement rendue dans un navigateur** (vs le DOM JSDOM des tests composant).
Or cet axe est **déjà le périmètre de l'issue #296** (« audit a11y au niveau page,
parcours clavier, contraste »), qui se réalise avec **`@axe-core/playwright`** —
lequel exécute le **jeu de règles `axe-core` complet** dans un vrai Chromium, et est
recommandé en 2025-2026 comme **gate CI déterministe** (zéro faux positif sur ses
règles).

**3. Le coût d'intégration penche nettement vers axe/Playwright.**

- **Playwright + Chromium sont déjà installés et exécutés en CI**
  (`.github/workflows/e2e.yml` ; `playwright install --with-deps chromium`,
  sandboxes `amarre`/`sillage`). Ajouter `@axe-core/playwright` est un changement
  de **quelques lignes** dans la même session de navigateur — **coût CI marginal**.
- **Lighthouse-CI** demanderait une **brique séparée** (job dédié, serveur de
  rapport / stockage du score, configuration de seuils) pour un **sous-ensemble**
  des règles déjà couvertes — et tout nouveau job lourd doit respecter la CI
  adaptative par chemin ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)).
- Le **score numérique 0-100** de Lighthouse est sa seule vraie spécificité, mais
  c'est un indicateur **peu actionnable** (moyenne pondérée pass/fail) : un gate
  `axe` « zéro violation » est plus net et déjà la doctrine du dépôt.

**4. Limite commune, à ne pas masquer.** Tous ces outils automatiques ne couvrent
que **~30-40 % des critères WCAG** ; le reste relève du test manuel. Ajouter un
second outil automatique **ne déplace pas ce plafond** — il ajoute surtout du
recoupement.

## Hypothèses non confirmables depuis le repo

- Le recouvrement chiffré « axe vs pa11y » (~35 % d'issues communes dans une étude
  tierce) dépend du corpus testé ; non rejouable sur les pages d'Atlas sans le
  prototype que ce spike a précisément jugé inutile d'écrire (cf. Verdict).
- L'évolution du taux de détection d'`axe-core` (annoncé en hausse vers ~57-70 %)
  est une projection amont, pas une mesure locale.

## Décisions tranchées

- **Écarter pa11y** : avec `axe-core` il est redondant ; avec HTML_CodeSniffer il
  est plus bruyant et en retard sur WCAG 2.2. Aucune valeur nette.
- **Écarter Lighthouse-CI comme _gate_ a11y** : sous-ensemble d'`axe`, score peu
  actionnable, brique CI séparée à maintenir. (Un éventuel usage **perf**/Web Vitals
  de Lighthouse est un autre sujet, hors de ce spike.)
- **Rediriger l'effort vers `@axe-core/playwright` dans l'issue #296** : c'est le
  bon véhicule pour l'audit page-rendue (jeu de règles complet, vrai navigateur,
  coût CI marginal car Playwright est déjà là).

## Verdict

**NO-GO** sur l'adoption d'un outil a11y externe (pas d'ADR ni d'issue
d'implémentation créés — la voie retenue passe par une issue **déjà ouverte**,
#296). La couverture page-rendue manquante (notée dans
[Accessibilité](/atlas/quality/accessibilite/)) se traite en consolidant `axe-core`
via `@axe-core/playwright`, pas en empilant un second scanner. #298 se ferme sur
cette note ; #296 reçoit le pointeur de mise en œuvre.
