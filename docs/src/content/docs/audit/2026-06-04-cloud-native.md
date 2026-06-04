---
title: "Audit cloud-native (12 facteurs + extensions) — 2026-06-04"
---

> Date de l'audit : 2026-06-04. Méthode : workflow multi-agents (16 dimensions
> auditées en parallèle — les 12 facteurs de
> [Twelve-Factor App](https://12factor.net/) plus 4 extensions modernes
> _Beyond the Twelve-Factor_ : API-first, observabilité, sécurité, données
> stateful). Chaque constat est **prouvé par le code** (chemins de fichiers
> lus) puis **vérifié de manière adversariale** par un second agent qui rouvre
> les preuves ; 4 verdicts initialement optimistes ont été rétrogradés à la
> vérification.

## Périmètre

Unités déployables évaluées : applications `amarre`, `atlas-dashboard`,
`crf-dashboard`, `ecrin`, `find-an-expert`, `sillage` (SvelteKit) et le service
`services/crf` (Hono). Le déploiement et l'infrastructure (dépôt `cluster`) sont
hors périmètre.

## Bilan

**4 appliqués · 8 partiels · 3 écarts · 1 non applicable.**

Aucun écart n'est bloquant pour l'usage actuel (développement sur fixtures) ;
ils cadrent le durcissement avant un déploiement multi-instance. Le résumé
vivant est tenu à jour dans
[Normes et pratiques appliquées](/atlas/quality/normes/) ; ce rapport en fige
l'état au 2026-06-04 avec les preuves.

## Détail par facteur

| Facteur                   | État        | Preuve principale                                             | Écart constaté                                                            |
| ------------------------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| I. Codebase               | Appliqué    | `pnpm-workspace.yaml`, remote git unique, versions par paquet | —                                                                         |
| II. Dependencies          | Appliqué    | `pnpm-lock.yaml`, `packageManager` pinné, `~` (ADR 0024)      | —                                                                         |
| III. Config               | Appliqué    | `$env/static\|dynamic`, `PUBLIC_*`, `.env*.example`, gitleaks | —                                                                         |
| IV. Backing services      | Appliqué    | CRF/BaaS/télémétrie par URL+credentials en env                | —                                                                         |
| V. Build / release / run  | Partiel     | `apps/sillage/Dockerfile` (multi-stage)                       | Pas d'image de déploiement pour 5 apps ni le service → issue              |
| VI. Processes (stateless) | Partiel     | Sessions via cookie/backing service                           | Quelques états mémoire au niveau module (rate-limit de log)               |
| VII. Port binding         | Partiel     | `services/crf/src/server/env.ts` lit `PORT`                   | Pas de containerisation autonome pour 5 apps → issue                      |
| VIII. Concurrency         | Écart       | —                                                             | Caches en fichiers JSON locaux sans verrou (dashboards) → issue           |
| IX. Disposability         | Écart       | adapter-node `graceful` côté apps                             | Service Hono sans handler SIGTERM/SIGINT → issue                          |
| X. Dev/prod parity        | Écart       | Sandboxes Docker reproduisant les backing services            | `.nvmrc` non figé, pas d'image prod pour le service → issue               |
| XI. Logs                  | Partiel     | Logs applicatifs vers stdout                                  | `crf-logs` persiste des logs en fichier (`.crf-stats.json`) → issue       |
| XII. Admin processes      | Partiel     | CLIs (`cli/*`), scripts de bootstrap                          | Pas de pattern explicite pour l'admin en production                       |
| _ext._ API-first          | Partiel     | OpenAPI (`services/crf`, `crf-openapi`)                       | Specs générées depuis le code, pas de politique « contrat d'abord » actée |
| _ext._ Observabilité      | Partiel     | OpenTelemetry sur `services/crf`, Sentry sur 3 apps           | Non généralisé (3 apps sans Sentry), aucune métrique → issue              |
| _ext._ Sécurité / auth    | Partiel     | Cookies durcis, CSP, en-têtes, auth des apps                  | Service CRF sans middleware d'auth (routes ouvertes) → issue              |
| _ext._ Données stateful   | Non applic. | ADR 0029 (conçu)                                              | Plateforme stateful documentée mais pas encore implémentée                |

## Suivi

Les écarts actionnables sont tracés comme issues (label `enhancement` /
`tech-debt`), milestone _Transverse — Qualité applicative_ :

- Arrêt propre du service Hono (SIGTERM/SIGINT) — facteur IX.
- Logs en flux stdout plutôt qu'en fichiers (`crf-logs`) — facteur XI.
- Caches non sûrs en multi-instance (dashboards) — facteur VIII.
- Authentification du service CRF — extension sécurité.
- Images de déploiement (5 apps + service) — facteurs V / VII / X.
- Généralisation de l'observabilité — extension observabilité.

Conformément à la convention des audits, ce rapport est **figé** : il décrit
l'état au 2026-06-04. Un futur audit produira un nouveau rapport daté.
