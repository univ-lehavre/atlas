---
title: Plan de résorption — audit 2026-05-29
---

> Date du plan : 2026-05-30. Audit de référence : [docs/audit/2026-05-29.md](../audit/2026-05-29). TODO de référence : `TODO.md` (supprimé en Phase 16 ; son contenu actif a été migré vers les ADR et des issues GitHub, son archive est dans l'historique Git).

## Introduction

### Périmètre

- 51 findings retenus de l'audit 2026-05-29 (8 High / 27 Medium / 14 Low / 2 Info).
- Items actifs de TODO.md (sections « En cours / à faire » et « À arbitrer »).
- Les items « Reporté sine die » sont cadrés par [ADR 0001](../decisions/0001-devsecops-perimetre-repo-sine-die) et resteront sine die. Le plan les sort juste de TODO.md (ils restent dans l'ADR).
- Les items « Archive » de TODO.md sont préservés (migrés vers `CHANGELOG.md` ou `docs/audit/`) puis le fichier est supprimé.

### Principes directeurs

- **Non-régression** : à chaque étape, `pnpm ci:checks && pnpm ci:audit && pnpm docs:build` doit rester vert.
- **Filet d'abord** : réparer la mesure de couverture AVANT d'ajouter des tests, ajouter des tests AVANT de refactorer.
- **Agentique-ready** : chaque étape est exécutable par un agent Claude sans question à l'utilisateur.
- **Idempotence** : relancer une étape déjà faite doit être un no-op observable (vérifier l'état cible avant d'écrire).
- **Une PR par phase** (sauf découpage explicitement prévu pour phases volumineuses).

### Conventions agent (à respecter à chaque étape)

- **Pas de questions à l'utilisateur** (mode unattended). En cas d'ambiguïté irréductible : stop avec rapport de blocage (ouvrir une issue GitHub `blocker:` avec contexte complet), sans deviner.
- **Commits** : Conventional Commits, scope ∈ allowed-scopes de `commitlint.config.js` (vérifier la liste avant chaque commit avec `grep -A 200 'scope-enum' commitlint.config.js`). **Pas de `Co-Authored-By`**.
- **Hooks lefthook JAMAIS bypassés** : pas de `--no-verify`, `--no-gpg-sign`, `LEFTHOOK=0`, etc. Si un hook bloque, fixer le problème en racine.
- **Une PR par phase**. Titre court (< 70 car.), body avec test plan checklist.
- **Validation systématique** : chaque étape se clôt par les commandes de validation listées, qui doivent toutes passer.
- **Idempotence pratique** : avant écriture, vérifier que l'état cible n'est pas déjà atteint (lecture du fichier, `grep`, etc.). Si déjà atteint : no-op + log.

### Vue d'ensemble des phases

| Phase | Titre                                               | Findings principaux           | Effort |
| ----- | --------------------------------------------------- | ----------------------------- | ------ |
| 1     | Réparer le filet de coverage                        | 13, 14, 15, 22, 34            | S      |
| 2     | Renforcer la mesure (seuils réels, includes)        | 16, 17, 18, 19, 24, 23        | M      |
| 3     | Combler les paquets sans tests                      | 20, 21, 31, 32                | L      |
| 4     | E2E en CI + couverture endpoints                    | 25, 26, 29, 30, 52, 35        | L      |
| 5     | Qualité statique : ESLint strict, format, sandboxes | 36, 37, 38, 39, 40            | M      |
| 6     | Structure : ADR alignés et règles d'audit           | 1, 2, 3, 8, 9, 10, 11, 12, 46 | M      |
| 7     | Réorganisation des paquets mal catégorisés          | 4, 5, 6, 7                    | L      |
| 8     | Robustesse tests : MSW, fast-check, helpers         | 27, 28, 33                    | M      |
| 9     | Backend handler standardisation + CSP               | 51, 53                        | M      |
| 10    | UI partagée : theming, tests, parité visuelle       | 50, 57                        | L      |
| 11    | Build, CI, reproductibilité                         | 41, 45, 47, 48, 49            | M      |
| 12    | Documentation site et racine                        | 42, 43, 44                    | S      |
| 13    | Observabilité et performance                        | 54, 55, 56                    | L      |
| 14    | TODO actionnable « Hors DevSecOps »                 | items TODO non couverts       | M      |
| 15    | Publication des 7 CLIs                              | item TODO publication         | M      |
| 16    | Suppression de TODO.md                              | fermeture                     | S      |

---

## Phase 1 — Réparer le filet de coverage

**Objectif.** Faire en sorte que la CI dise la vérité sur la couverture : seuils non nuls, rapport agrégé branché, fichiers à 0% comptés, configs mortes supprimées.
**Dépendances.** Aucune.
**Findings couverts.** 13, 14, 15, 22, 34.
**TODO items couverts.** Aucun (préparatoire).
**Parallélisable ?** Oui — étapes 1.1, 1.2, 1.4, 1.5 indépendantes ; 1.3 dépend de 1.1.
**Critère de sortie de phase.** `pnpm test:coverage && pnpm coverage:report 80` retourne un code de sortie correct (échec si paquet sous seuil, succès sinon) ; CI exécute `coverage:report` ; `find . -path ./node_modules -prune -o -name vitest.config.ts -print | xargs grep -l 'statements: 0'` ne retourne plus que les paquets explicitement listés dans ADR 0019.

### Étape 1.1 — Documenter les exemptions de seuil dans ADR 0019

- **Goal:** Lister explicitement dans ADR 0019 les paquets autorisés à avoir des seuils < 50% et la raison.
- **Files (read):** `docs/decisions/0019-derogations-workspace-audit.md` (ou équivalent ; sinon le plus proche), `vitest.config.ts` des 10 paquets concernés (cf. finding 13).
- **Files (write):** `docs/decisions/0019-derogations-workspace-audit.md`.
- **Invariants à préserver:** ADR existants non amendés ailleurs.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Section « Seuils de couverture < 50% » présente dans ADR 0019 listant chaque paquet exempté avec la raison. Si aucun paquet n'est exempté à terme : section explicite « aucune exemption ».
- **Findings résolus:** Préparatoire pour 13, 16, 23.
- **PR title suggéré:** `docs(adr): document coverage threshold exemptions in ADR 0019`

### Étape 1.2 — Brancher `coverage:report` en CI et en pre-push

- **Goal:** Le script `coverage:report` qui sort 1 si un paquet est sous le seuil doit être exécuté par CI et lefthook.
- **Files (read):** `.github/workflows/ci.yml`, `lefthook.yml`, `package.json`, `scripts/audit/coverage-report.mjs`.
- **Files (write):** `.github/workflows/ci.yml`, `lefthook.yml`, `package.json`.
- **Invariants à préserver:** Jobs existants (lint, typecheck, build, docs, audit) inchangés ; `pnpm test:coverage` continue de tourner avant.
- **Validation:**
  - `pnpm test:coverage`
  - `pnpm coverage:report 80` (exit non zero attendu tant que les autres étapes ne sont pas faites — c'est normal, c'est la preuve que le filet marche).
  - `act -j test` ou push sur branche test pour valider le workflow.
- **Done criteria:**
  1. Job `test` de `ci.yml` se termine par `pnpm coverage:report 80` après `pnpm test:coverage`.
  2. Hook `pre-push` de `lefthook.yml` contient une commande `coverage:report` qui s'exécute après `test`.
  3. Script `package.json` `coverage:report` confirmé : `node scripts/audit/coverage-report.mjs`.
  4. **IMPORTANT** : initialement la cible passée est `0` (`pnpm coverage:report 0`) le temps des Phases 1 à 3, puis remontée à `80` à la fin de Phase 3.
- **Findings résolus:** 14.
- **PR title suggéré:** `ci: enforce coverage:report in CI and pre-push`

### Étape 1.3 — Compter les fichiers « skipped » et borner leur nombre

- **Goal:** Le rapport de couverture ne doit plus masquer 84 fichiers non testés. Ajouter une option `--strict` ou un seuil maximum de fichiers skipped par paquet.
- **Files (read):** `scripts/audit/coverage-report.mjs`.
- **Files (write):** `scripts/audit/coverage-report.mjs`, `package.json` (ajout `coverage:report:strict`).
- **Invariants à préserver:** Comportement par défaut (mode non strict) inchangé pour ne pas casser Phase 1.2 ; nouvelle option opt-in.
- **Validation:**
  - `pnpm coverage:report 0` (mode existant, doit toujours marcher).
  - `pnpm coverage:report:strict` (nouveau, sort la liste des fichiers skipped par paquet avec taille).
  - `node scripts/audit/coverage-report.mjs --max-skipped=20 0` doit échouer (84 fichiers totaux constatés à date).
- **Done criteria:**
  1. Option `--max-skipped=N` ajoutée, qui échoue si un paquet a plus de N fichiers skipped.
  2. Sortie de `--strict` inclut taille (en lignes) de chaque fichier skipped.
  3. Test unitaire `scripts/audit/coverage-report.test.mjs` (nouveau) vérifiant le comportement.
- **Findings résolus:** 15.
- **PR title suggéré:** `chore(audit): account for zero-coverage files in coverage report`

### Étape 1.4 — Étendre l'include de `packages/atlas-stats`

- **Goal:** Mesurer tout `src/**` au lieu de `src/compute.ts` seul.
- **Files (read):** `packages/atlas-stats/vitest.config.ts`, `packages/atlas-stats/src/`.
- **Files (write):** `packages/atlas-stats/vitest.config.ts`.
- **Invariants à préserver:** Les seuils restent à 90 (ils étaient « trompeurs » mais valides pour `compute.ts`).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-stats` ; lire la sortie coverage pour confirmer plusieurs fichiers mesurés.
- **Done criteria:** `include: ['src/**/*.ts']` dans vitest.config. Si seuils 90 deviennent inatteignables, abaisser à la valeur réelle minorée de 5 points et noter dans ADR 0019 (sera resserré en Phase 2).
- **Findings résolus:** 22 (partiel ; serrage final en Phase 2).
- **PR title suggéré:** `test(atlas-stats): expand coverage include to src`

### Étape 1.5 — Supprimer la config vitest morte `config/shared-config`

- **Goal:** `config/shared-config/vitest.config.ts` pointe vers un dossier inexistant : supprimer ou corriger.
- **Files (read):** `config/shared-config/vitest.config.ts`, `config/shared-config/package.json`.
- **Files (write):** `config/shared-config/vitest.config.ts` (suppression), `config/shared-config/package.json` (retirer scripts test si présents).
- **Invariants à préserver:** Autres exports de `config/shared-config` inchangés.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-shared-config` doit dire « no tests » sans erreur, `pnpm coverage:report 0` doit ignorer ce paquet.
- **Done criteria:** Fichier supprimé. `package.json` sans script `test`/`test:coverage` orphelin.
- **Findings résolus:** 34.
- **PR title suggéré:** `chore(shared-config): remove dead vitest config`

---

## Phase 2 — Renforcer la mesure (seuils réels, includes corrects)

**Objectif.** Que chaque paquet déjà testé déclare des seuils proches de la couverture réelle, avec includes corrects.
**Dépendances.** Phase 1 close.
**Findings couverts.** 16, 17, 18, 19, 24, 23, 22 (finalisation).
**TODO items couverts.** « Tester `commands/api/index.ts` et `commands/server/index.ts` ».
**Parallélisable ?** Oui — étapes 2.1 à 2.6 indépendantes.
**Critère de sortie de phase.** Pour chaque paquet listé, `seuilDéclaré ≥ couvertureRéelle − 3` (marge de tolérance). `pnpm coverage:report 0` reste vert.

### Étape 2.1 — Resserrer les seuils `apps/amarre`

- **Goal:** Réduire l'écart de 25 pts entre seuils déclarés et couverture réelle.
- **Files (read):** `apps/amarre/vitest.config.ts`, sortie de `pnpm test --filter=@univ-lehavre/atlas-amarre` (lecture du résumé coverage).
- **Files (write):** `apps/amarre/vitest.config.ts`.
- **Invariants à préserver:** Projects unit/ui/integration inchangés.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-amarre`.
- **Done criteria:** Pour chaque métrique, `threshold = couverture mesurée − 2`. Commentaire mis à jour avec la date.
- **Findings résolus:** 18.
- **PR title suggéré:** `test(amarre): tighten coverage thresholds to actual`

### Étape 2.2 — Resserrer les seuils `apps/ecrin`

- **Goal:** Remonter les seuils 28/18/27/28 vers la couverture réelle.
- **Files (read):** `apps/ecrin/vitest.config.ts`, sortie `pnpm test --filter=@univ-lehavre/atlas-ecrin`.
- **Files (write):** `apps/ecrin/vitest.config.ts`.
- **Invariants à préserver:** Alias `$lib`, `$env/static/private` inchangés.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ecrin && pnpm coverage:report 0`.
- **Done criteria:** Thresholds = couverture réelle − 2. Si réelle < 40% : noter dans ADR 0019 que ecrin sera renforcé en Phase 3 (action explicite).
- **Findings résolus:** 17.
- **PR title suggéré:** `test(ecrin): tighten coverage thresholds`

### Étape 2.3 — Élargir l'include de `apps/find-an-expert`

- **Goal:** Mesurer aussi les routes et endpoints, pas seulement `src/lib/**/*.ts`. Déclarer des seuils explicites.
- **Files (read):** `apps/find-an-expert/vite.config.ts`, `apps/find-an-expert/src/`.
- **Files (write):** `apps/find-an-expert/vite.config.ts` (ou `vitest.config.ts` nouveau si plus propre).
- **Invariants à préserver:** Configuration vite (plugins, alias).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-find-an-expert`.
- **Done criteria:** `include: ['src/**/*.{ts,svelte}']`. Thresholds explicites (couverture réelle − 2 par métrique). `coverageConfig` partagé utilisé.
- **Findings résolus:** 19.
- **PR title suggéré:** `test(find-an-expert): broaden coverage include and set thresholds`

### Étape 2.4 — Resserrer les seuils `services/crf` (préparation, vrai renforcement en Phase 3)

- **Goal:** Documenter explicitement dans ADR 0019 que `services/crf` est sous-testé et fera l'objet d'un renforcement en Phase 3.1. Garder les seuils 17/14/24/18 temporairement.
- **Files (read):** `services/crf/vitest.config.ts`, `docs/decisions/0019-derogations-workspace-audit.md`.
- **Files (write):** `docs/decisions/0019-derogations-workspace-audit.md` (ajout entrée temporaire datée).
- **Invariants à préserver:** Service runtime.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Entrée explicite « services/crf : seuils temporaires jusqu'à Phase 3.1 (échéance plan résorption 2026-06) ».
- **Findings résolus:** 16 (préparation).
- **PR title suggéré:** `docs(adr): flag services/crf coverage as temporary in ADR 0019`

### Étape 2.5 — Supprimer le test cosmétique de `assets/logos`

- **Goal:** Retirer `assets/logos/assets.test.ts` ou le réduire à un check de présence dans un script d'audit.
- **Files (read):** `assets/logos/assets.test.ts`, `assets/logos/package.json`.
- **Files (write):** suppression de `assets/logos/assets.test.ts` ; `assets/logos/package.json` (retrait script test si pertinent) ; `scripts/audit/workspace-structure.mjs` (ajout d'un check `assets/logos contient ≥ 6 fichiers svg`).
- **Invariants à préserver:** Présence physique des SVGs.
- **Validation:** `pnpm audit:structure` doit échouer si un logo manque ; `pnpm test --filter=@univ-lehavre/atlas-logos` doit dire « no tests ».
- **Done criteria:** Plus de fichier `assets/logos/assets.test.ts`. Check équivalent dans audit:structure.
- **Findings résolus:** 24.
- **PR title suggéré:** `chore(logos): move asset presence check to audit:structure`

### Étape 2.6 — Réactiver les tests de contrat `sandbox/crf-sandbox` ou justifier l'exclusion

- **Goal:** Soit lever l'exclusion par défaut des `tests/contract/**` (avec setup docker conditionnel), soit documenter dans ADR 0019 que ces tests sont déclenchés exclusivement par un script dédié.
- **Files (read):** `sandbox/crf-sandbox/vitest.config.ts`, `sandbox/crf-sandbox/tests/contract/`, `sandbox/crf-sandbox/package.json`.
- **Files (write):** `sandbox/crf-sandbox/vitest.config.ts`, `sandbox/crf-sandbox/package.json` (ajout `test:contract` explicite), `docs/decisions/0019-derogations-workspace-audit.md`.
- **Invariants à préserver:** Comportement de `pnpm test` (rapide, sans docker) inchangé.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-sandbox && pnpm --filter=@univ-lehavre/atlas-crf-sandbox test:contract` (le second skip si docker absent).
- **Done criteria:** Script `test:contract` explicite, self-skip si docker absent. Seuils plancher 30/20/30/30 sur les tests non-contract.
- **Findings résolus:** 23.
- **PR title suggéré:** `test(crf-sandbox): split contract tests into explicit script`

### Étape 2.7 — Resserrer les seuils `packages/atlas-stats` après extension include

- **Goal:** Suite de Phase 1.4 : valeur réelle des seuils après extension.
- **Files (read):** `packages/atlas-stats/vitest.config.ts`, sortie coverage.
- **Files (write):** `packages/atlas-stats/vitest.config.ts`.
- **Invariants à préserver:** Tests existants.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-stats`.
- **Done criteria:** Seuils = couverture réelle − 2 par métrique.
- **Findings résolus:** 22 (finalisation).
- **PR title suggéré:** `test(atlas-stats): align thresholds with actual coverage`

### Étape 2.8 — Tester `commands/api/index.ts` et `commands/server/index.ts` de `cli/crf`

- **Goal:** Compléter la couverture cli/crf (64.6% → >90%).
- **Files (read):** `cli/crf/src/commands/api/index.ts`, `cli/crf/src/commands/server/index.ts`, tests existants.
- **Files (write):** `cli/crf/src/commands/api/index.test.ts`, `cli/crf/src/commands/server/index.test.ts`, `cli/crf/vitest.config.ts` (seuils 90/80/90/90).
- **Invariants à préserver:** Bin entry points runtime.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-cli`.
- **Done criteria:** Couverture cli/crf > 90% statements. Seuils dans vitest.config.ts à 90/80/90/90.
- **Findings résolus:** Audit cli/crf TODO item.
- **PR title suggéré:** `test(crf-cli): cover api and server bin entry points`

---

## Phase 3 — Combler les paquets sans tests

**Objectif.** Aucun paquet productif sans tests. Tous les paquets passent le filet 80% ou sont documentés dans ADR 0019.
**Dépendances.** Phase 2 close.
**Findings couverts.** 20, 21, 31, 32, 16 (finalisation services/crf).
**TODO items couverts.** « Couverture CLIs restantes » (cli/biblio, cli/citation, cli/atlas-stats, cli/crf-stats, cli/researcher-profiles).
**Parallélisable ?** Oui — chaque sous-phase indépendante. Découper en sous-PR par paquet.
**Critère de sortie de phase.** `pnpm coverage:report 80` retourne 0. La cible CI/pre-push de Phase 1.2 est remontée de `0` à `80`.

### Étape 3.1 — Couverture `services/crf`

- **Goal:** Couvrir les handlers et la config du service Hono REDCap au-delà de 80%.
- **Files (read):** `services/crf/src/**`.
- **Files (write):** nouveaux `services/crf/src/**/*.test.ts` pour chaque handler ; `services/crf/vitest.config.ts` (seuils 80/70/80/80).
- **Invariants à préserver:** Comportement runtime du service (validé par tests d'intégration existants).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf && pnpm coverage:report 80`.
- **Done criteria:** Couverture statements > 80%. Seuils 80/70/80/80. Entrée temporaire de l'étape 2.4 retirée d'ADR 0019.
- **Findings résolus:** 16.
- **PR title suggéré:** `test(services-crf): cover handlers and configuration`

### Étape 3.2 — Couverture `cli/biblio`

- **Goal:** Passer cli/biblio de 0% à ≥ 60% statements (référence : stratégie cli/crf PR #214, cli/net PR #216).
- **Files (read):** `cli/biblio/src/**`, `cli/crf/src/**/*.test.ts` (référence de pattern).
- **Files (write):** `cli/biblio/src/**/*.test.ts`, `cli/biblio/vitest.config.ts` (seuils 60/50/60/60).
- **Invariants à préserver:** Bin entry et exports CLI.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-biblio-cli`.
- **Done criteria:** Couverture ≥ 60% statements. Seuils alignés.
- **Findings résolus:** 20 (partiel), 31 (partiel).
- **PR title suggéré:** `test(biblio-cli): boost coverage from 0% to 60%`

### Étape 3.3 — Couverture `cli/citation`

- **Goal:** Idem 3.2 pour cli/citation.
- **Files (read):** `cli/citation/src/**`.
- **Files (write):** `cli/citation/src/**/*.test.ts`, `cli/citation/vitest.config.ts` (seuils 60/50/60/60).
- **Invariants à préserver:** Bin entry.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-citation-cli`.
- **Done criteria:** Couverture ≥ 60% statements.
- **Findings résolus:** 20, 31.
- **PR title suggéré:** `test(citation-cli): boost coverage from 0% to 60%`

### Étape 3.4 — Couverture `cli/atlas-stats`

- **Goal:** Idem 3.2 pour cli/atlas-stats.
- **Files (read):** `cli/atlas-stats/src/**`.
- **Files (write):** `cli/atlas-stats/src/**/*.test.ts`, `cli/atlas-stats/vitest.config.ts`.
- **Invariants à préserver:** Bin entry.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-stats-cli`.
- **Done criteria:** Couverture ≥ 60% statements.
- **Findings résolus:** 20, 31.
- **PR title suggéré:** `test(atlas-stats-cli): boost coverage from 0% to 60%`

### Étape 3.5 — Couverture `cli/crf-stats`

- **Goal:** Idem 3.2 pour cli/crf-stats.
- **Files (read):** `cli/crf-stats/src/**`.
- **Files (write):** `cli/crf-stats/src/**/*.test.ts`, `cli/crf-stats/vitest.config.ts`.
- **Invariants à préserver:** Bin entry.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-stats-cli`.
- **Done criteria:** Couverture ≥ 60% statements.
- **Findings résolus:** 20, 31.
- **PR title suggéré:** `test(crf-stats-cli): boost coverage from 0% to 60%`

### Étape 3.6 — Couverture `cli/researcher-profiles`

- **Goal:** Couvrir cli/researcher-profiles (10 fichiers skipped recensés).
- **Files (read):** `cli/researcher-profiles/src/**`.
- **Files (write):** `cli/researcher-profiles/src/**/*.test.ts`, `cli/researcher-profiles/vitest.config.ts` (créer si absent) avec seuils 60/50/60/60.
- **Invariants à préserver:** Bin entry.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-researcher-profiles-cli`.
- **Done criteria:** Couverture ≥ 60%.
- **Findings résolus:** 31.
- **PR title suggéré:** `test(researcher-profiles-cli): introduce test suite`

### Étape 3.7 — Couverture `cli/logos`

- **Goal:** Soit ajouter des tests (génération de logos), soit documenter dans ADR 0019 (CLI trivial wrapper assets).
- **Files (read):** `cli/logos/src/**`, `cli/logos/package.json`.
- **Files (write):** `cli/logos/vitest.config.ts` (nouveau) + tests OU entrée ADR 0019.
- **Invariants à préserver:** Bin entry.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-logos-cli` ou `pnpm coverage:report 80`.
- **Done criteria:** Soit couverture ≥ 60%, soit ADR 0019 mis à jour avec justification.
- **Findings résolus:** 20 (partiel).
- **PR title suggéré:** `test(logos-cli): add minimal test suite`

### Étape 3.8 — Couverture `apps/atlas-dashboard`

- **Goal:** Introduire vitest.config et premiers tests pour cette app sans aucun test.
- **Files (read):** `apps/atlas-dashboard/src/**`.
- **Files (write):** `apps/atlas-dashboard/vitest.config.ts`, premiers tests `*.test.ts`.
- **Invariants à préserver:** Comportement SvelteKit.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-dashboard`.
- **Done criteria:** Au minimum tests de smoke sur les routes principales. Seuils 30/20/30/30 (à remonter en Phase 4 avec E2E).
- **Findings résolus:** 13 (partiel pour ce paquet).
- **PR title suggéré:** `test(atlas-dashboard): introduce test scaffold`

### Étape 3.9 — Couverture `apps/crf-dashboard` (5 fichiers skipped)

- **Goal:** Couvrir les 5 fichiers actuellement à 0%.
- **Files (read):** `apps/crf-dashboard/src/**`, `apps/crf-dashboard/vitest.config.ts`.
- **Files (write):** tests manquants, `apps/crf-dashboard/vitest.config.ts` (seuils alignés).
- **Invariants à préserver:** Comportement SvelteKit.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-dashboard`.
- **Done criteria:** 0 fichier skipped restant.
- **Findings résolus:** 13 (partiel), 15 (partiel pour ce paquet).
- **PR title suggéré:** `test(crf-dashboard): cover untested files`

### Étape 3.10 — Couverture `packages/net` et `packages/fetch-one-api-page`

- **Goal:** Ajouter des tests minimum aux 2 paquets `packages/` sans aucun test.
- **Files (read):** `packages/net/src/**`, `packages/fetch-one-api-page/src/**`.
- **Files (write):** tests + `vitest.config.ts` pour chaque.
- **Invariants à préserver:** API publique (cf. exports `package.json`).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-net --filter=@univ-lehavre/atlas-fetch-one-api-page`.
- **Done criteria:** Couverture ≥ 70% pour ces deux paquets (libs petites, plancher haut justifié).
- **Findings résolus:** 13 (finalisation pour ces paquets).
- **PR title suggéré:** `test(net,fetch-one-api-page): introduce test suites`

### Étape 3.11 — Couverture `ui/atlas-ui`

- **Goal:** Tests sur les 22 composants partagés (au minimum un test smoke par composant).
- **Files (read):** `ui/atlas-ui/src/**`.
- **Files (write):** `ui/atlas-ui/src/**/*.test.ts`, `ui/atlas-ui/vitest.config.ts` (créer ou aligner).
- **Invariants à préserver:** API publique des composants (props, events, slots).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ui`.
- **Done criteria:** Chaque composant a au moins un `.test.ts` (smoke = render sans throw). Couverture ≥ 50%.
- **Findings résolus:** 21.
- **PR title suggéré:** `test(atlas-ui): add smoke tests for shared components`

### Étape 3.12 — Exposer `__resetRateLimitForTests` dans `packages/auth`

- **Goal:** Helper de reset partagé pour éviter la fuite d'état rate-limit entre tests.
- **Files (read):** `packages/auth/src/handlers.ts`, `packages/auth/src/handlers.test.ts`.
- **Files (write):** `packages/auth/src/handlers.ts` (ajout export interne `__resetRateLimitForTests`), `packages/auth/src/handlers.test.ts` (utilisation dans `beforeEach`).
- **Invariants à préserver:** API publique de `packages/auth`. Le helper est exporté avec marqueur `@internal` (jsdoc) et préfixe `__`.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-auth`.
- **Done criteria:** Fonction présente, appelée dans `beforeEach` de chaque test rate-limited.
- **Findings résolus:** 32.
- **PR title suggéré:** `test(auth): expose internal rate-limit reset helper`

### Étape 3.13 — Remonter la cible CI/pre-push de `0` à `80`

- **Goal:** Passer `pnpm coverage:report 0` → `pnpm coverage:report 80` dans `.github/workflows/ci.yml` et `lefthook.yml`.
- **Files (read):** `.github/workflows/ci.yml`, `lefthook.yml`.
- **Files (write):** `.github/workflows/ci.yml`, `lefthook.yml`.
- **Invariants à préserver:** Reste du pipeline.
- **Validation:** `pnpm coverage:report 80` localement = exit 0. Push test branch.
- **Done criteria:** CI exécute `coverage:report 80` ; cas d'échec attendu si un paquet régresse.
- **Findings résolus:** 13, 14 (finalisation), 15.
- **PR title suggéré:** `ci: raise coverage:report target to 80`

---

## Phase 4 — E2E en CI et couverture endpoints

**Objectif.** Playwright tourne en CI (nightly minimum) pour les 3 apps front (amarre, sillage, golden path supplémentaire) ; chaque endpoint `+server.ts` a au moins 3 tests (200, 401, payload malformé).
**Dépendances.** Phase 3 close (filet coverage solide pour ne pas masquer les régressions endpoints).
**Findings couverts.** 25, 26, 29, 30, 52, 35.
**TODO items couverts.** « Brancher les niveaux 2 à 5 d'amarre sur pre-push et CI ».
**Parallélisable ?** Étapes 4.1 (workflow E2E) et 4.2 (helper endpoints) en parallèle ; 4.3–4.5 dépendent de 4.2.
**Critère de sortie de phase.** Workflow `.github/workflows/e2e.yml` existe et tourne nightly avec succès ; pour chaque app, `find src/routes -name '+server.ts' | xargs -I{} test -f {%.ts}.test.ts` retourne 0.

### Étape 4.1 — Workflow CI nightly Playwright (amarre + sillage)

- **Goal:** Job CI nightly qui démarre la docker-compose sandbox, attend Mailpit + Appwrite + REDCap, exécute `pnpm test:smoke`.
- **Files (read):** `sandbox/amarre-sandbox/`, `sandbox/sillage-sandbox/playwright.config.ts`, `.github/workflows/ci.yml`.
- **Files (write):** `.github/workflows/e2e.yml` (nouveau).
- **Invariants à préserver:** Workflow `ci.yml` inchangé.
- **Validation:**
  - Localement : `pnpm --filter=@univ-lehavre/atlas-amarre-sandbox start && pnpm --filter=@univ-lehavre/atlas-amarre test:smoke`.
  - GitHub : déclencher manuellement via `workflow_dispatch`.
- **Done criteria:**
  1. `e2e.yml` avec triggers `schedule: cron "0 3 * * *"` + `workflow_dispatch` + `pull_request` paths-filter `apps/amarre|apps/sillage|sandbox/amarre-sandbox|sandbox/sillage-sandbox`.
  2. Job amarre-e2e et sillage-e2e séparés.
  3. Healthcheck explicite (curl + timeout) avant `pnpm test:smoke`.
  4. Artifacts Playwright report uploadés en cas d'échec.
- **Findings résolus:** 25.
- **PR title suggéré:** `ci: add nightly Playwright E2E workflow for amarre and sillage`

### Étape 4.2 — Helper partagé `createRouteEvent` pour tests endpoints

- **Goal:** Helper centralisé `createRouteEvent({ locals, body, ip })` réutilisable par toutes les apps SvelteKit.
- **Files (read):** `apps/amarre/tests/`, `apps/ecrin/tests/`, `apps/find-an-expert/tests/`.
- **Files (write):** `packages/test-utils-sveltekit/src/createRouteEvent.ts` (nouveau paquet) + `package.json` + `vitest.config.ts`.
- **Invariants à préserver:** Tests existants doivent continuer de passer.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-test-utils-sveltekit`.
- **Done criteria:** Paquet `@univ-lehavre/atlas-test-utils-sveltekit` consommable par les apps. Doc inline (JSDoc) sur le helper.
- **Findings résolus:** Préparation 26.
- **PR title suggéré:** `feat(test-utils-sveltekit): create shared route event helper`

### Étape 4.3 — Tests 200/401/malformed pour `apps/ecrin` (14 endpoints / 4 tests actuels)

- **Goal:** Pour chacun des 14 endpoints, ajouter au moins 1 test 200, 1 test 401, 1 test payload malformé.
- **Files (read):** `apps/ecrin/src/routes/api/v1/**/+server.ts`.
- **Files (write):** `apps/ecrin/src/routes/api/v1/**/+server.test.ts` (un par endpoint).
- **Invariants à préserver:** Endpoints inchangés.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ecrin && bash -c "for f in apps/ecrin/src/routes/api/v1/**/+server.ts; do test -f \${f%.ts}.test.ts || { echo MISSING \$f; exit 1; }; done"`.
- **Done criteria:** Chaque endpoint a un test associé. Couverture endpoints > 80%.
- **Findings résolus:** 26 (partiel), 17 (finalisation).
- **PR title suggéré:** `test(ecrin): cover all api endpoints with 200/401/malformed`

### Étape 4.4 — Tests 200/401/malformed pour `apps/find-an-expert` (17 endpoints / 3 tests actuels)

- **Goal:** Idem 4.3 pour find-an-expert.
- **Files (read):** `apps/find-an-expert/src/routes/api/v1/**/+server.ts`.
- **Files (write):** tests par endpoint.
- **Invariants à préserver:** Endpoints inchangés ; en particulier `repositories/[id]/contributors`, `/pulls`, `/issues`, `/analysis` cités dans le finding.
- **Validation:** comme 4.3.
- **Done criteria:** Chaque endpoint a un test associé.
- **Findings résolus:** 26 (partiel).
- **PR title suggéré:** `test(find-an-expert): cover all api endpoints with 200/401/malformed`

### Étape 4.5 — Tests 200/401/malformed pour `apps/amarre` (9 endpoints / 5 tests actuels)

- **Goal:** Idem 4.3 pour amarre, finir les endpoints non couverts.
- **Files (read):** `apps/amarre/src/routes/api/v1/**/+server.ts`.
- **Files (write):** tests manquants.
- **Invariants à préserver:** Tests Phase 7.2 conservés.
- **Validation:** comme 4.3.
- **Done criteria:** Chaque endpoint a un test associé. Couverture endpoints > 90%.
- **Findings résolus:** 26 (finalisation).
- **PR title suggéré:** `test(amarre): complete endpoint coverage with 200/401/malformed`

### Étape 4.6 — Helper anti-XSS partagé + coverage étendue

- **Goal:** Extraire l'assertion XSS de `apps/find-an-expert/src/routes/api/v1/institutions/search/+server.test.ts` dans un helper réutilisable.
- **Files (read):** `apps/find-an-expert/src/routes/api/v1/institutions/search/+server.test.ts`.
- **Files (write):** `packages/test-utils-sveltekit/src/assertNoXss.ts` ; tests d'utilisation dans amarre + ecrin sur les endpoints qui acceptent des strings.
- **Invariants à préserver:** Test XSS original (paramétrer avec le helper sans changer la sémantique).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-test-utils-sveltekit && pnpm test --filter=@univ-lehavre/atlas-amarre --filter=@univ-lehavre/atlas-ecrin --filter=@univ-lehavre/atlas-find-an-expert`.
- **Done criteria:** Helper exporté. Au minimum 3 endpoints par app utilisent le helper.
- **Findings résolus:** 29, 52.
- **PR title suggéré:** `test: share anti-XSS assertion helper across apps`

### Étape 4.7 — Étendre le pattern `_openapi` aux apps ecrin et find-an-expert

- **Goal:** Répliquer le pattern de tests anti-dérive OpenAPI d'amarre dans les 2 autres apps SvelteKit.
- **Files (read):** `apps/amarre/tests/routes/api/v1/surveys/list.test.ts`.
- **Files (write):** `apps/ecrin/tests/routes/api/v1/**/_openapi.test.ts` (pour les routes documentées), `apps/find-an-expert/tests/routes/api/v1/**/_openapi.test.ts`.
- **Invariants à préserver:** Spec OpenAPI existante.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ecrin --filter=@univ-lehavre/atlas-find-an-expert`.
- **Done criteria:** Chaque app SvelteKit a au moins un test `_openapi` par endpoint documenté.
- **Findings résolus:** 30.
- **PR title suggéré:** `test: extend OpenAPI drift checks to ecrin and find-an-expert`

### Étape 4.8 — Isolation d'état Bootstrap dans smoke E2E

- **Goal:** Ajouter `describe.configure({ retries: 1 })` + isolation explicite (cleanup hooks `beforeEach`/`afterEach`) dans les smoke E2E.
- **Files (read):** `sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts`, `sandbox/sillage-sandbox/tests/e2e/`.
- **Files (write):** ces fichiers.
- **Invariants à préserver:** Scénarios E2E.
- **Validation:** `pnpm --filter=@univ-lehavre/atlas-amarre-sandbox test:smoke` exécuté 3 fois consécutives, tous verts.
- **Done criteria:** Cleanup explicite avant chaque test, retries configurés.
- **Findings résolus:** 35.
- **PR title suggéré:** `test(e2e): isolate Bootstrap state and add retries`

### Étape 4.9 — Brancher les niveaux 2 à 5 d'amarre sur pre-push et CI

- **Goal:** Étendre les hooks pre-push et la CI aux niveaux 2 à 5 de la pyramide amarre (aujourd'hui seul N1 protège).
- **Files (read):** `lefthook.yml`, `.github/workflows/ci.yml`, `.github/workflows/e2e.yml` (créé en 4.1), `apps/amarre/tests/`.
- **Files (write):** `.github/workflows/e2e.yml` (étendre), `lefthook.yml` (ajout commande conditionnelle si docker disponible).
- **Invariants à préserver:** Temps pre-push doit rester < 5 min (sinon condition `docker info` avant exécution).
- **Validation:** Push test branch.
- **Done criteria:** Niveaux 2-5 amarre exécutés en CI (job dédié dans e2e.yml) ; en pre-push seulement si docker disponible.
- **Findings résolus:** TODO « Brancher les niveaux 2 à 5 d'amarre ».
- **PR title suggéré:** `ci: wire amarre integration tests into CI and conditional pre-push`

---

## Phase 5 — Qualité statique : ESLint strict, format, sandboxes

**Objectif.** Le preset Svelte strict est utilisé, `format:check` couvre tout, sandboxes lintées, warnings bloquants, eslint-disables justifiés.
**Dépendances.** Phase 3 close (filet en place).
**Findings couverts.** 36, 37, 38, 39, 40.
**TODO items couverts.** Aucun direct.
**Parallélisable ?** Étapes 5.1, 5.2, 5.3, 5.4, 5.5 indépendantes.
**Critère de sortie de phase.** `pnpm lint` passe avec `--max-warnings 0` partout ; preset Svelte strict utilisé par toutes les apps ou exception ADR documentée ; `pnpm format:check` couvre tout sans exclusion non justifiée.

### Étape 5.1 — Migration des apps vers le preset Svelte strict

- **Goal:** Migrer apps/amarre, atlas-dashboard, crf-dashboard, ecrin, find-an-expert, sillage, ui/atlas-ui de `svelteRelaxed` à `svelte` (strict). Documenter les règles désactivées par app dans un ADR.
- **Files (read):** `config/shared-config/eslint/svelte.js`, `apps/*/eslint.config.js`, `ui/atlas-ui/eslint.config.js`.
- **Files (write):** `apps/*/eslint.config.js`, `ui/atlas-ui/eslint.config.js`, nouvel ADR `docs/decisions/0020-svelte-eslint-strict.md`.
- **Invariants à préserver:** Comportement runtime des apps. Si une règle strict casse une convention légitime, la désactiver localement avec commentaire `// eslint-disable-next-line svelte/X -- raison`.
- **Validation:** `pnpm lint --filter=@univ-lehavre/atlas-amarre` etc. pour chaque app, puis `pnpm lint`.
- **Done criteria:** Toutes les apps importent `svelte` (strict) ; warnings résolus ; ADR 0020 rédigé.
- **Findings résolus:** 36.
- **PR title suggéré:** `chore(eslint): migrate apps to strict svelte preset`

### Étape 5.2 — Élargir `format:check` à la racine des paquets

- **Goal:** Retirer la restriction `src` ; couvrir tests, scripts, configs.
- **Files (read):** `packages/*/package.json`, `apps/*/package.json`, `cli/*/package.json`, `services/*/package.json`, `sandbox/*/package.json`, `ui/*/package.json`.
- **Files (write):** chaque `package.json` ayant un `format:check` restreint.
- **Invariants à préserver:** Fichiers exclus explicitement (cf. `.prettierignore`).
- **Validation:** `pnpm format:check`. Auto-fix initial avec `pnpm format` si nécessaire (commit séparé « style: prettier sweep across non-src files »).
- **Done criteria:** Tous les `format:check` ciblent `.` ou un glob racine. Tous les fichiers respectent prettier.
- **Findings résolus:** 37.
- **PR title suggéré:** `chore(format): broaden format:check beyond src`

### Étape 5.3 — Ajouter script `lint` aux sandboxes

- **Goal:** Sandbox amarre-sandbox, sillage-sandbox, crf-sandbox-core ont un script `lint`.
- **Files (read):** `sandbox/amarre-sandbox/package.json`, `sandbox/sillage-sandbox/package.json`, `sandbox/crf-sandbox-core/package.json`, `sandbox/crf-sandbox/package.json` (référence).
- **Files (write):** les `package.json` listés ; `sandbox/*/eslint.config.js` si manquant (basé sur le shared-config).
- **Invariants à préserver:** Sandboxes isolés (ADR 0002).
- **Validation:** `pnpm lint --filter=@univ-lehavre/atlas-amarre-sandbox` etc.
- **Done criteria:** 4/4 sandboxes ont `lint`, `lint:fix`, `format`, `format:check`.
- **Findings résolus:** 38.
- **PR title suggéré:** `chore(sandbox): add lint scripts to sandbox packages`

### Étape 5.4 — Activer `--max-warnings 0` globalement

- **Goal:** Faire échouer la CI sur tout warning ESLint.
- **Files (read):** `package.json` racine, `apps/*/package.json`, `packages/*/package.json` etc., `turbo.json`.
- **Files (write):** scripts `lint` dans les `package.json`, ajout `--max-warnings 0`.
- **Invariants à préserver:** Comportement `lint:fix` séparé.
- **Validation:** `pnpm lint`. Tout warning résiduel doit être corrigé ou converti en `error` justifié.
- **Done criteria:** Aucun warning résiduel. CI échoue si introduction d'un warning.
- **Findings résolus:** 39.
- **PR title suggéré:** `chore(eslint): enforce --max-warnings 0`

### Étape 5.5 — Activer `eslint-comments/require-description`

- **Goal:** Chaque `eslint-disable*` doit avoir une justification après `--`.
- **Files (read):** `config/shared-config/eslint/base.js`.
- **Files (write):** `config/shared-config/eslint/base.js` (passage de `off` à `error`), nettoyage des disables non justifiés dans tout le repo.
- **Invariants à préserver:** Comportement runtime.
- **Validation:** `pnpm lint`. Auto-fix manuel des disables existants : ajouter `-- raison concise` ou retirer le disable s'il n'est plus utile.
- **Done criteria:** Règle `eslint-comments/require-description: error` active ; `pnpm lint` vert.
- **Findings résolus:** 40.
- **PR title suggéré:** `chore(eslint): require description on eslint-disable comments`

---

## Phase 6 — Structure : ADR alignés et règles d'audit

**Objectif.** Toutes les promesses d'ADR sont implémentées dans `scripts/audit/workspace-structure.mjs` ; les ADR périmés sont mis à jour ; les zones grises (sandbox deps, config exports, nommage atlas-) ont un ADR.
**Dépendances.** Phase 5 (le code est propre).
**Findings couverts.** 1, 2, 3, 8, 9, 10, 11, 12, 46.
**TODO items couverts.** Aucun.
**Parallélisable ?** Oui — étapes 6.1 à 6.8 indépendantes.
**Critère de sortie de phase.** `pnpm audit:structure` couvre cli↔cli, private:true, imports relatifs cross-workspace, `.svelte.ts`, exports config/, nommage. ADR 0011 à jour.

### Étape 6.1 — Implémenter la règle cli↔cli dans `audit:structure`

- **Goal:** Refuser qu'un cli/ dépende d'un autre cli/.
- **Files (read):** `scripts/audit/workspace-structure.mjs`, `docs/decisions/0008-clis-thins-logique-dans-packages.md`.
- **Files (write):** `scripts/audit/workspace-structure.mjs`, tests `scripts/audit/workspace-structure.test.mjs` (si absent : créer).
- **Invariants à préserver:** Règles existantes.
- **Validation:** `pnpm audit:structure`. Test fixture qui simule une dep cli→cli doit échouer.
- **Done criteria:** Règle présente, testée.
- **Findings résolus:** 1.
- **PR title suggéré:** `chore(audit): enforce cli-to-cli dependency rule (ADR 0008)`

### Étape 6.2 — Implémenter le check `private:true` dans `audit:structure`

- **Goal:** Vérifier que tout paquet hors liste de paquets publiables a `private: true`.
- **Files (read):** `scripts/audit/workspace-structure.mjs`, `docs/decisions/0011-paquets-internes-private.md`.
- **Files (write):** `scripts/audit/workspace-structure.mjs`.
- **Invariants à préserver:** Liste des paquets publiables (à figer dans une constante du script ou un fichier `publishable.json`).
- **Validation:** `pnpm audit:structure`.
- **Done criteria:** Règle présente, testée. ADR 0011 référencé dans le code.
- **Findings résolus:** 2.
- **PR title suggéré:** `chore(audit): enforce private:true rule (ADR 0011)`

### Étape 6.3 — Mettre à jour ADR 0011

- **Goal:** Refléter l'état actuel (toutes les apps sont private).
- **Files (read):** `docs/decisions/0011-paquets-internes-private.md`.
- **Files (write):** ce fichier.
- **Invariants à préserver:** Historique (utiliser un bloc « Évolution » daté).
- **Validation:** `pnpm docs:build`.
- **Done criteria:** ADR à jour, daté 2026-05-30, listant la liste actuelle des paquets publiables.
- **Findings résolus:** 3, 46.
- **PR title suggéré:** `docs(adr): update ADR 0011 to current packaging reality`

### Étape 6.4 — Scanner imports relatifs cross-workspace

- **Goal:** Compléter la règle apps→apps / services→services pour détecter aussi les imports relatifs cross-workspace (`../../../apps/x`).
- **Files (read):** `scripts/audit/workspace-structure.mjs:416`.
- **Files (write):** `scripts/audit/workspace-structure.mjs`.
- **Invariants à préserver:** Règle deps existante.
- **Validation:** `pnpm audit:structure`. Test fixture avec import relatif cross-workspace doit échouer.
- **Done criteria:** Imports relatifs cross-workspace détectés et rejetés.
- **Findings résolus:** 8.
- **PR title suggéré:** `chore(audit): detect cross-workspace relative imports`

### Étape 6.5 — Étendre scan aux `.svelte.ts` et imports dynamiques

- **Goal:** Couvrir les fichiers `.svelte.ts` (state runes) et les imports dynamiques (`import('...')`).
- **Files (read):** `scripts/audit/workspace-structure.mjs:86`.
- **Files (write):** `scripts/audit/workspace-structure.mjs`.
- **Invariants à préserver:** Patterns existants.
- **Validation:** `pnpm audit:structure`. Test fixture.
- **Done criteria:** `.svelte.ts` scannés, imports dynamiques détectés.
- **Findings résolus:** 9.
- **PR title suggéré:** `chore(audit): scan .svelte.ts and dynamic imports`

### Étape 6.6 — ADR sandbox deps

- **Goal:** Documenter la politique de dépendances des sandboxes.
- **Files (read):** `docs/architecture/monorepo.md:137`, `sandbox/*/package.json`.
- **Files (write):** `docs/decisions/0021-sandbox-deps-policy.md` (nouveau).
- **Invariants à préserver:** Aucun.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** ADR rédigé. Politique consolidée et référencée par `docs/architecture/monorepo.md`.
- **Findings résolus:** 10.
- **PR title suggéré:** `docs(adr): document sandbox dependency policy (ADR 0021)`

### Étape 6.7 — Check exports `config/`

- **Goal:** Vérifier que chaque paquet sous `config/` expose un `exports` propre.
- **Files (read):** `scripts/audit/workspace-structure.mjs:331`, `config/*/package.json`.
- **Files (write):** `scripts/audit/workspace-structure.mjs`.
- **Invariants à préserver:** Interdiction `bin` existante.
- **Validation:** `pnpm audit:structure`.
- **Done criteria:** Règle exports présente. Tous les paquets config/ conformes ou ADR 0019 met à jour la dérogation.
- **Findings résolus:** 11.
- **PR title suggéré:** `chore(audit): enforce exports on config packages`

### Étape 6.8 — Convention de nommage `atlas-`

- **Goal:** ADR explicite : trancher si le préfixe `atlas-` est obligatoire / interdit / libre selon la catégorie.
- **Files (read):** `packages/atlas-stats`, `cli/atlas-stats`.
- **Files (write):** `docs/decisions/0022-naming-convention.md` (nouveau), éventuellement renommages cohérents (par exemple `packages/stats` + `cli/stats` ou consolidation explicite).
- **Invariants à préserver:** Si renommage : maintenir les anciens noms via aliases dans `package.json` pour 1 cycle de release.
- **Validation:** `pnpm install && pnpm ci:checks`.
- **Done criteria:** ADR rédigé. Renommages si décidés. Règle dans `audit:structure` qui vérifie la convention.
- **Findings résolus:** 7, 12.
- **PR title suggéré:** `docs(adr): document atlas- naming convention (ADR 0022)`

---

## Phase 7 — Réorganisation des paquets mal catégorisés

**Objectif.** `cli/crf-openapi` devient `packages/crf-openapi` ; `packages/citation-validate` perd son rôle CLI ; `sandbox/crf-sandbox-core` est supprimé ou complété.
**Dépendances.** Phase 6 close (règles d'audit prêtes pour valider la nouvelle structure).
**Findings couverts.** 4, 5, 6.
**TODO items couverts.** Aucun direct.
**Parallélisable ?** Étapes 7.1, 7.2, 7.3 indépendantes mais à découper en PRs distinctes (impact monorepo).
**Critère de sortie de phase.** `pnpm audit:structure` vert, `pnpm ci:checks` vert, `pnpm ci:audit` vert.

### Étape 7.1 — Migrer `cli/crf-openapi` vers `packages/crf-openapi`

- **Goal:** Le paquet expose une lib ; le placer sous `packages/`.
- **Files (read):** `cli/crf-openapi/`, `cli/crf-openapi/package.json:17`.
- **Files (write):** `git mv cli/crf-openapi packages/crf-openapi`, mise à jour `package.json` (catégorie, suppression `bin` si trivial), mise à jour `pnpm-workspace.yaml` si nécessaire, mise à jour des consumers (`grep -r '@univ-lehavre/atlas-crf-openapi' --include=package.json`).
- **Invariants à préserver:** API publique du paquet.
- **Validation:** `pnpm install && pnpm ci:checks && pnpm audit:structure`.
- **Done criteria:** Paquet sous `packages/`. Aucune référence morte à `cli/crf-openapi`.
- **Findings résolus:** 4.
- **PR title suggéré:** `refactor(crf-openapi): move from cli to packages`

### Étape 7.2 — Migrer les prompts de `packages/citation-validate` vers `cli/citation`

- **Goal:** Sortir `@clack/prompts` du paquet lib ; déplacer le CLI dans `cli/citation` ou créer `cli/citation-validate`.
- **Files (read):** `packages/citation-validate/`, `cli/citation/`.
- **Files (write):** `packages/citation-validate/src/` (retrait des prompts), `cli/citation/src/commands/validate.ts` (nouveau ou existant), `packages/citation-validate/package.json` (retrait `@clack/prompts` des deps).
- **Invariants à préserver:** API métier de `citation-validate` (les fonctions de validation pures).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-citation-validate --filter=@univ-lehavre/atlas-citation-cli && pnpm audit:structure`.
- **Done criteria:** `packages/citation-validate` ne contient plus de code CLI. `@clack/prompts` retiré. CLI fonctionnel.
- **Findings résolus:** 5.
- **PR title suggéré:** `refactor(citation-validate): move prompts to citation CLI`

### Étape 7.3 — Supprimer ou compléter `sandbox/crf-sandbox-core`

- **Goal:** Scaffold vide non utilisé : décision par défaut = suppression.
- **Files (read):** `sandbox/crf-sandbox-core/`, `grep -r 'crf-sandbox-core' .`.
- **Files (write):** `git rm -r sandbox/crf-sandbox-core`, mise à jour `pnpm-workspace.yaml` si listé, `docs/architecture/monorepo.md`.
- **Invariants à préserver:** Aucun (paquet inutilisé).
- **Validation:** `pnpm install && pnpm ci:checks && pnpm audit:structure`.
- **Done criteria:** Dossier supprimé, aucune référence morte.
- **Findings résolus:** 6.
- **PR title suggéré:** `chore(sandbox): remove unused crf-sandbox-core scaffold`

---

## Phase 8 — Robustesse tests : MSW, fast-check, helpers

**Objectif.** Suppression des tests wrapper-only inutiles ; introduction de MSW pour les tests HTTP ; introduction de fast-check pour validators/brands.
**Dépendances.** Phase 4 close (couverture endpoints solide).
**Findings couverts.** 27, 28, 33.
**TODO items couverts.** Aucun direct.
**Parallélisable ?** Oui.
**Critère de sortie de phase.** Plus de tests wrapper-only. MSW utilisé par au moins 3 paquets HTTP. fast-check utilisé par validators et brands.

### Étape 8.1 — Supprimer les tests wrapper-only

- **Goal:** Supprimer `apps/sillage/tests/integration/services-auth.test.ts` et équivalents identifiés (tout test où tout est mocké et qui ne vérifie que la signature du wrapper).
- **Files (read):** `apps/sillage/tests/integration/services-auth.test.ts:13`, `grep -rn "vi.mock" packages/baas/`.
- **Files (write):** suppression des tests wrapper-only ; commentaire CHANGELOG.
- **Invariants à préserver:** Couverture par d'autres tests doit rester ≥ seuil. Vérifier avant suppression.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-sillage && pnpm coverage:report 80`.
- **Done criteria:** Tests wrapper-only supprimés. Couverture maintenue.
- **Findings résolus:** 27.
- **PR title suggéré:** `test: remove wrapper-only mocked tests`

### Étape 8.2 — Introduire MSW au niveau réseau

- **Goal:** Remplacer les mocks fonctionnels HTTP par MSW dans `packages/citation`, `packages/citation-fetch`, `packages/net`, `packages/fetch-one-api-page`.
- **Files (read):** `packages/citation/src/fetch/fetch-citation.test.ts:5` et équivalents.
- **Files (write):** ajout `msw` aux devDeps de chaque paquet concerné, `packages/<name>/tests/msw-handlers.ts`, refactor des tests.
- **Invariants à préserver:** Sémantique des tests existants.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-citation --filter=@univ-lehavre/atlas-citation-fetch --filter=@univ-lehavre/atlas-net --filter=@univ-lehavre/atlas-fetch-one-api-page`.
- **Done criteria:** Au minimum 3 paquets utilisent MSW. Documentation dans CONTRIBUTING.md ou docs/testing/.
- **Findings résolus:** 28.
- **PR title suggéré:** `test: adopt MSW for HTTP-level mocking`

### Étape 8.3 — Property-based testing sur validators et brands

- **Goal:** Introduire `fast-check` dans `packages/validators` et `packages/crf-core/src/brands/`.
- **Files (read):** `packages/validators/src/index.test.ts`, `packages/crf-core/src/brands/`.
- **Files (write):** ajout `fast-check` aux devDeps, nouveaux tests `*.property.test.ts`.
- **Invariants à préserver:** Tests existants conservés.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-validators --filter=@univ-lehavre/atlas-crf-core`.
- **Done criteria:** Au minimum 1 propriété par validator et par brand.
- **Findings résolus:** 33.
- **PR title suggéré:** `test: add property-based tests for validators and brands`

---

## Phase 9 — Backend handler standardisation + CSP

**Objectif.** Pattern handler→app standardisé entre amarre/ecrin/find-an-expert ; CSP systématique entre apps.
**Dépendances.** Phase 4 (couverture endpoints solide pour ne pas régresser).
**Findings couverts.** 51, 53.
**TODO items couverts.** Aucun.
**Parallélisable ?** Étapes 9.1 et 9.2 indépendantes.
**Critère de sortie de phase.** Les 3 apps utilisent le même pattern handler ; toutes les apps ont des headers CSP testés.

### Étape 9.1 — Standardiser handler→app (amarre, ecrin, find-an-expert)

- **Goal:** Introduire un helper partagé `withHandler({ effect, status })` (ou nom équivalent) et migrer les 3 apps.
- **Files (read):** `apps/amarre/src/lib/server/`, `apps/ecrin/src/lib/server/`, `apps/find-an-expert/src/lib/server/`, `services/crf/src/handlers/` (référence Effect).
- **Files (write):** nouveau paquet `packages/sveltekit-handler/src/withHandler.ts` ; refactor progressif apps endpoint par endpoint.
- **Invariants à préserver:** Format des réponses HTTP, codes status, messages d'erreur.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-amarre --filter=@univ-lehavre/atlas-ecrin --filter=@univ-lehavre/atlas-find-an-expert && pnpm coverage:report 80`.
- **Done criteria:** Tous les endpoints des 3 apps utilisent `withHandler`. Test smoke par app garantissant le format de réponse inchangé.
- **Findings résolus:** 51.
- **PR title suggéré:** `feat(sveltekit-handler): standardize handler pattern across apps`

### Étape 9.2 — CSP systématique

- **Goal:** Helper CSP partagé et appliqué dans `hooks.server.ts` de chaque app. Tests d'assertion sur les headers CSP.
- **Files (read):** `apps/*/src/hooks.server.ts`, `packages/baas` si pertinent.
- **Files (write):** `packages/sveltekit-csp/src/index.ts` (nouveau) ou ajout à `packages/baas` ; `apps/*/src/hooks.server.ts` ; tests d'assertion CSP par app.
- **Invariants à préserver:** Comportement applicatif des apps. CSP qui ne casse pas le runtime (start avec `Report-Only` puis durcir).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-amarre --filter=...` ; déploiement local + curl pour confirmer headers.
- **Done criteria:** Helper exporté, utilisé par toutes les apps, testé. Note ADR ou doc référencée.
- **Findings résolus:** 53.
- **PR title suggéré:** `feat(security): apply shared CSP headers across apps`

---

## Phase 10 — UI partagée : theming, tests, parité visuelle, a11y

**Objectif.** Theming optionnel d'`atlas-ui`, tests a11y, dispatcher tests UI level-1 d'amarre vers atlas-ui, parité visuelle amarre.
**Dépendances.** Phase 3.11 close (atlas-ui testé).
**Findings couverts.** 50, 57.
**TODO items couverts.** « atlas-ui système de theming », « Dispatcher tests entre 5 niveaux et atlas-ui », « Parité visuelle amarre prod vs local ».
**Parallélisable ?** Étapes 10.1, 10.2, 10.3, 10.4 indépendantes.
**Critère de sortie de phase.** `ui/atlas-ui` expose un point d'extension theming ; tests a11y `axe-core` en CI ; tests level-1 amarre migrés ; parité visuelle confirmée.

### Étape 10.1 — Système de theming optionnel `atlas-ui`

- **Goal:** Exposer variables CSS custom + prop `theme` sur un composant racine.
- **Files (read):** `ui/atlas-ui/src/`, `apps/amarre/src/` (référence usage).
- **Files (write):** `ui/atlas-ui/src/theme/`, `ui/atlas-ui/src/index.ts` (export), Storybook addon `themes`.
- **Invariants à préserver:** API existante des composants (theming opt-in).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ui && pnpm --filter=@univ-lehavre/atlas-ui storybook:build`.
- **Done criteria:** Variables CSS custom documentées. Prop `theme` testée. Storybook montre 2 thèmes.
- **Findings résolus:** Préparation 50.
- **PR title suggéré:** `feat(atlas-ui): introduce optional theming system`

### Étape 10.2 — Dispatcher tests UI amarre level-1 vers atlas-ui

- **Goal:** Migrer les tests `apps/amarre/tests/ui/` qui testent des composants d'`ui/atlas-ui` vers `ui/atlas-ui/tests/`.
- **Files (read):** `apps/amarre/tests/ui/`, `ui/atlas-ui/src/`.
- **Files (write):** `ui/atlas-ui/tests/` (migration tests + fixtures), `apps/amarre/tests/ui/` (suppression doublons).
- **Invariants à préserver:** Tests existants (déplacés, pas perdus).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ui --filter=@univ-lehavre/atlas-amarre && pnpm coverage:report 80`.
- **Done criteria:** Tests level-1 dans `ui/atlas-ui` ; couverture amarre maintenue ou améliorée.
- **Findings résolus:** TODO « Dispatcher tests entre 5 niveaux et atlas-ui ».
- **PR title suggéré:** `test(atlas-ui): migrate level-1 component tests from amarre`

### Étape 10.3 — Tests a11y avec axe-core

- **Goal:** Introduire `@axe-core/playwright` (ou `vitest-axe` pour level-1) dans les tests UI.
- **Files (read):** `ui/atlas-ui/tests/`, `sandbox/amarre-sandbox/tests/e2e/`.
- **Files (write):** ajout `@axe-core/playwright` aux devDeps, nouveaux tests `*.a11y.test.ts`.
- **Invariants à préserver:** Tests fonctionnels existants.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-ui && pnpm --filter=@univ-lehavre/atlas-amarre-sandbox test:smoke`.
- **Done criteria:** Au moins 1 test a11y par composant majeur dans atlas-ui ; intégration smoke E2E avec axe.
- **Findings résolus:** 57.
- **PR title suggéré:** `test(a11y): introduce axe-core tests for shared components and smoke E2E`

### Étape 10.4 — Parité visuelle amarre prod vs local

> **Statut : reportée (2026-06-01).** Cette étape exige des **captures
> de la prod amarre déployée** (Appwrite Sites) pour le diff visuel, non
> accessibles depuis l'environnement d'exécution agentique. Elle est
> volontairement sortie de la PR Phase 10 (#241) et reprise dès qu'une
> capture de référence prod est disponible. Le filet de sécurité prévu
> (snapshots Playwright dans `sandbox/amarre-sandbox/tests/e2e/`) sera
> introduit à ce moment-là. Ce n'est pas une dette de code : aucune
> divergence n'est connue à ce jour, c'est une vérification ponctuelle
> à mener avec l'artefact prod en main.

- **Goal:** Diff visuel entre prod et local ; corriger les divergences CSS post PR #190.
- **Files (read):** `apps/amarre/src/`, `ui/atlas-ui/src/`, captures prod.
- **Files (write):** corrections CSS dans atlas-ui ou apps/amarre selon source du drift.
- **Invariants à préserver:** Layout fonctionnel.
- **Validation:** smoke E2E avec snapshots Playwright ; capture manuelle locale vs prod.
- **Done criteria:** Aucune divergence visuelle majeure. Tests snapshot Playwright introduits comme garde-fou.
- **Findings résolus:** TODO « Parité visuelle amarre prod vs local ».
- **PR title suggéré:** `fix(amarre): restore visual parity with prod after atlas-ui extraction`

### Étape 10.5 — Réviser le workflow UI d'amarre vs `univ-lehavre/amarre` standalone

> **Statut : déjà tranchée (2026-06-01) — voir
> [ADR 0009](../decisions/0009-atlas-source-canonique-amarre).** La
> décision visée par cette étape (atlas source canonique, standalone
> `univ-lehavre/amarre` figé au 2026-02-06, sync historique réalisé en
> PR #155 le 2026-05-19) est déjà actée et documentée. Rouvrir un remote
>
> - un ADR `0023-amarre-monorepo-vs-standalone` dupliquerait l'ADR 0009.
>   Aucun port n'est dû ; l'étape est close sans action. (L'ADR 0023 a été
>   attribué à un autre sujet : la dette `storybook:build`.)

- **Goal:** Diff structurel entre repo monorepo et standalone, statuer sur ce qui doit être porté.
- **Files (read):** `apps/amarre/`, `git remote add amarre-standalone https://github.com/univ-lehavre/amarre.git` + `git fetch amarre-standalone` + diff.
- **Files (write):** PR avec les ports décidés, ADR `docs/decisions/0023-amarre-monorepo-vs-standalone.md` documentant la décision.
- **Invariants à préserver:** Comportement runtime d'amarre.
- **Validation:** `pnpm ci:checks --filter=@univ-lehavre/atlas-amarre`.
- **Done criteria:** ADR rédigé. Ports effectués. `git remote remove amarre-standalone`.
- **Findings résolus:** TODO « Réviser le workflow UI d'amarre ».
- **PR title suggéré:** `chore(amarre): align with upstream standalone workflow`

---

## Phase 11 — Build, CI, reproductibilité

**Objectif.** Inputs turbo complets, actions GitHub pinées par SHA, cache pnpm/Node CI optimisé, deps resserrées, `any` résiduels traités.
**Dépendances.** Aucune dure (peut tourner en parallèle de 8, 9, 10).
**Findings couverts.** 41, 45, 47, 48, 49.
**TODO items couverts.** Aucun.
**Parallélisable ?** Oui.
**Critère de sortie de phase.** `turbo.json` inputs incluent vitest.config.ts, eslint.config.js, tsconfig.json. Actions GitHub pinées SHA. Cache CI configuré. Deps resserrées sur paquets publiables. `pnpm exec tsc --noEmit` rapporte 0 `any` non justifié.

### Étape 11.1 — Compléter les inputs `turbo.json`

- **Goal:** Inclure vitest.config.ts, eslint.config.js, tsconfig.json, postcss.config.\*, svelte.config.js dans les inputs de chaque tâche pertinente.
- **Files (read):** `turbo.json`.
- **Files (write):** `turbo.json`.
- **Invariants à préserver:** Comportement des tâches.
- **Validation:** `pnpm turbo run test --dry=json | jq` pour vérifier les inputs ; `pnpm turbo run test` après modification d'un vitest.config (doit invalider le cache).
- **Done criteria:** Cache turbo correctement invalidé sur modification de chaque type de config.
- **Findings résolus:** 41.
- **PR title suggéré:** `chore(turbo): include config files in task inputs`

### Étape 11.2 — Pin SHA des actions GitHub

- **Goal:** Remplacer `@vX` par le SHA correspondant dans tous les workflows.
- **Files (read):** `.github/workflows/*.yml`.
- **Files (write):** `.github/workflows/*.yml`.
- **Invariants à préserver:** Versions des actions inchangées (SHA = tag actuel résolu).
- **Validation:** Push test branch. Audit `pnpm audit:structure` étendu pour valider le pinning (optionnel).
- **Done criteria:** Toutes les actions tierces pinées par SHA. Renovate/Dependabot configuré pour les mettre à jour.
- **Findings résolus:** 45.
- **PR title suggéré:** `ci: pin GitHub actions to SHA`

### Étape 11.3 — Optimiser cache pnpm/Node CI

- **Goal:** Cache `setup-pnpm` + cache `node_modules` correctement configuré dans tous les jobs.
- **Files (read):** `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.github/workflows/codeql.yml`, `.github/workflows/release.yml`.
- **Files (write):** ces workflows.
- **Invariants à préserver:** Versions Node/pnpm.
- **Validation:** Mesurer temps CI avant/après.
- **Done criteria:** Cache hit visible dans les logs CI ; temps job réduit (constat).
- **Findings résolus:** 47.
- **PR title suggéré:** `ci: optimize pnpm and Node caching`

### Étape 11.4 — Resserrer ranges deps sur paquets publiables

- **Goal:** Remplacer `^` par `~` (ou versions exactes) sur les paquets publiables.
- **Files (read):** `cli/*/package.json`, `packages/*/package.json` (paquets publiables identifiés via la liste figée en 6.2).
- **Files (write):** ces `package.json`.
- **Invariants à préserver:** Compatibilité runtime.
- **Validation:** `pnpm install && pnpm ci:checks`.
- **Done criteria:** Ranges resserrés. ADR référencé si politique.
- **Findings résolus:** 48.
- **PR title suggéré:** `chore(deps): tighten dependency ranges on publishable packages`

### Étape 11.5 — Traquer les `any` résiduels

- **Goal:** Remplacer les `any` résiduels par `unknown` + type guards.
- **Files (read):** `grep -rn ": any" --include="*.ts" packages/ apps/ cli/ services/ ui/`.
- **Files (write):** fichiers concernés.
- **Invariants à préserver:** Comportement runtime.
- **Validation:** `pnpm typecheck && pnpm ci:checks`.
- **Done criteria:** Aucun `any` non justifié (`// eslint-disable -- raison`).
- **Findings résolus:** 49.
- **PR title suggéré:** `refactor: replace residual any with unknown + guards`

---

## Phase 12 — Documentation site et racine

**Objectif.** TODOs avec owner/date ; plus de page TBD ; quickstart contributeur consolidé.
**Dépendances.** Aucune (documentation pure).
**Findings couverts.** 42, 43, 44.
**TODO items couverts.** Aucun direct.
**Parallélisable ?** Oui.
**Critère de sortie de phase.** `pnpm docs:build` vert ; `grep -rn "TODO(" packages/ apps/ cli/` ne retourne que des TODO au format `TODO(owner, YYYY-MM-DD)`.

### Étape 12.1 — Imposer format `TODO(owner, date)`

- **Goal:** Réécrire les TODOs existants ; règle ESLint pour les nouveaux.
- **Files (read):** `grep -rn "TODO" --include="*.ts" --include="*.svelte" --include="*.js" .`.
- **Files (write):** fichiers concernés ; `config/shared-config/eslint/base.js` (règle custom ou usage de `eslint-plugin-no-warning-comments` paramétré).
- **Invariants à préserver:** Comportement runtime. Documentation pure.
- **Validation:** `pnpm lint`.
- **Done criteria:** Tous les TODOs respectent le format. Règle ESLint qui rejette les nouveaux TODOs non conformes.
- **Findings résolus:** 42.
- **PR title suggéré:** `chore: enforce TODO(owner, date) format`

### Étape 12.2 — Compléter ou retirer les pages TBD du menu VitePress

- **Goal:** Plus de page TBD visible dans la nav.
- **Files (read):** `docs/.vitepress/config.ts`, pages signalées TBD.
- **Files (write):** soit compléter, soit retirer du menu (et déplacer le fichier vers `docs/_drafts/` exclu de la build).
- **Invariants à préserver:** Navigation cohérente.
- **Validation:** `pnpm docs:build && pnpm docs:dev` (vérif visuelle locale via script automatique : capture screenshot par puppeteer).
- **Done criteria:** `grep -rn "TBD" docs/` ne retourne plus rien dans les pages publiées.
- **Findings résolus:** 43.
- **PR title suggéré:** `docs: complete or hide TBD pages`

### Étape 12.3 — Consolider le quickstart contributeur

- **Goal:** Un seul endroit canonique. Le README pointe vers `docs/guide/contributing.md` (ou équivalent).
- **Files (read):** `README.md`, `CONTRIBUTING.md`, `docs/guide/`.
- **Files (write):** consolidation vers `docs/guide/contributing.md` ; README et CONTRIBUTING.md réduits à un pointer + commandes essentielles (`pnpm install`, `pnpm dev`).
- **Invariants à préserver:** Contenu existant (pas de perte d'information).
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Une seule source de vérité. Pointeurs cohérents.
- **Findings résolus:** 44.
- **PR title suggéré:** `docs: consolidate contributor quickstart`

---

## Phase 13 — Observabilité et performance

**Objectif.** Budget bundle vérifié en CI ; tracing distribué entre services ; agrégation d'erreurs côté ops.
**Dépendances.** Phase 11 close (CI optimisée).
**Findings couverts.** 54, 55, 56.
**TODO items couverts.** Aucun.
**Parallélisable ?** Étapes 13.1, 13.2, 13.3 indépendantes.
**Critère de sortie de phase.** Budget bundle bloquant en CI ; au moins 1 service instrumenté OTel ; au moins 1 sink d'agrégation d'erreurs configuré (Sentry ou équivalent open source).

### Étape 13.1 — Budget bundle bloquant

- **Goal:** `audit:size` doit échouer si un bundle dépasse une cible figée par paquet.
- **Files (read):** `.size-limit.json` ou config équivalente, `package.json:audit:size`.
- **Files (write):** `.size-limit.json` (figer cibles par paquet publiable), `.github/workflows/ci.yml` (s'assurer que `audit:size` est bloquant).
- **Invariants à préserver:** Tailles actuelles ≤ cibles.
- **Validation:** `pnpm audit:size`.
- **Done criteria:** Cibles définies pour chaque paquet publiable. CI échoue sur dépassement.
- **Findings résolus:** 54.
- **PR title suggéré:** `ci: enforce bundle budget per package`

### Étape 13.2 — Tracing OpenTelemetry sur `services/crf`

- **Goal:** Instrumenter le service Hono REDCap avec OTel ; exporter vers stdout en dev, configurable via env en prod.
- **Files (read):** `services/crf/src/server.ts`, `services/crf/src/handlers/`.
- **Files (write):** `services/crf/src/telemetry.ts` (nouveau), `services/crf/package.json` (ajout `@opentelemetry/*`).
- **Invariants à préserver:** Comportement runtime.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf && pnpm --filter=@univ-lehavre/atlas-crf dev` (vérif spans visibles).
- **Done criteria:** Spans visibles dans stdout en dev. Configuration via env (`OTEL_*`).
- **Findings résolus:** 55 (initial — autres services suivront hors plan).
- **PR title suggéré:** `feat(services-crf): add OpenTelemetry instrumentation`

### Étape 13.3 — Agrégation d'erreurs côté ops

- **Goal:** Brancher Sentry (ou GlitchTip self-hosted) sur les 3 apps front + `services/crf`. Configuration via env.
- **Files (read):** `apps/amarre/src/hooks.client.ts`, `apps/amarre/src/hooks.server.ts`, etc.
- **Files (write):** ces hooks, ajout `@sentry/sveltekit` aux deps, doc opérationnelle.
- **Invariants à préserver:** Comportement runtime hors erreur (Sentry init opt-in via env).
- **Validation:** `pnpm test && pnpm --filter=...test:smoke` ; tests unitaires sur init Sentry mocké.
- **Done criteria:** Sentry init dans hooks ; documentation env vars. Aucune dépendance hard à un compte externe (init no-op si `SENTRY_DSN` absent).
- **Findings résolus:** 56.
- **PR title suggéré:** `feat(observability): wire Sentry into apps and services-crf`

---

## Phase 14 — TODO actionnable « Hors DevSecOps » restant

**Objectif.** Traiter les items TODO non couverts ailleurs.
**Dépendances.** Phases 3, 4, 10 closes.
**Findings couverts.** Aucun (TODO).
**TODO items couverts.** `packages/crf-project-template/`, helper TS REDCap CSV + fake records, abstraction CLI partagée, Dockeriser sillage-app, Sandbox amarre dictionnaire CRF, Annoncer `brew install gitleaks`.
**Parallélisable ?** Oui.
**Critère de sortie de phase.** Chaque item TODO de cette section a un résultat observable (paquet créé, doc ajoutée, fichier produit) ou est migré vers une issue GitHub avec label `enhancement` si l'effort dépasse le plan.

### Étape 14.1 — Créer `packages/crf-project-template`

- **Goal:** Trame déclarative avec Effect Schema.
- **Files (read):** `packages/crf-core/`, `services/crf/src/`.
- **Files (write):** `packages/crf-project-template/` (scaffold complet : src/, tests/, package.json, vitest.config.ts, README.md).
- **Invariants à préserver:** API stable des paquets consommateurs.
- **Validation:** `pnpm install && pnpm test --filter=@univ-lehavre/atlas-crf-project-template && pnpm audit:structure`.
- **Done criteria:** Paquet créé, testé ≥ 70% coverage, exporté dans la doc.
- **PR title suggéré:** `feat(crf-project-template): scaffold declarative project template`

### Étape 14.2 — Helper TS parser CSV REDCap + fake records

- **Goal:** Helper dans `packages/crf-core` ou nouveau `packages/crf-fixtures`.
- **Files (read):** `packages/crf-core/`, `sandbox/crf-sandbox/tests/contract/fixtures/`.
- **Files (write):** `packages/crf-fixtures/src/csv.ts`, `packages/crf-fixtures/src/fake.ts`.
- **Invariants à préserver:** Aucun (nouveau code).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-fixtures`.
- **Done criteria:** Paquet créé, testé.
- **PR title suggéré:** `feat(crf-fixtures): add CSV parser and fake record generator`

### Étape 14.3 — Abstraction CLI partagée

- **Goal:** Extraire le boilerplate commun des CLIs citation-like dans `packages/cli-toolkit` (ou nom convenu via ADR).
- **Files (read):** `cli/citation/`, `cli/biblio/`, `cli/researcher-profiles/`.
- **Files (write):** `packages/cli-toolkit/`, refactor des CLIs concernés pour consommer.
- **Invariants à préserver:** Bin entry et comportement CLI.
- **Validation:** `pnpm test --filter='./cli/**' && pnpm coverage:report 80`.
- **Done criteria:** Au moins 3 CLIs utilisent le toolkit. Réduction LOC mesurable.
- **PR title suggéré:** `feat(cli-toolkit): share CLI boilerplate across citation-like CLIs`

### Étape 14.4 — Dockeriser sillage-app dans sillage-sandbox

- **Goal:** Service `app` dans le docker-compose qui run sillage build-once et expose :5173.
- **Files (read):** `sandbox/sillage-sandbox/docker-compose.yml`, `apps/sillage/Dockerfile` (créer si absent).
- **Files (write):** `apps/sillage/Dockerfile`, `sandbox/sillage-sandbox/docker-compose.yml`.
- **Invariants à préserver:** Autres services compose.
- **Validation:** `pnpm --filter=@univ-lehavre/atlas-sillage-sandbox start && curl http://localhost:5173`.
- **Done criteria:** App accessible localement via docker. Documentation README sandbox.
- **PR title suggéré:** `feat(sillage-sandbox): dockerize sillage-app service`

### Étape 14.5 — Sandbox amarre : dictionnaire CRF minimum

- **Goal:** Exporter le dictionnaire CRF minimum dans `sandbox/amarre-sandbox/fixtures/` + script d'import REDCap.
- **Files (read):** `sandbox/amarre-sandbox/bootstrap-crf.sh`.
- **Files (write):** `sandbox/amarre-sandbox/fixtures/crf-dictionary.csv`, `sandbox/amarre-sandbox/scripts/import-dictionary.sh`.
- **Invariants à préserver:** Bootstrap existant.
- **Validation:** `bash sandbox/amarre-sandbox/scripts/import-dictionary.sh` (depuis stack lancée).
- **Done criteria:** Bootstrap entièrement automatisé. README mis à jour.
- **PR title suggéré:** `feat(amarre-sandbox): automate CRF dictionary import`

### Étape 14.6 — Annoncer `brew install gitleaks` aux contributeurs

- **Goal:** Doc pure.
- **Files (read):** `CONTRIBUTING.md`, `docs/guide/contributing.md` (consolidé en 12.3).
- **Files (write):** ajout d'une section « Pré-requis locaux » mentionnant gitleaks.
- **Invariants à préserver:** Hook gitleaks reste warning si non installé.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Section présente, lien vers https://github.com/gitleaks/gitleaks.
- **PR title suggéré:** `docs(contributing): mention gitleaks local install`

---

## Phase 15 — Publication des 7 CLIs sur GitHub Packages

**Objectif.** Les 7 CLIs déclenchent une première release via Changesets sur `npm.pkg.github.com`.
**Dépendances.** Phase 3 close (CLIs testés), Phase 7 close (`crf-openapi` migré ; à publier comme paquet).
**Findings couverts.** Aucun.
**TODO items couverts.** « Publier les 7 CLIs sur GitHub Packages ».
**Parallélisable ?** Étape 15.1 séquentielle, étapes 15.2 parallèles par CLI.
**Critère de sortie de phase.** `gh api /user/packages?package_type=npm` (ou équivalent) liste les 7 paquets ; doc consommateur publiée.

### Étape 15.1 — Vérifier détection Changesets pour les 7 paquets

- **Goal:** Vérifier que `pnpm changeset` détecte bien les 7 paquets.
- **Files (read):** `.changeset/config.json`, `cli/*/package.json`.
- **Files (write):** `.changeset/config.json` (ajout aux paquets publiables si manquant), `cli/*/package.json` (champ `publishConfig.registry: https://npm.pkg.github.com`).
- **Invariants à préserver:** Releases existantes.
- **Validation:** `pnpm changeset status`.
- **Done criteria:** 7 paquets détectés. `publishConfig` correct sur chacun.
- **PR title suggéré:** `chore(release): prepare CLIs for GitHub Packages publication`

### Étape 15.2 — Premier changeset par CLI (7 changesets indépendants)

- **Goal:** Pour chaque CLI, créer un changeset `initial release` puis laisser le release workflow publier.
- **Files (read):** `cli/biblio`, `cli/citation`, `cli/crf`, `cli/crf-stats`, `cli/net`, `cli/researcher-profiles`, `packages/crf-openapi` (post 7.1), `cli/atlas-stats`.
- **Files (write):** 7 fichiers `.changeset/*.md`.
- **Invariants à préserver:** Versions cohérentes (0.1.0 initial).
- **Validation:** Merge déclenche le workflow release ; vérifier publication via `gh api /user/packages`.
- **Done criteria:** 7 paquets publiés. Versions visibles sur GitHub Packages.
- **PR title suggéré:** `release: initial publication of 7 CLIs to GitHub Packages`

### Étape 15.3 — Documentation consommateur

- **Goal:** Doc pour installer les CLIs depuis GitHub Packages.
- **Files (read):** `docs/guide/`.
- **Files (write):** `docs/guide/install-clis.md` (nouveau) avec `.npmrc` exemple et `pnpm add` commandes.
- **Invariants à préserver:** Doc existante.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Page publiée. Lien depuis le menu et le README.
- **PR title suggéré:** `docs(guide): document CLI installation from GitHub Packages`

---

## Phase 16 — Suppression de TODO.md

**Objectif.** TODO.md disparaît. Tous les items restants sont migrés.
**Dépendances.** Toutes les phases précédentes closes.
**Findings couverts.** Aucun.
**TODO items couverts.** Tous les restants.
**Parallélisable ?** Étape 16.1 (audit) puis 16.2 (migrations) parallèles ; 16.3 finale.
**Critère de sortie de phase.** `test ! -f TODO.md`. `grep -r "TODO.md" --exclude-dir=.git --exclude-dir=node_modules .` ne retourne plus de référence active.

### Étape 16.1 — Audit du contenu résiduel de TODO.md

- **Goal:** Lister chaque ligne restante, la classer en : (a) déjà faite, (b) à migrer ADR, (c) à migrer issue GitHub, (d) à migrer CHANGELOG, (e) à migrer docs/audit/, (f) à dropper.
- **Files (read):** `TODO.md`.
- **Files (write):** rapport interne dans le PR description (pas de nouveau fichier).
- **Validation:** Liste exhaustive croisée avec l'annexe C de ce plan.
- **Done criteria:** Tableau publié dans le body du PR.
- **PR title suggéré:** (préparatoire, regroupé avec 16.2)

### Étape 16.2 — Migrations

- **Goal:** Exécuter les migrations classées en 16.1.

#### Sous-étape 16.2.a — Items « À arbitrer » → ADR

- **RGPD / PRIVACY.md** : créer `docs/decisions/0024-rgpd-perimetre.md` qui acte que le périmètre RGPD est hors repo et renvoie vers une politique institutionnelle à pointer ou à créer. Pose explicitement les 6 questions du TODO comme « questions ouvertes pour décision future ».
- **Security champion CodeQL** : créer `docs/decisions/0025-security-champion.md` qui acte que la fonction de security champion est ouverte (vacante actuellement) avec critères de désignation. Si bus-factor = 1 reste vrai, expliciter dans l'ADR.

- **Files (write):** `docs/decisions/0024-rgpd-perimetre.md`, `docs/decisions/0025-security-champion.md`, `docs/decisions/README.md` (index).
- **Validation:** `pnpm docs:build`.

#### Sous-étape 16.2.b — Items « Reporté sine die » → confirmation ADR 0001

- **Goal:** ADR 0001 existe déjà. Vérifier que les 8 items sine die (Phase 5.1 RGPD, 5.2 CODEOWNERS, 5.3 branch protection, 6.1 environnements, 6.3 validation externe, 7.1 nightly ZAP, 7.3 revue trimestrielle, 8.1 alerting Appwrite, 8.3 sauvegarde) y sont nommés et qualifiés. Sinon, amender ADR 0001 avec un tableau exhaustif des reports.
- **Files (read):** `docs/decisions/0001-devsecops-perimetre-repo-sine-die.md`.
- **Files (write):** ce fichier si besoin.
- **Validation:** `pnpm docs:build`.

#### Sous-étape 16.2.c — Archive → CHANGELOG ou docs/audit/

- **Goal:** Pour chaque entrée d'archive datée, vérifier que le commit/PR est dans `git log` (cas (f) drop) ou créer une entrée `CHANGELOG.md` si versioning pertinent.
- **Files (read):** `TODO.md` section Archive, `CHANGELOG.md`, `git log --since="2026-05-01"`.
- **Files (write):** `CHANGELOG.md` si entrées manquantes (suivre format Keep a Changelog).
- **Validation:** `pnpm docs:build`.

#### Sous-étape 16.2.d — Items « En cours / à faire » restants → issue GitHub

- **Goal:** Pour tout item TODO non couvert par les phases 1-15 (cas exceptionnels), ouvrir une issue GitHub avec label `enhancement` ou `tech-debt`.
- **Files (read):** TODO.md résiduel.
- **Commands:** `gh issue create --title ... --body ... --label enhancement`.
- **Validation:** `gh issue list --label tech-debt`.

### Étape 16.3 — Suppression de TODO.md et mise à jour des références

- **Goal:** `git rm TODO.md` et mise à jour de toute référence.
- **Files (read):** `grep -rn "TODO.md" --exclude-dir=.git --exclude-dir=node_modules .`.
- **Files (write):**
  - `git rm TODO.md`.
  - `README.md` (retirer le lien TODO ou le remplacer par lien vers `docs/decisions/` et issues GitHub).
  - `CONTRIBUTING.md` ou `docs/guide/contributing.md` (idem).
  - `docs/audit/2026-05-29.md` (retirer renvois TODO si présents, ou les marquer historiques).
  - `docs/decisions/README.md` (pointeurs vers les nouveaux ADR 0020–0025).
- **Invariants à préserver:** Aucune référence morte.
- **Validation:**
  - `test ! -f TODO.md`.
  - `grep -rn "TODO.md" --exclude-dir=.git --exclude-dir=node_modules .` retourne uniquement des références historiques (commits, audit archivé).
  - `pnpm docs:build`.
  - `pnpm ci:checks && pnpm ci:audit`.
- **Done criteria:** TODO.md absent ; références à jour ; CI verte.
- **PR title suggéré:** `chore: retire TODO.md after full backlog migration`

---

## Annexes

### A. Findings non couverts par le plan

Aucun finding actif n'est laissé de côté.

Les items « Reporté sine die » de TODO.md sont cadrés par ADR 0001 et ne sont pas traités par ce plan (par construction). Ils sont migrés en Phase 16.2.b.

Le finding 58 (mentionné en bas de l'extraction mais coupé) n'est pas listé : si présent dans l'audit complet, le rattacher à la Phase 10 (a11y/i18n) ou Phase 12 (doc) selon sa nature au moment de l'exécution.

### B. Mapping finding → phase/étape

| Finding | Phase.Étape             |
| ------- | ----------------------- |
| 1       | 6.1                     |
| 2       | 6.2                     |
| 3       | 6.3                     |
| 4       | 7.1                     |
| 5       | 7.2                     |
| 6       | 7.3                     |
| 7       | 6.8                     |
| 8       | 6.4                     |
| 9       | 6.5                     |
| 10      | 6.6                     |
| 11      | 6.7                     |
| 12      | 6.8                     |
| 13      | 1.1, 3.13               |
| 14      | 1.2, 3.13               |
| 15      | 1.3, 3.13               |
| 16      | 2.4, 3.1                |
| 17      | 2.2, 4.3                |
| 18      | 2.1                     |
| 19      | 2.3                     |
| 20      | 3.2, 3.3, 3.4, 3.5, 3.7 |
| 21      | 3.11                    |
| 22      | 1.4, 2.7                |
| 23      | 2.6                     |
| 24      | 2.5                     |
| 25      | 4.1                     |
| 26      | 4.2, 4.3, 4.4, 4.5      |
| 27      | 8.1                     |
| 28      | 8.2                     |
| 29      | 4.6                     |
| 30      | 4.7                     |
| 31      | 3.2, 3.3, 3.4, 3.5, 3.6 |
| 32      | 3.12                    |
| 33      | 8.3                     |
| 34      | 1.5                     |
| 35      | 4.8                     |
| 36      | 5.1                     |
| 37      | 5.2                     |
| 38      | 5.3                     |
| 39      | 5.4                     |
| 40      | 5.5                     |
| 41      | 11.1                    |
| 42      | 12.1                    |
| 43      | 12.2                    |
| 44      | 12.3                    |
| 45      | 11.2                    |
| 46      | 6.3                     |
| 47      | 11.3                    |
| 48      | 11.4                    |
| 49      | 11.5                    |
| 50      | 10.1, 10.4              |
| 51      | 9.1                     |
| 52      | 4.6                     |
| 53      | 9.2                     |
| 54      | 13.1                    |
| 55      | 13.2                    |
| 56      | 13.3                    |
| 57      | 10.3                    |

### C. Mapping TODO item → phase/étape

| TODO item                                                                                 | Phase.Étape                    |
| ----------------------------------------------------------------------------------------- | ------------------------------ |
| `packages/crf-project-template/`                                                          | 14.1                           |
| Helper TS parser CSV REDCap + fake records                                                | 14.2                           |
| Abstraction CLI partagée                                                                  | 14.3                           |
| atlas-ui : système de theming optionnel                                                   | 10.1                           |
| Dispatcher tests entre 5 niveaux et atlas-ui                                              | 10.2                           |
| Brancher niveaux 2-5 amarre sur pre-push et CI                                            | 4.9                            |
| Dockeriser sillage-app dans sillage-sandbox                                               | 14.4                           |
| Parité visuelle amarre prod vs local                                                      | 10.4                           |
| Réviser workflow UI amarre vs standalone                                                  | 10.5                           |
| Publier les 7 CLIs sur GitHub Packages                                                    | 15.1, 15.2, 15.3               |
| Sandbox amarre dictionnaire CRF                                                           | 14.5                           |
| Couverture CLIs restantes (biblio, citation, atlas-stats, crf-stats, researcher-profiles) | 3.2, 3.3, 3.4, 3.5, 3.6        |
| Tester `commands/api/index.ts` et `commands/server/index.ts` (cli/crf)                    | 2.8                            |
| Annoncer `brew install gitleaks`                                                          | 14.6                           |
| RGPD / PRIVACY.md (À arbitrer)                                                            | 16.2.a                         |
| Security champion CodeQL (À arbitrer)                                                     | 16.2.a                         |
| Items sine die (Phases 5.1, 5.2, 5.3, 6.1, 6.3, 7.1, 7.3, 8.1, 8.3 DevSecOps)             | 16.2.b (confirmation ADR 0001) |
| Archive datée                                                                             | 16.2.c                         |
| TODO.md lui-même                                                                          | 16.3                           |

### D. Estimation effort global

| Phase     | XS    | S      | M      | L      | XL    | Total         |
| --------- | ----- | ------ | ------ | ------ | ----- | ------------- |
| 1         | 0     | 4      | 1      | 0      | 0     | 5 étapes / S+ |
| 2         | 0     | 4      | 3      | 0      | 0     | 7 étapes / M  |
| 3         | 0     | 1      | 0      | 12     | 0     | 13 étapes / L |
| 4         | 0     | 1      | 5      | 3      | 0     | 9 étapes / L  |
| 5         | 0     | 3      | 1      | 1      | 0     | 5 étapes / M  |
| 6         | 0     | 5      | 3      | 0      | 0     | 8 étapes / M  |
| 7         | 0     | 1      | 1      | 1      | 0     | 3 étapes / L  |
| 8         | 0     | 1      | 2      | 0      | 0     | 3 étapes / M  |
| 9         | 0     | 0      | 2      | 0      | 0     | 2 étapes / M  |
| 10        | 0     | 1      | 2      | 2      | 0     | 5 étapes / L  |
| 11        | 0     | 3      | 2      | 0      | 0     | 5 étapes / M  |
| 12        | 0     | 3      | 0      | 0      | 0     | 3 étapes / S  |
| 13        | 0     | 0      | 1      | 2      | 0     | 3 étapes / L  |
| 14        | 1     | 2      | 2      | 1      | 0     | 6 étapes / M  |
| 15        | 0     | 2      | 1      | 0      | 0     | 3 étapes / M  |
| 16        | 0     | 3      | 1      | 0      | 0     | 4 étapes / S+ |
| **Total** | **1** | **34** | **27** | **22** | **0** | **84 étapes** |

**Global :** entre 4 et 6 semaines à temps plein pour un agent unique séquentiel ; entre 2 et 3 semaines avec parallélisation maximale sur les phases parallélisables (3, 5, 6, 8, 11, 14, 15).
