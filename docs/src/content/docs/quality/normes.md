---
title: Normes et pratiques appliquées
---

Cette page dresse le **bilan des pratiques d'ingénierie** réellement appliquées
dans le dépôt, discipline par discipline. Elle ne décrit que ce qui est **en
place et vérifiable aujourd'hui** : chaque pratique renvoie à un fichier ou un
mécanisme concret du dépôt. Les disciplines encore à l'état de conception (la
plateforme de données et le modèle, voir le [plan pipeline](/atlas/plans/2026-06-02-pipeline-collaborations))
ne figurent pas ici tant qu'elles ne sont pas implémentées.

## DevSecOps

La sécurité et la qualité sont intégrées à la chaîne de livraison, pas ajoutées
après coup. Le périmètre couvre le dépôt entier
([ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die)).

| Pratique                     | Comment c'est appliqué                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analyse statique (SAST)**  | CodeQL (`security-extended`) et Semgrep sur chaque _pull request_ — `.github/workflows/{codeql,semgrep}.yml`.                                                    |
| **Détection de secrets**     | Gitleaks à chaque commit (hook) et à chaque PR (CI) — `.github/workflows/gitleaks.yml`, `.gitleaks.toml`.                                                        |
| **Analyse des dépendances**  | _dependency-review_ sur les PR ; `pnpm audit` (seuil `moderate`) ; veille des versions — `audit:*`.                                                              |
| **Test dynamique (DAST)**    | Scan ZAP _baseline_ — `.github/workflows/zap-baseline.yml`.                                                                                                      |
| **SBOM**                     | Génération d'une nomenclature logicielle (CycloneDX) — `.github/workflows/sbom.yml`.                                                                             |
| **Provenance des artefacts** | Releases npm signées par OIDC, attestation de provenance — `.github/workflows/release.yml` ([ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres)). |
| **SLA de remédiation**       | Délais de correction des _findings_ par sévérité — [ADR 0018](/atlas/decisions/0018-sla-remediation-findings).                                                   |
| **Réponse aux incidents**    | Procédure tracée — [Réponse aux incidents](/atlas/quality/incident-response).                                                                                    |

## Qualité logicielle et intégrité du dépôt

La chaîne de garde-fous s'exécute en local (hooks Git) **et** en intégration
continue, et n'est jamais contournée
([ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass)).

| Pratique                     | Comment c'est appliqué                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Convention de commits**    | Conventional Commits à scopes restreints — [ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints).              |
| **Protection de branche**    | `main` protégée, PR à jour requise — [ADR 0016](/atlas/decisions/0016-branch-protection-main).                                    |
| **Couverture de tests**      | Mesurée par vitest, agrégée et seuillée — `audit:` + le [tableau de bord](/atlas/quality/tableau-de-bord).                        |
| **Structure du monorepo**    | Huit catégories, règles enforcées — `audit:structure` ([ADR 0002](/atlas/decisions/0002-monorepo-huit-categories)).               |
| **Code mort / duplication**  | knip (`audit:unused`) et jscpd (`audit:duplicates`).                                                                              |
| **Budget de bundle**         | `size-limit` (`audit:size`) sur chaque paquet publiable.                                                                          |
| **Documentation vérifiable** | La doc est un miroir contrôlable du code ; toute dérive casse la CI — [ADR 0028](/atlas/decisions/0028-documentation-verifiable). |
| **CI adaptative**            | Les jobs lourds se court-circuitent sur les PR documentaires — [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin).        |

## Applications web

Les applications du dépôt sont bâties sur un socle commun et durci.

| Pratique                        | Comment c'est appliqué                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Socle applicatif**            | SvelteKit + Hono + Bootstrap — [ADR 0006](/atlas/decisions/0006-sveltekit-hono-bootstrap).                    |
| **En-têtes de sécurité (CSP)**  | _Content-Security-Policy_ et en-têtes durcis via un paquet dédié — `packages/sveltekit-csp`.                  |
| **Programmation fonctionnelle** | Effect pour la gestion typée des erreurs et des effets — [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf). |
| **Lint strict**                 | Preset Svelte strict — [ADR 0020](/atlas/decisions/0020-svelte-eslint-strict).                                |
| **Accessibilité**               | Règles a11y au lint + tests axe-core (`vitest-axe`) — [Accessibilité](/atlas/quality/accessibilite/).         |

## Gestion des dépendances et publication

| Pratique                      | Comment c'est appliqué                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Nommage des paquets**       | Convention `atlas-`, jamais de marque — [ADR 0022](/atlas/decisions/0022-naming-convention).                       |
| **Plages de versions**        | `~` sur les dépendances des paquets publiables — [ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde).   |
| **Mises à jour automatisées** | Dependabot avec auto-merge des montées sûres — `.github/workflows/dependabot-auto-merge.yml`.                      |
| **Dérogations tracées**       | Toute exception aux règles d'audit est documentée — [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit). |

## Cloud-native : 12 facteurs + extensions

