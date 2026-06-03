---
title: Plans de résorption
---

Plans d'action pour résorber les findings issus des [audits](../audit/) du dépôt. Chaque plan est :

- **Phasé** — étapes ordonnées par dépendance ; rien n'est attaqué tant que son prérequis n'est pas vert.
- **Agentique-ready** — exécutable par un agent Claude sans question à l'utilisateur. Chaque étape liste fichiers, invariants, commandes de validation et critères « done ».
- **Sans régression** — la chaîne `pnpm ci:checks && pnpm ci:audit && pnpm docs:build` reste verte à chaque étape.
- **Idempotent** — relancer une étape déjà faite est un no-op observable.

## Conventions

- **Format de nom** : `YYYY-MM-DD-titre.md` (date de rédaction + titre court).
- **Compagnon de validation** : `YYYY-MM-DD-titre-validation.md` (relecture automatisée du plan par un agent indépendant ; consignée pour traçabilité).
- **Suivi** : chaque phase ouvre une PR séparée. Les PRs portent le titre Conventional Commits suggéré par le plan.
- **Fin de plan** : un plan se termine quand tous ses items sont résolus (PR mergée, finding ré-évalué dans un audit ultérieur, ou décision documentée de non-action via ADR).

## Index

| Date plan  | Audit de référence                      | Plan                                                               | Validation                                                  | Statut              |
| ---------- | --------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------- |
| 2026-05-30 | [Audit 2026-05-29](../audit/2026-05-29) | [Plan de résorption](./2026-05-30-resorption)                      | [Rapport de validation](./2026-05-30-resorption-validation) | Terminé (16 phases) |
| 2026-06-01 | Revue de la documentation               | [Documentation vérifiable](./documentation-verifiable)             | —                                                           | Terminé             |
| 2026-06-02 | Benchmark freelance + cluster           | [Pipeline de collaborations](./2026-06-02-pipeline-collaborations) | —                                                           | À exécuter          |
