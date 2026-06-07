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

Le **DevSecOps** est une approche qui intègre la sécurité à _toutes_ les étapes
du développement (code, tests, intégration, livraison) plutôt que de la traiter
comme un contrôle final séparé : ici, la sécurité et la qualité sont intégrées à
la chaîne de livraison, pas ajoutées après coup. Le périmètre couvre le dépôt
entier ([ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die)).

Chaque ligne du tableau ci-dessous est une **pratique de sécurité** automatisée.
Voici ce que chacune vérifie et pourquoi elle compte :

- **Analyse statique (SAST, _Static Application Security Testing_)** — analyse le
  code source **sans l'exécuter**, à la recherche de motifs de vulnérabilités
  (injections, données utilisateur mal validées, expressions régulières
  coûteuses…). C'est important parce que ces défauts sont attrapés _avant_ même
  que le code tourne, donc au coût de correction le plus bas. Atlas en utilise
  **deux** outils complémentaires : **CodeQL** (moteur de GitHub qui représente
  le code en base de données interrogeable) et **Semgrep** (règles par motifs,
  dont l'OWASP Top 10) — voir la page [CI](/atlas/quality/ci-pipeline/) pour la
  différence entre les deux.
- **Détection de secrets** — recherche les mots de passe, jetons d'API et clés
  privées **accidentellement écrits dans le code** (outil **gitleaks**). À quoi
  ça sert : un secret commité reste dans l'historique Git même après suppression
  et peut être exploité par quiconque lit le dépôt ; le détecter au plus tôt
  évite une fuite durable.
- **Analyse des dépendances** — inspecte les bibliothèques tierces que le projet
  installe, pour repérer celles qui ont une **vulnérabilité connue** ou une
  **licence incompatible**. Important parce que l'essentiel du code qui s'exécute
  en production vient de ces dépendances, pas du code maison.
- **Test dynamique (DAST, _Dynamic Application Security Testing_)** — sonde une
  application **en cours d'exécution** (outil OWASP ZAP, en mode _baseline_,
  c'est-à-dire passif et non agressif) à la recherche de configurations
  défaillantes (en-têtes de sécurité manquants, cookies non protégés…). Complète
  le SAST, qui ne voit que le code au repos.
- **SBOM (_Software Bill of Materials_)** — une **nomenclature logicielle** :
  l'inventaire exhaustif et horodaté de toutes les dépendances embarquées. Sert,
  en cas d'alerte sur une bibliothèque, à savoir immédiatement si le projet est
  concerné et où.
- **Provenance des artefacts** — une **attestation cryptographique** liant chaque
  paquet publié à son code source et au _workflow_ qui l'a construit, signée via
  OIDC. Permet à qui installe le paquet de vérifier qu'il n'a pas été falsifié.
- **SLA de remédiation** — les délais maximaux de correction d'un problème de
  sécurité (_finding_) selon sa gravité. Garantit qu'un défaut détecté n'est pas
  laissé sans suite.

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

La chaîne de garde-fous s'exécute en local (via les **hooks Git** — des scripts
que Git lance automatiquement à des moments précis, par exemple avant un _commit_
ou un _push_, pour bloquer du code non conforme) **et** en intégration continue
(_CI_ : les mêmes vérifications rejouées sur les serveurs de GitHub à chaque
proposition de modification), et n'est jamais contournée
([ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass)).

Quelques termes employés dans le tableau : un **commit** est un enregistrement
daté d'un lot de modifications ; une **branche** est une ligne de travail isolée ;
`main` est la branche de référence du projet. Les outils nommés —
[**knip**](/atlas/glossary/) (détecte le _code mort_ : exports, imports et
fichiers jamais utilisés), [**jscpd**](/atlas/glossary/) (détecte le
_copier-coller_, c'est-à-dire les blocs dupliqués) et **size-limit** (vérifie
que la taille des fichiers livrés au navigateur ne dépasse pas un budget) —
servent tous à empêcher la dette technique de s'accumuler silencieusement.

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

