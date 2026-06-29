---
title: Normes et pratiques appliquées
---

Cette page dresse le **bilan des pratiques d'ingénierie** réellement appliquées
dans le dépôt, discipline par discipline. Elle ne décrit que ce qui est **en
place et vérifiable aujourd'hui** : chaque pratique renvoie à un fichier ou un
mécanisme concret du dépôt. La plateforme de données (DataOps, ingestion,
modèle) y figure désormais, **écarts compris**, depuis sa mise en œuvre ; seules
les disciplines restées à l'état de conception sont signalées comme telles
(section [« Ce qui n'est pas encore appliqué »](#ce-qui-nest-pas-encore-appliqué)).

## DevSecOps

Le [**DevSecOps**](/atlas/glossary/) couvre ici le dépôt
entier ([ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die)) : la
sécurité et la qualité sont intégrées à la chaîne de livraison, pas ajoutées après
coup.

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

| Pratique                     | Comment c'est appliqué                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Convention de commits**    | Conventional Commits à scopes restreints — [ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints).                                                                                                |
| **Protection de branche**    | `main` protégée, PR à jour requise — [ADR 0016](/atlas/decisions/0016-branch-protection-main).                                                                                                                      |
| **Couverture de tests**      | Mesurée par vitest, agrégée et seuillée — `audit:` + le [tableau de bord](/atlas/quality/tableau-de-bord).                                                                                                          |
| **Structure du monorepo**    | Neuf catégories (huit Node enforcées par `audit:structure` + `dataops/` Python, exemptée) — [ADR 0002](/atlas/decisions/0002-monorepo-huit-categories), [ADR 0055](/atlas/decisions/0055-categorie-dataops-python). |
| **Code mort / duplication**  | knip (`audit:unused`) et jscpd (`audit:duplicates`).                                                                                                                                                                |
| **Budget de bundle**         | `size-limit` (`audit:size`) sur chaque paquet publiable.                                                                                                                                                            |
| **Documentation vérifiable** | La doc est un miroir contrôlable du code ; toute dérive casse la CI — [ADR 0028](/atlas/decisions/0028-documentation-verifiable).                                                                                   |
| **CI adaptative**            | Les jobs lourds se court-circuitent sur les PR documentaires — [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin).                                                                                          |

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

## Plateforme de données (DataOps)

Le **DataOps** applique au cycle de vie des données les mêmes garde-fous que le
DevSecOps applique au code : un pipeline reproductible, testé et tracé, qui
ingère, transforme et qualifie la donnée. Il vit dans `dataops/`, **catégorie
Python native** (uv/ruff/pytest) hors du graphe pnpm
([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)), structurée en deux
domaines : `citation` (collaborations OpenAlex) et `mediawatch` (veille GKG).

Quelques termes : un **asset Dagster** est une donnée nommée que l'orchestrateur
produit et suit ; un **asset check** est un contrôle de qualité rattaché à un
asset, qui passe ou bloque sa production ; **dbt** (_data build tool_) compile des
modèles SQL en couches (`staging` → `curated` → `marts`) ; le **lignage**
(_lineage_) est la traçabilité de bout en bout « d'où vient cette donnée ».

| Pratique                     | Comment c'est appliqué                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestration**            | Assets, jobs **et déclencheurs** (`@schedule` / `@sensor`) Dagster — `dataops/citation-dagster/src/citation_dagster/`, `dataops/mediawatch-dagster/src/mediawatch_dagster/` ; le CT (réentraînement déclenché) est **porté à parité aux deux pipelines** ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)). |
| **Transformations**          | Modèles dbt en couches `staging`/`curated`/`marts` — `dataops/citation-dbt/models/`, `dataops/mediawatch-dbt/models/`.                                                                                                                                                                                                          |
| **Ingestion massive**        | Snapshots S3 partitionnés (datalake JSONL.gz) — `assets/raw_snapshot.py` ([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)) ; collecte GKG mediawatch ([ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)).                                                                                             |
| **Qualité des données**      | Asset checks **Great Expectations** (bloquants), tests dbt, et **tests basés sur les propriétés** (Hypothesis) — [ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/).                                                                                                                                      |
| **Lignage**                  | Graphe d'assets Dagster + DAG dbt ; émission OpenLineage — `lineage.py`.                                                                                                                                                                                                                                                        |
| **Reproductibilité**         | Tests hermétiques, modèle d'embedding épinglé par révision et `sha256` (`scripts/fetch_model.py`, `model_provenance.py`) — [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/).                                                                                                                               |
| **Cache d'intégration**      | DataOps Python branchée sur le cache Turbo via `package.json` minimaux (`lint:py`, `test:py`) — [ADR 0066](/atlas/decisions/0066-cache-turbo-dataops/).                                                                                                                                                                         |
| **Garde-fou de déploiement** | Build → tag **immuable** → checks → poussée GitOps, confirmation humaine requise — `deploy/install.sh`, `deploy/validate.sh` ([ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)).                                                                                                                  |

### MLOps et modèle

Le **MLOps** (cycle de vie d'un modèle : entraînement, suivi, détection de
dérive, réentraînement) est en place au **niveau 1→2**
([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)) :

| Pratique                        | Comment c'est appliqué                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Suivi des runs (tracking)**   | MLflow — `tracking.py`, branché dans l'asset `researcher_embeddings` (paramètres, provenance du modèle, enregistrement).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Détection de dérive**         | Evidently sur les embeddings et les prédictions d'uplift — `assets/drift.py`, `assets/drift_uplift.py` ([ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Modèle prédictif**            | **`citation`** : modèle d'uplift FWCI (validation croisée honnête, porte de décision) — `assets/uplift.py`, `uplift_model.py` ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)). **`mediawatch`** : modèle **global** de prévision du volume d'articles (semaine/mois/trimestre), validation honnête **temporelle** (anti-fuite, baseline saisonnier naïf) et porte prédictif/descriptif — `forecast_model.py`, `assets/forecast.py` ([ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Entraînement continu (CT)**   | `transform_job` re-déclenché sans intervention par un **`@schedule`** (cron d'instance) et un **`@sensor`** sur l'avancée de l'ingestion, **les deux `STOPPED` par défaut** (le déployeur arme et fixe la cadence ; le code permet, n'impose pas). Porté **à parité aux deux pipelines `dataops/`** en respectant leur structure ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/), section « généralisation aux pipelines DataOps ») : **`citation`** (non partitionné) rejoue `transform_job` (dbt → embeddings → index) — schedule `transform_daily` (cron `CITATION_CT_CRON`) + sensor `transform_on_watermark_advance` (avancée du watermark `raw/_watermark.json`) ; **`mediawatch`** (partitionné par jour, **sans embeddings ni watermark** : la partition `dt=YYYY-MM-DD` **est** le curseur) rejoue la partition du jour — schedule `transform_daily` (cron `MEDIAWATCH_CT_CRON`) + sensor `transform_on_ingestion_advance` sur les partitions fraîchement ingérées (`raw/gkg/dt=…`), borné à N par tick (`MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK`). |
| **CT autonome (boucle fermée)** | **Les deux pipelines** : la dérive mesurée déclenche **automatiquement** le réentraînement — sensor `retrain_on_drift` **`RUNNING` par défaut** (le déployeur _désarme_ par env, ne _arme_ plus). Borné par une condition de **donnée neuve** (→ terminaison prouvée, pas d'emballement) + dédup + cooldown ; verdict de dérive persisté en S3, lu par le sensor. **`citation`** : signal de donnée neuve = watermark d'ingestion ; RGPD honoré par re-dérivation depuis `curated` filtré ([ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/)). **`mediawatch`** : signal = partitions GKG ingérées ([ADR 0082](/atlas/decisions/0082-boucle-fermee-drift-retrain-mediawatch/)).                                                                                                                                                                                                                                                                                                                                                                   |

**Les deux pipelines sont désormais instrumentés** : `citation` (embeddings +
modèle d'uplift) et `mediawatch` (modèle de prévision, [ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/))
tracent leurs runs dans MLflow et mesurent une dérive Evidently. La brique **CT**
(schedule + sensor) est portée à parité aux deux
([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)).

**État.** La boucle est **fermée et autonome sur les deux pipelines** : la dérive
mesurée déclenche automatiquement le réentraînement, active par défaut, bornée par une
condition de donnée neuve qui garantit la terminaison. `citation` se borne sur l'avancée
du watermark ([ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/)),
`mediawatch` sur l'avancée des partitions GKG ingérées
([ADR 0082](/atlas/decisions/0082-boucle-fermee-drift-retrain-mediawatch/)). Le MLOps
niveau 2 _autonome_ est désormais atteint à parité.

## Cloud-native : 12 facteurs + extensions

Les applications et le service du dépôt sont évalués au cadre
[**Twelve-Factor App**](https://12factor.net/) et à ses **extensions modernes**
(_Beyond the Twelve-Factor App_ : API-first, observabilité, sécurité, données).
Comme partout ici, on documente le **réel**, écarts compris — passer cet audit
n'est pas une affirmation de conformité.

| Facteur                       | État     | Comment / écart                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. **Codebase**               | Appliqué | Un dépôt, plusieurs déploiements versionnés indépendamment (monorepo, [ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/) ; changesets).                                                                                                                                                                                                                                                                                                                                  |
| II. **Dependencies**          | Appliqué | Déclarées et isolées (pnpm workspaces, lockfile, `~` sur les publiables — [ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/)).                                                                                                                                                                                                                                                                                                                                       |
| III. **Config**               | Appliqué | Dans l'environnement (`$env/static\|dynamic`, `PUBLIC_*`, `.env*.example`) ; secrets jamais commités (`.gitignore`, gitleaks).                                                                                                                                                                                                                                                                                                                                                    |
| IV. **Backing services**      | Appliqué | CRF, BaaS, télémétrie référencés par URL/credentials en env, interchangeables.                                                                                                                                                                                                                                                                                                                                                                                                    |
| V. **Build / release / run**  | Appliqué | Build distinct du run (SvelteKit/tsup) ; image multi-stage publiée sur GHCR et fumée en CI pour **les six apps et le service** (`atlas-dashboard`, `crf-dashboard`, `amarre`, `ecrin`, `find-an-expert`, `sillage`, `crf`) — `.github/workflows/images.yml` ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)). Images **signées, scannées et attestées** ([ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)).                                   |
| VI. **Processes** (stateless) | Partiel  | Sessions via cookie/backing service. **Écart** : quelques états en mémoire (rate-limit de log) au niveau module.                                                                                                                                                                                                                                                                                                                                                                  |
| VII. **Port binding**         | Appliqué | Le service Hono et les apps (adapter-node) lisent `PORT`/`HOST` en env ; **toutes les images** (six apps + service) exposent leur port et déclarent un `HEALTHCHECK`, fumé en CI.                                                                                                                                                                                                                                                                                                 |
| VIII. **Concurrency**         | Partiel  | Le state partagé (coordination des actualisations de cache) passe par une **interface injectable** — `apps/atlas-dashboard/src/lib/refresh-coordinator.ts`, [ADR 0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/) — dont le défaut en mémoire reproduit le comportement mono-instance. **Écart** : un déploiement multi-instance requiert d'injecter une implémentation adossée à un backing-service partagé (verrou + clé d'horodatage), pas encore fournie. |
| IX. **Disposability**         | Appliqué | Les apps SvelteKit gèrent l'arrêt ; le service Hono ferme proprement son serveur sur SIGTERM/SIGINT (`services/crf/src/server/shutdown.ts`, arrêt idempotent qui draine les connexions).                                                                                                                                                                                                                                                                                          |
| X. **Dev/prod parity**        | Appliqué | Sandboxes Docker reproduisent les backing services ; `.nvmrc` figé au patch (`24.18.0`), aligné sur `ARG NODE_VERSION` des images et `engines.node` des unités. Une image de prod existe pour **chaque app et le service**.                                                                                                                                                                                                                                                       |
| XI. **Logs**                  | Partiel  | Logs applicatifs vers stdout. **Écart** : `crf-logs` **persiste des logs dans des fichiers** (`.crf-stats.json`) au lieu d'un flux.                                                                                                                                                                                                                                                                                                                                               |
| XII. **Admin processes**      | Partiel  | Tâches one-off via les CLIs (`cli/*`) et scripts de bootstrap. **Écart** : pas de pattern explicite pour les tâches d'admin en production.                                                                                                                                                                                                                                                                                                                                        |
| _ext._ **API-first**          | Partiel  | Contrats OpenAPI (`services/crf`, `crf-openapi`). **Écart** : générés depuis le code, pas de politique « contrat d'abord » actée.                                                                                                                                                                                                                                                                                                                                                 |
| _ext._ **Observabilité**      | Partiel  | OpenTelemetry sur `services/crf` (`telemetry.ts`) ; **Sentry (error-tracking) sur les 6 apps SvelteKit** (opt-in `SENTRY_DSN`/`PUBLIC_SENTRY_DSN`, no-op sans DSN). **Écart restant** : OpenTelemetry pas encore étendu aux apps, aucune métrique (Counter/Gauge/Histogram).                                                                                                                                                                                                      |
| _ext._ **Sécurité / auth**    | Appliqué | Cookies durcis, CSP (`sveltekit-csp`), en-têtes, auth des apps ; le **service CRF exige un `Bearer` sur `/api/*`** (middleware dédié, secret en env, comparaison en temps constant — [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/)).                                                                                                                                                                                                                         |
| _ext._ **Données stateful**   | Appliqué | DataOps implémentée : marts dbt ré-dérivables, embeddings `vector(384)` (pgvector), snapshots S3 et migrations versionnées ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/), [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/), [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) — voir la section [Plateforme de données (DataOps)](#plateforme-de-données-dataops).                                                          |

Les écarts restants sont **tracés** comme issues de suivi (milestone
_Transverse — Qualité applicative_) — notamment la généralisation de la
télémétrie ([#309](https://github.com/univ-lehavre/atlas/issues/309)) et le
passage des logs `crf-logs` en flux stdout
([#305](https://github.com/univ-lehavre/atlas/issues/305)). Aucun n'est bloquant
pour l'usage actuel, mais ils cadrent le durcissement avant un déploiement
multi-instance.

## Ce qui n'est pas encore appliqué

Le **DataOps**, le **MLOps** et le volet **IA** (embeddings, modèle d'uplift),
naguère seulement conçus, sont désormais en place et figurent dans le bilan
ci-dessus, écarts compris. Restent à ce jour **partiels ou hors de ce dépôt** :

- **GitOps** (réconciliation déclarative d'une infrastructure Kubernetes) — Atlas
  en produit le **côté amont** : manifestes kustomize (`dataops/*/deploy/`), tags
  d'images immuables et poussée déclenchant la réconciliation
  ([ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)).
  L'**opérateur de réconciliation** (Argo CD) et la topologie cible vivent dans le
  dépôt `cluster`, **hors du périmètre de ce dépôt**.

Ces éléments apparaîtront — ou se compléteront — dans ce bilan au fur et à mesure
de leur mise en œuvre.