Les applications et le service du dépôt sont évalués au cadre
[**Twelve-Factor App**](https://12factor.net/) et à ses **extensions modernes**
(_Beyond the Twelve-Factor App_ : API-first, observabilité, sécurité, données).
Comme partout ici, on documente le **réel**, écarts compris — passer cet audit
n'est pas une affirmation de conformité.

| Facteur                       | État        | Comment / écart                                                                                                                                                                                                                                           |
| ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. **Codebase**               | Appliqué    | Un dépôt, plusieurs déploiements versionnés indépendamment (monorepo, [ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/) ; changesets).                                                                                                          |
| II. **Dependencies**          | Appliqué    | Déclarées et isolées (pnpm workspaces, lockfile, `~` sur les publiables — [ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/)).                                                                                                               |
| III. **Config**               | Appliqué    | Dans l'environnement (`$env/static\|dynamic`, `PUBLIC_*`, `.env*.example`) ; secrets jamais commités (`.gitignore`, gitleaks).                                                                                                                            |
| IV. **Backing services**      | Appliqué    | CRF, BaaS, télémétrie référencés par URL/credentials en env, interchangeables.                                                                                                                                                                            |
| V. **Build / release / run**  | Appliqué    | Build distinct du run (SvelteKit/tsup) ; **chaque unité déployable a une image** multi-stage (5 apps + service), publiée sur GHCR et fumée en CI ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)).                                            |
| VI. **Processes** (stateless) | Partiel     | Sessions via cookie/backing service. **Écart** : quelques états en mémoire (rate-limit de log) au niveau module.                                                                                                                                          |
| VII. **Port binding**         | Appliqué    | Le service Hono et les apps (adapter-node) lisent `PORT`/`HOST` en env ; chaque image expose son port et déclare un `HEALTHCHECK`. Containerisation autonome pour toutes les unités.                                                                      |
| VIII. **Concurrency**         | Écart       | Caches écrits dans des **fichiers JSON locaux** sans verrou (`atlas-dashboard`, `crf-dashboard`) : non sûr en multi-instance.                                                                                                                             |
| IX. **Disposability**         | Appliqué    | Les apps SvelteKit gèrent l'arrêt ; le service Hono ferme proprement son serveur sur SIGTERM/SIGINT (`services/crf/src/server/shutdown.ts`, arrêt idempotent qui draine les connexions).                                                                  |
| X. **Dev/prod parity**        | Appliqué    | Sandboxes Docker reproduisent les backing services ; `.nvmrc` figé au patch (`24.15.0`), aligné sur `ARG NODE_VERSION` des images et `engines.node` des unités ; image de prod pour chaque unité déployable.                                              |
| XI. **Logs**                  | Partiel     | Logs applicatifs vers stdout. **Écart** : `crf-logs` **persiste des logs dans des fichiers** (`.crf-stats.json`) au lieu d'un flux.                                                                                                                       |
| XII. **Admin processes**      | Partiel     | Tâches one-off via les CLIs (`cli/*`) et scripts de bootstrap. **Écart** : pas de pattern explicite pour les tâches d'admin en production.                                                                                                                |
| _ext._ **API-first**          | Partiel     | Contrats OpenAPI (`services/crf`, `crf-openapi`). **Écart** : générés depuis le code, pas de politique « contrat d'abord » actée.                                                                                                                         |
| _ext._ **Observabilité**      | Partiel     | OpenTelemetry sur `services/crf` (`telemetry.ts`), Sentry sur 3 apps. **Écart** : non généralisé, aucune métrique.                                                                                                                                        |
| _ext._ **Sécurité / auth**    | Appliqué    | Cookies durcis, CSP (`sveltekit-csp`), en-têtes, auth des apps ; le **service CRF exige un `Bearer` sur `/api/*`** (middleware dédié, secret en env, comparaison en temps constant — [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/)). |
| _ext._ **Données stateful**   | Non applic. | Gestion stateful (Postgres/pgvector, mart Parquet ré-dérivable) **conçue** ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) mais pas encore implémentée.                                                                         |

Les écarts ci-dessus sont **tracés** comme issues de suivi (milestone
_Transverse — Qualité applicative_) ; aucun n'est bloquant pour l'usage actuel
sur fixtures, mais ils cadrent le durcissement avant un déploiement multi-instance.

## Ce qui n'est pas encore appliqué

Par souci d'honnêteté, ces disciplines sont **conçues mais pas encore
implémentées** dans le dépôt — elles relèvent du
[pipeline de collaborations](/atlas/decisions/0029-architecture-pipeline-collaborations)
et de son [plan d'exécution](/atlas/plans/2026-06-02-pipeline-collaborations) :

- **DataOps** (orchestration, transformations, qualité et lignage des données),
- **MLOps** (entraînement, suivi et déploiement d'un modèle),
- **GitOps** (réconciliation déclarative d'une infrastructure Kubernetes),
- **IA** (recommandation par embeddings et modèle de langage local).

Elles apparaîtront dans ce bilan au fur et à mesure de leur mise en œuvre.