| Facteur                       | État        | Comment / écart                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. **Codebase**               | Appliqué    | Un dépôt, plusieurs déploiements versionnés indépendamment (monorepo, [ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/) ; changesets).                                                                                                                                                                                                               |
| II. **Dependencies**          | Appliqué    | Déclarées et isolées (pnpm workspaces, lockfile, `~` sur les publiables — [ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/)).                                                                                                                                                                                                                    |
| III. **Config**               | Appliqué    | Dans l'environnement (`$env/static\|dynamic`, `PUBLIC_*`, `.env*.example`) ; secrets jamais commités (`.gitignore`, gitleaks).                                                                                                                                                                                                                                 |
| IV. **Backing services**      | Appliqué    | CRF, BaaS, télémétrie référencés par URL/credentials en env, interchangeables.                                                                                                                                                                                                                                                                                 |
| V. **Build / release / run**  | Partiel     | Build distinct du run (SvelteKit/tsup) ; image multi-stage publiée sur GHCR et fumée en CI pour `atlas-dashboard`, `crf-dashboard` et le service ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)). **Écart** : 4 apps à secrets `static/private` restent à migrer pour être imageables ([#324](https://github.com/univ-lehavre/atlas/issues/324)). |
| VI. **Processes** (stateless) | Partiel     | Sessions via cookie/backing service. **Écart** : quelques états en mémoire (rate-limit de log) au niveau module.                                                                                                                                                                                                                                               |
| VII. **Port binding**         | Partiel     | Le service Hono et les apps (adapter-node) lisent `PORT`/`HOST` en env ; les images de `atlas-dashboard`, `crf-dashboard` et du service exposent leur port et déclarent un `HEALTHCHECK`. **Écart** : 4 apps pas encore imageables ([#324](https://github.com/univ-lehavre/atlas/issues/324)).                                                                 |
| VIII. **Concurrency**         | Écart       | Caches écrits dans des **fichiers JSON locaux** sans verrou (`atlas-dashboard`, `crf-dashboard`) : non sûr en multi-instance.                                                                                                                                                                                                                                  |
| IX. **Disposability**         | Appliqué    | Les apps SvelteKit gèrent l'arrêt ; le service Hono ferme proprement son serveur sur SIGTERM/SIGINT (`services/crf/src/server/shutdown.ts`, arrêt idempotent qui draine les connexions).                                                                                                                                                                       |
| X. **Dev/prod parity**        | Partiel     | Sandboxes Docker reproduisent les backing services ; `.nvmrc` figé au patch (`24.15.0`), aligné sur `ARG NODE_VERSION` des images et `engines.node` des unités. **Écart** : image de prod pour 3 unités ; 4 apps en attente de migration ([#324](https://github.com/univ-lehavre/atlas/issues/324)).                                                           |
| XI. **Logs**                  | Partiel     | Logs applicatifs vers stdout. **Écart** : `crf-logs` **persiste des logs dans des fichiers** (`.crf-stats.json`) au lieu d'un flux.                                                                                                                                                                                                                            |
| XII. **Admin processes**      | Partiel     | Tâches one-off via les CLIs (`cli/*`) et scripts de bootstrap. **Écart** : pas de pattern explicite pour les tâches d'admin en production.                                                                                                                                                                                                                     |
| _ext._ **API-first**          | Partiel     | Contrats OpenAPI (`services/crf`, `crf-openapi`). **Écart** : générés depuis le code, pas de politique « contrat d'abord » actée.                                                                                                                                                                                                                              |
| _ext._ **Observabilité**      | Partiel     | OpenTelemetry sur `services/crf` (`telemetry.ts`), Sentry sur 3 apps. **Écart** : non généralisé, aucune métrique.                                                                                                                                                                                                                                             |
| _ext._ **Sécurité / auth**    | Appliqué    | Cookies durcis, CSP (`sveltekit-csp`), en-têtes, auth des apps ; le **service CRF exige un `Bearer` sur `/api/*`** (middleware dédié, secret en env, comparaison en temps constant — [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/)).                                                                                                      |
| _ext._ **Données stateful**   | Non applic. | Gestion stateful (Postgres/pgvector, mart Parquet ré-dérivable) **conçue** ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) mais pas encore implémentée.                                                                                                                                                                              |

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
