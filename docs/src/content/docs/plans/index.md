---
title: Plans de résorption
---

Plans d'action pour résorber les findings issus des [audits](/atlas/audit/) du dépôt. Chaque plan est :

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

| Date plan  | Audit de référence                                                        | Plan                                                                                                   | Validation                                                              | Statut                               |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------ |
| 2026-05-30 | [Audit 2026-05-29](/atlas/audit/2026-05-29/)                              | [Plan de résorption](/atlas/plans/2026-05-30-resorption/)                                              | [Rapport de validation](/atlas/plans/2026-05-30-resorption-validation/) | Terminé (16 phases)                  |
| 2026-06-01 | Revue de la documentation                                                 | [Documentation vérifiable](/atlas/plans/documentation-verifiable/)                                     | —                                                                       | Terminé                              |
| 2026-06-02 | Benchmark DataOps + cluster                                               | [Pipeline de collaborations](/atlas/plans/2026-06-02-pipeline-collaborations/)                         | —                                                                       | À exécuter (révisé 2026-06-10)       |
| 2026-06-04 | [Audit cloud-native 2026-06-04](/atlas/audit/2026-06-04-cloud-native/)    | [Résorption cloud-native](/atlas/plans/2026-06-04-resorption-cloud-native/)                            | —                                                                       | À exécuter                           |
| 2026-06-04 | [Audit Effect 2026-06-04](/atlas/audit/2026-06-04-effect-socle/)          | [Socle Effect](/atlas/plans/2026-06-04-socle-effect/)                                                  | —                                                                       | À exécuter                           |
| 2026-06-11 | Réflexion topologie dépôts (transverse cluster + atlas)                   | [Topologie des dépôts cluster & atlas](/atlas/plans/2026-06-11-topologie-depots-cluster-atlas/)        | —                                                                       | Décidé — feuille de route à exécuter |
| 2026-06-11 | [ADR 0058](/atlas/decisions/0058-report-index-load/) (débloqueur Phase 4) | [Producteur de données par chercheur (`researchers`)](/atlas/plans/2026-06-11-producteur-researchers/) | —                                                                       | À exécuter (6 lots, issues liées)    |
