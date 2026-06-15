---
title: "Audit de maturité (4 référentiels) — 2026-06-15"
---

> Date de l'audit : 2026-06-15. Méthode : workflow multi-agents. Quatre
> référentiels de maturité ont été évalués en parallèle, chaque niveau étant
> prouvé par le code (chemins `fichier:ligne`, noms de workflows, ou **absence
> constatée** d'un fichier attendu), puis soumis à une **contestation
> adversariale** par un second agent qui rouvre les preuves. Les niveaux
> présentés ci-dessous sont les niveaux **post-contestation** : plusieurs
> verdicts initiaux ont été rétrogradés (DORA Test automation, sécurité
> CNCF/SLSA images) ou requalifiés (résilience CNCF, provenance MLOps), et une
> preuve chiffrée non reproductible a été retirée.

## Objet et méthode

Ce rapport fige, au 2026-06-15, le niveau de maturité du dépôt `atlas` mesuré
contre quatre référentiels reconnus :

1. **DORA** (_DevOps Research and Assessment_ : quatre métriques clés et
   vingt-quatre capacités) croisé avec **SPACE** (cadre multidimensionnel de
   productivité : _Satisfaction, Performance, Activity, Communication &
   collaboration, Efficiency & flow_) ;
2. **MLOps maturity** (_Machine Learning Operations_) selon les échelles
   **Google** (0–2) et **Microsoft Azure** (0–4) ;
3. **CNCF CNMM** (_Cloud Native Computing Foundation — Cloud Native Maturity
   Model_ : Build → Operate → Scale → Improve → Optimize) croisé avec
   **Well-Architected** ;
4. **SLSA** (_Supply-chain Levels for Software Artifacts_ : Build track L0–L4)
   croisé avec **OWASP SAMM** (_Software Assurance Maturity Model_ : Governance,
   Design, Implementation, Verification, Operations ; niveaux 1–3) et son
   extension **DSOMM** (_DevSecOps Maturity Model_).

Quelques acronymes transverses utilisés ci-après : **CI/CD** (_Continuous
Integration / Continuous Delivery_), **CT** (_Continuous Training_, recalcul
automatique d'un modèle ou d'embeddings sur arrivée de données), **CFR** (_Change
Failure Rate_), **MTTR** (_Mean Time To Restore_), **SAST/DAST** (_Static /
Dynamic Application Security Testing_), **SBOM** (_Software Bill of Materials_),
**SLO** (_Service Level Objective_), **HPA/PDB** (_Horizontal Pod Autoscaler /
Pod Disruption Budget_), **ADR** (_Architecture Decision Record_).

**Cadre structurant — système à deux dépôts.** `atlas` est le côté **applicatif**
d'un système dont le déploiement, l'orchestration, l'observabilité déployée, le
GitOps réconciliateur, l'autoscaling et le maillage réseau vivent dans le dépôt
`cluster` (frontière actée par [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
et 0042). Un axe noté « hors-périmètre » n'est donc **pas un échec** d'`atlas`
mais une frontière de responsabilité ; il devra être évalué côté `cluster`. Toute
métrique exigeant une boucle de feedback de production (CFR, MTTR, dérive,
adoption) est par construction **non observable** depuis ce seul dépôt.

## 1. DORA + SPACE

**Niveau retenu (post-contestation) : DORA _High_, confirmé — pas _Elite_.** Le
delivery frôle l'Elite (lead time, version control, CI, trunk-based) mais le
dépôt est plafonné à _High_ par l'absence structurelle de boucle d'exploitation :
CFR et MTTR ne sont pas observables, faute d'observabilité et de déploiement
runtime dans `atlas`. SPACE : _Activity / Communication / Efficiency_ forts et
vérifiables ; _Performance_ proxiée ; _Satisfaction_ non observable (mainteneur
unique, _bus factor_ 1).

### Scorecard DORA + SPACE

| Dimension                                                  | Niveau retenu                                         | Preuve                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment frequency (DORA 1) — cadence de **publication** | Elite (publication) / N.A. runtime                    | `release.yml:9-13` auto-publie npm + GitHub Packages à chaque merge consommant un changeset ; `images.yml:11-24` build+push GHCR. `release.yml` 20/20 runs réussis. Cadence pluri-quotidienne (≈348 commits/30 j). **Aucun** déploiement runtime depuis `atlas` (`docs.yml` seul `environment`, GitHub Pages).                                                                                                                                              |
| Lead time for changes (DORA 2)                             | Elite (< 1 j, largement)                              | `gh pr list` (30 dernières PR) : médiane create→merge ≈ 0,3 h, 30/30 sous 24 h. Branches courtes ; lefthook bloque tout commit/push direct sur `main`.                                                                                                                                                                                                                                                                                                      |
| Change failure rate (DORA 3)                               | Non mesurable en prod (proxy faible)                  | Proxies git : 5 reverts / 1030 commits (≈0,5 %) ; CI `ci.yml` ≈22 % de runs rouges **captés avant merge** (gate, pas échec de déploiement). Pas de télémétrie de prod → CFR au sens DORA non observable.                                                                                                                                                                                                                                                    |
| Time to restore / MTTR (DORA 4)                            | Non observable — restauration **manuelle** documentée | Aucun monitoring de prod ni rollback dans les workflows. Runbook `docs/src/content/docs/quality/incident-response.md` (P0–P3 ; restauration via `npm deprecate` + patch surclassant, l.78 vérifiée). Tags GHCR immuables `sha-<…>` → re-pin manuel côté `cluster`.                                                                                                                                                                                          |
| Capacité — Continuous Integration                          | Elite                                                 | `ci.yml` : 9 checks (Lint, Typecheck, Test, Build, Audit, Documentation, Scan secrets, CodeQL, Review deps). CI path-adaptative ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)) sans « skipped ». Hooks lefthook locaux répliquent le gate.                                                                                                                                                                                                   |
| Capacité — Deployment automation                           | High (publish ; pas de CD runtime)                    | `release.yml` (changesets : version PR + publish + auto-merge) ; `images.yml` matrice 7 unités → GHCR (tag sha + sémver). Pas de déploiement progressif (canary/blue-green), pas de smoke post-déploiement runtime.                                                                                                                                                                                                                                         |
| Capacité — Trunk-based development                         | Elite                                                 | `lefthook.yml` refuse commit/push direct sur `main` ; branches courtes ; `main` protégé. Nuance : revue humaine non obligatoire (cf. gap _bus factor_).                                                                                                                                                                                                                                                                                                     |
| Capacité — **Test automation**                             | **Medium** _(rétrogradé de High)_                     | 264 `*.test.ts` ; `ci.yml` `coverage:report 40` (cible documentée 80). **Décisif** : `scripts/audit/coverage-report.mjs:271` **exclut du calcul les fichiers à 0 % stmts+funcs** (vérifié) → le code totalement non testé sort du dénominateur. Combiné aux exemptions (`cli`/`net`, `find-an-expert`) et à un E2E Playwright qui se déroule en « succès » sans rien tester quand la source REDCap est absente (`e2e.yml`, steps gardés sur disponibilité). |
| Capacité — Test data management                            | Low/Medium                                            | Fixtures versionnées ; fixtures synthétiques + MinIO épinglé ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) ; modèle d'embedding par révision HuggingFace + sha256. Pas de stratégie de refresh/anonymisation outillée ; données REDCap réelles indisponibles en CI.                                                                                                                                                               |
| Capacité — Shift-left security                             | **High** _(rétrogradé d'Elite)_                       | Excellent côté **code/secrets/npm** : `codeql.yml`, `semgrep.yml`, `gitleaks.yml`, `dependency-review.yml`, `sbom.yml` (CycloneDX 1.6) ; provenance OIDC in-toto sur les paquets npm (`release.yml:25,41`). **Trou côté conteneurs** : 7 images GHCR ni signées (pas de cosign), ni scannées (pas de Trivy/Grype) — grep sur `.github/workflows` = aucun step réel (seules occurrences en commentaire). ZAP en `workflow_dispatch` seul.                    |
| Capacité — Version control / artefacts                     | Elite                                                 | Monorepo git, lockfile committé, 81 CHANGELOG, 64 ADR, actions tierces toutes épinglées par SHA, overrides sécurité scopés dans `pnpm-workspace.yaml`.                                                                                                                                                                                                                                                                                                      |
| Capacité — Monitoring & Observability                      | Low (dans `atlas`)                                    | Aucun monitoring applicatif/infra dans `atlas` (grep observ/monitor/alert = néant). `incident-response.md` renvoie les signaux vers consoles externes. Sentry intégré côté apps mais aucune boucle d'alerting/error-budget. **Principal verrou contre Elite.**                                                                                                                                                                                              |
| Capacité — Database change management                      | Low/Medium                                            | Schémas Postgres/pgvector côté dataops, mais pas de framework de migration versionné/testé en CI (ni flyway/liquibase/drizzle-kit migrate). Risque de dérive de schéma non gardée.                                                                                                                                                                                                                                                                          |
| Capacité — Loosely coupled architecture                    | High/Elite                                            | ≈52 workspaces pnpm, 8 catégories enforcées par `scripts/audit/workspace-structure.mjs` ([ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/)). Déploiement par unité (matrice `images.yml`). Couplage runtime aux plateformes tierces, `crf` fail-closed.                                                                                                                                                                                           |
| Capacité — Continuous delivery (pipeline robuste)          | High                                                  | Pipeline PR→CI(9 checks)→merge→version→publish→Release entièrement automatisé. Concurrency + cancel-in-progress + Turbo remote cache ([ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)). S'arrête à la publication d'artefacts.                                                                                                                                                                                                     |
| Capacité — Small batches / WIP visible                     | High                                                  | PR petites (médiane ≈0,3 h), lots numérotés ; `audit-reminder.yml` + `daily-review.yml` rendent la dette visible. Visibilité solo, pas de board d'équipe.                                                                                                                                                                                                                                                                                                   |
| Capacité — Change approval / dependency mgmt               | High                                                  | `dependabot.yml` (npm + github-actions, weekly, groupés) ; `dependabot-auto-merge.yml` ; `dependency-review.yml` bloque deps vulnérables/licences interdites. Approbation humaine non obligatoire (compensée par gates automatiques).                                                                                                                                                                                                                       |
| SPACE — Activity                                           | **Élevé (solo)** _(nuancé)_                           | Volume vérifiable : 1030 commits, 269 tags, 81 CHANGELOG, 64 ADR. Mais ≈842 commits = un seul humain (`pierre-olivier@chasset.net` + `chasset noreply`), 3 commits triviaux d'un second. Vélocité **individuelle soutenue, non extrapolable à une équipe**.                                                                                                                                                                                                 |
| SPACE — Communication & collaboration                      | Moyen/Élevé (asynchrone)                              | 64 ADR (Nygard léger) ; CODEOWNERS ; `pull_request_template.md` ; `daily-review.yml`. Communication = auto-documentation, pas échange d'équipe (revue croisée effective absente).                                                                                                                                                                                                                                                                           |
| SPACE — Efficiency & flow                                  | Élevé                                                 | CI path-adaptative ([ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)) ; jobs parallèles ([ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)) ; Turbo remote cache ; concurrency cancel-in-progress. Flakiness CI résiduelle (~22 %) interrompt parfois le flow.                                                                                                                                                            |
| SPACE — Performance (outcomes)                             | Proxié (pas d'outcome prod)                           | Proxies : release 20/20, 5 reverts/1030, gates qualité verts. Aucune mesure d'impact en prod → Performance SPACE non observable depuis le dépôt.                                                                                                                                                                                                                                                                                                            |
| SPACE — Satisfaction & well-being                          | Non observable                                        | Aucun artefact mesurable (pas de survey). Un seul contributeur ; _bus factor_ 1 signalé jusque dans CODEOWNERS.                                                                                                                                                                                                                                                                                                                                             |

**Corrections appliquées par la contestation.** (a) _Test automation_ rétrogradé
**High → Medium** : le gate de 40 % exclut le code zéro-couvert
(`coverage-report.mjs:271`), donc plus permissif qu'annoncé. (b) _Shift-left
security_ rétrogradé **Elite → High** : chaîne conteneurs nue (ni signature ni
scan). (c) La preuve chiffrée « 83 merges déclencheurs d'images/30 j » a été
**retirée** : non reproductible (67 merges/30 j réels) ; le palier Elite-en-
publication reste défendable sans elle. (d) ADR recomptés à **64** (le scorecard
disait 62).

## 2. MLOps maturity — Google (0–2) + Microsoft Azure (0–4)

**Niveau retenu (post-contestation) : Google MLOps niveau 1 ; Microsoft Azure
niveau 2/4 (_Automated Training_ partiel).** Inchangé après contestation — le
verdict global est sain et même prudent. Précision importante : c'est un pipeline
d'**embedding** (modèle pré-entraîné téléchargé, provenance figée → asset
`researcher_embeddings` → index pgvector), **pas** un pipeline d'**entraînement** ;
la notion de « CT » s'y entend comme recalcul d'embeddings, pas réapprentissage.
Côté `cluster` : MLOps absent **par conception** (substrat infra seulement).

### Scorecard MLOps

| Dimension                               | Niveau retenu                                            | Preuve                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provenance / versioning du modèle       | **Niveau 1 fort** _(requalifié, pas « au-delà »)_        | `dataops/citation-dagster/scripts/fetch_model.py:25-26` (révision HF épinglée par commit hash), `:30-47` (sha256 par fichier), `:66,72-77` (vérification bloquante). Modèle cuit dans l'image, zéro réseau runtime ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)/0059). **Plafonné** : provenance = sha256 figé dans un script, sans historique de runs ni registre — l'épinglage par hash est un socle de provenance, pas un dépassement de palier. |
| Tracking d'expériences / Model Registry | Absent (niveau 0)                                        | **Absence constatée** : aucun MLflow/W&B dans `pyproject.toml` ; grep `mlflow                                                                                                                                                                                                                                                                                                                                                                                                 | wandb | registry` = 0 hit hors [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/). L'ADR 0062 acte « Suivi de modèles & registre. Absent. ». |
| Orchestration du pipeline (DAG)         | Niveau 1 (asset-centric Dagster)                         | `definitions.py:123-138` `transform_job` enchaîne dbt → `researcher_embeddings` → manifests → `index_load` ; deps par AssetKey. Pas de CI/CD de la code-location (niveau 2 Google) — frontière `cluster`.                                                                                                                                                                                                                                                                     |
| Validation de données (quality gate)    | Niveau 1 fort (porte bloquante)                          | `quality.py:194-201` `ge_researcher_vectors` (blocking) valide dim=384 + norme L2 ; `index_load` gated par complétude. Valide la **donnée** (schéma/bornes), pas la **performance** du modèle.                                                                                                                                                                                                                                                                                |
| Détection de dérive (drift)             | Absent (niveau 0)                                        | **Absence constatée** : pas d'Evidently, aucun asset check de drift ; [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) « Détection de dérive. Absente. ». Bloque le niveau 4 Microsoft.                                                                                                                                                                                                                                                                    |
| Continuous Training (CT) déclenché      | Niveau 0→1 partiel : **job présent, déclencheur absent** | `transform_job` existe mais **grep `@schedule`/`@sensor` dans dataops = 0** (vérifié) → recalcul 100 % manuel. C'est le verrou qui plafonne Google à 1.                                                                                                                                                                                                                                                                                                                       |
| Lineage / traçabilité                   | Niveau 1 (émission manuelle)                             | `researcher_embeddings.py:182,222` et `index_load.py:117-123` émettent OpenLineage→Marquez ; no-op si `OPENLINEAGE_URL` absent. Lineage **data-centric**, pas lineage de modèle.                                                                                                                                                                                                                                                                                              |
| Reproductibilité / déterminisme         | Niveau 1 fort                                            | `embedding.py:79-85` onnxruntime 1-thread + `ORT_SEQUENTIAL` ; partition immuable par `run_id` ; parité stricte avec le code TS de référence. CI rejoue le modèle (`ci.yml`, assert de hash canonique en `test_researcher_embeddings.py`).                                                                                                                                                                                                                                    |
| CI/CD du code ML & serving              | Niveau 1 (CI du code) ; serving non versionné            | `ci.yml` job DataOps : fetch modèle puis ruff+pytest, seuil `--cov-fail-under=90` (`pyproject.toml`). Serving = `index_load` vers pgvector avec contrat manifest validé. Pas de modèle servi versionné/rollback (KServe) — hors V1.                                                                                                                                                                                                                                           |

**Correction appliquée par la contestation.** Seule l'étiquette de _Provenance_ a
été requalifiée (**« Fort, au-delà du niveau 1 » → « Niveau 1 fort, plafonné »**) :
l'épinglage par hash établit l'intégrité d'un téléchargement figé, pas un palier
supérieur — ce sont le registre et l'historique de runs (absents) qui
distingueraient les niveaux suivants. [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)
est un **plan** (non encore codé) ; il ne relève donc pas le niveau **actuel**.

## 3. CNCF Cloud Native Maturity Model + Well-Architected

**Niveau retenu (post-contestation) : Niveau 1 « Build » consolidé, débordant sur
L2 « Operate » côté code/dépendances npm — _pas_ côté artefact conteneur.** Le
cadrage « côté applicatif d'un système à deux dépôts » est exact et vérifié (1
seul Deployment, 0 Argo Application, 0 HPA/PDB/NetworkPolicy dans `atlas`). Le
scorecard initial était plutôt prudent ; la contestation l'a jugé _trop sévère_
sur la résilience applicative et _légèrement trop généreux_ à nommer « Operate »
un axe sécurité dont l'artefact livré (l'image) n'est ni signé ni scanné.

### Scorecard CNCF + Well-Architected

| Dimension                           | Niveau retenu                                                         | Preuve                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conteneurisation                    | L2 Operate (solide)                                                   | 7 Dockerfiles ; patron production vérifié (`apps/atlas-dashboard/Dockerfile`, `services/crf/Dockerfile`) : multi-stage, base alpine pinnée par ARG, `USER node` non-root, HEALTHCHECK HTTP, config secrète au runtime. [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) fixe le patron. Pas de durcissement runtime _dans_ l'image (relève du Deployment côté cluster).                                                                                                                                           |
| Orchestration                       | Hors-périmètre — non démontré                                         | Un seul Deployment K8s : `dataops/citation-dagster/deploy/code-location.yaml` (`replicas:1`, readinessProbe tcpSocket seule, **aucun** resources requests/limits, **aucun** livenessProbe). [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)/0042 : orchestration côté `cluster`.                                                                                                                                                                                                                                 |
| Observabilité                       | L1→L2 partiel — **`/metrics` manquant**                               | crf instrumenté OpenTelemetry traces (`services/crf/src/server/telemetry.ts`, 1 span/requête) ; Sentry côté apps ; `/health` riche. **Écart contrat↔code** : aucun endpoint `/metrics` (grep `metrics\|prom-client\|ServiceMonitor` sur src = vide) alors qu'[ADR 0033:73](/atlas/decisions/0033-contrat-interface-cluster/) exige « chaque service expose `/metrics` et déclare un ServiceMonitor » (vérifié). Le ServiceMonitor du contrat cluster scrapperait du vide.                                                     |
| Sécurité applicative & supply-chain | **L2 côté code & deps npm / L1 côté artefact conteneur** _(nuancé)_   | CI sécurité dense (codeql security-extended + cron hebdo, semgrep p/owasp-top-ten, gitleaks, dependency-review fail-on high + allowlist licences, SBOM CycloneDX 1.6, provenance OIDC npm). **Deux absences dures confirmées** : images GHCR ni signées (cosign) ni dotées de provenance SLSA ; **aucun** scan de vulnérabilité d'image (Trivy/Grype) — grep `.github/workflows` = aucun step réel. SBOM jamais attaché à l'image.                                                                                            |
| GitOps / CD                         | L2 (artefacts) / L1 (déploiement réel)                                | CD d'artefacts solide (`images.yml` GHCR tag sha + sémver, jamais `latest` ; `release.yml` changesets). **Aucun** manifeste Argo CD Application dans `atlas` (grep `kind: Application` = vide, vérifié) alors qu'[ADR 0033:72](/atlas/decisions/0033-contrat-interface-cluster/) le prévoit. Le « continuous deployment » s'arrête au registry.                                                                                                                                                                               |
| Résilience / autoscaling            | **L1→L2 partiel — retry démontré** _(corrigé, scorecard trop sévère)_ | Hygiène 12-facteurs OK (graceful shutdown SIGTERM/SIGINT, config runtime fail-closed [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/), rate limiting). **Retry démontré** côté client REDCap : `packages/crf-client/src/client.ts:58-62` `retrySchedule` = `Schedule.exponential('100 millis')` ∘ `jittered` ∘ `recurs(3)`, appliqué via `Effect.retry` (`:82`) — vérifié. Déficits réels : `timeout` non câblé (pas d'AbortSignal), pas de circuit-breaker ; `replicas:1`, pas de HPA/PDB/resources (QoS). |
| Service mesh / mTLS                 | Hors-périmètre — non démontré                                         | Aucun sidecar/PeerAuthentication/SPIFFE ; auth service-à-service applicative (Bearer, [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/), `middleware/auth.ts`). Le mesh relève du dépôt `cluster`.                                                                                                                                                                                                                                                                                                           |
| People / Process / Policy           | L2 Operate (gouvernance remarquable)                                  | 64 ADR Nygard ; policy-as-code partielle (branch protection, checks non-skippables [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/), lefthook jamais bypassés, SLA remédiation, security champion, registre des drifts, revue quotidienne). Policy-as-code d'**infra** absente côté `atlas` (pas de Kyverno/OPA/Conftest ; kubeconform hors `ci.yml`).                                                                                                                                                             |

**Corrections appliquées par la contestation.** (a) _Résilience_ : le scorecard
niait à tort le retry — `crf-client/src/client.ts:58-82` le démontre ; le déficit
réel se limite au timeout non câblé, à l'absence de circuit-breaker et au volet
infra (replicas:1, pas de HPA/PDB). (b) _Sécurité_ : nuance « L2 code/deps, L1
artefact conteneur » (image ni signée ni scannée — confirmé). (c) ADR corrigés à
**64**.

## 4. SLSA L0–L4 + OWASP SAMM / DSOMM

**Niveau retenu (post-contestation) : SLSA Build L1 atteint _uniquement_ pour les
paquets npm ; les images conteneur sont à L0 ; Build L2 npm confirmé exact (pas
L3). SAMM : niveau 1 solide partout, Verification en 2 partiel, aucun domaine en 3.** La contestation a durci le scorecard initial : les images, données « L1 »,
sont en réalité **L0** (build scripté/hébergé mais **zéro provenance générée**).

### Scorecard SLSA + SAMM

| Dimension                                         | Niveau retenu                                                      | Preuve                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLSA Build L1 — provenance existe                 | **npm : atteint ; images : L0** _(rétrogradé de « npm + images »)_ | Build scripté/hébergé + actions épinglées par SHA partout. Provenance npm produite (`release.yml:25`). **Images = L0** : `images.yml` n'a aucun flag `provenance`/`sbom`/`attest` dans `build-push-action` (grep = 0) et `load:true` strippe les attestations buildx → **aucune** provenance image. L1 n'admet pas de demi-mesure.                                        |
| SLSA Build L2 — build hébergé + provenance signée | Atteint pour npm uniquement (confirmé)                             | npm : `release.yml:25` `NPM_CONFIG_PROVENANCE=true` + `id-token: write` (`:41`) → attestation in-toto OIDC signée par la plateforme, runner hébergé. Images : poussées sur GHCR **sans** signature ni attestation.                                                                                                                                                        |
| SLSA Build L3 — build durci/non-falsifiable       | **NON atteint** (revendiqué, non étayé)                            | `SECURITY.md:50` revendique « SLSA Build L3 » (vérifié) — mais le mécanisme réel (`NPM_CONFIG_PROVENANCE` via runners GitHub hébergés) = **L2** par construction ; pas de SLSA generator durci ni preuve d'isolation. Aucun ADR ne documente L3.                                                                                                                          |
| SLSA — épinglage des dépendances de build         | Partiel                                                            | Actions GitHub **toutes** épinglées par SHA. Mais images de base par **tag mutable**, pas digest : `FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}`, `FROM python:3.10-slim` (vérifié, tous Dockerfiles). `dependabot.yml` couvre npm + github-actions **seulement** (pas de `docker` ni `pip`, vérifié).                                                              |
| SBOM (transparency)                               | **Présent mais partiel et non lié** _(nuancé)_                     | `sbom.yml` CycloneDX 1.6 (cdxgen pinné), généré à chaque push main, uploadé en artefact 90 j. **Partiel** : `-t pnpm` → couvre **uniquement** l'arbre npm/pnpm (ni couches OS, ni Python dataops). Jamais attaché/signé à l'image ni à la release.                                                                                                                        |
| SAMM Governance                                   | Niveau 1 → 2 partiel                                               | `SECURITY.md` (politique + SLA 72 h/30 j/90 j), inventaire secrets/surfaces, [ADR 0027](/atlas/decisions/0027-security-champion/) (rôle défini mais **non attribué** nominativement). Niveau 2 plein = attribution + métriques de conformité + formation.                                                                                                                 |
| SAMM Design                                       | Niveau 1                                                           | Classification public/auth des endpoints, surfaces documentées, inventaire secrets, exigences applicatives (rate-limit, CSP, fail-closed [ADR 0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/)). Pas de threat model formel (STRIDE/data-flow).                                                                                                              |
| SAMM Implementation                               | Niveau 1 → 2 partiel                                               | Secure Build (CI complet, frozen-lockfile, smoke healthcheck) ; provenance npm ; pas de secret dans l'image ; Defect Management (SLA par sévérité, triages historisés). Niveau 2 manque : provenance/signature **et** scan des images.                                                                                                                                    |
| SAMM Verification                                 | **Niveau 2 partiel** _(nuancé, limite haute)_                      | SAST double (CodeQL security-extended + cron hebdo, Semgrep p/owasp-top-ten sur PR) ; gitleaks ; dependency-review (fail-on `high` — les `moderate` ne bloquent pas) ; tests requirements-driven (401/XSS/429 en vitest). **Architecture Assessment reste ad hoc (niveau 1)** ; DAST ZAP en `workflow_dispatch` seul (`zap-baseline.yml`, vérifié) ; pas de scan d'image. |
| SAMM Operations                                   | Niveau 1 → 2 partiel                                               | Incident Management (runbook `incident-response.md` P0–P3, procédure fuite secret) ; revues planifiées (`daily-review.yml` cron, `audit-reminder.yml` trimestriel) ; rotation des secrets documentée. Pas d'observabilité/alerting sécurité runtime côté dépôt (relève du déployeur).                                                                                     |

**Corrections appliquées par la contestation.** (a) **Images L1 → L0** :
incohérence interne du scorecard — sa propre preuve établit l'absence totale de
provenance image. (b) _SBOM_ : nuance « présent mais partiel (npm/pnpm seul, ni
OS ni Python) et non attaché ». (c) _Verification_ : « 2 plein → 2 partiel »
(Architecture Assessment reste en 1). (d) Le downgrade **L3 → L2** du scorecard
sur la provenance npm est confirmé exact.

## Top gaps priorisés (impact × effort)

Synthèse trans-référentiels, ordonnée par retour sur effort. Un même verrou —
l'absence de boucle d'exploitation et la chaîne conteneurs nue — alimente
plusieurs référentiels à la fois.

| #   | Gap                                                                                                                                                                                                                                                            | Impact | Effort | Référentiels touchés                                 | Preuve clé                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| G1  | **Images GHCR ni signées (cosign) ni dotées de provenance SLSA** : l'artefact réellement déployé (les apps tournent en conteneurs) n'est pas vérifiable.                                                                                                       | High   | M      | SLSA (images L0), CNCF (sécurité), DORA (shift-left) | `images.yml` build-push sans `cosign`/`attest`/flag `provenance` ; grep `.github/workflows` = 0 hit réel.                     |
| G2  | **Aucun scan de vulnérabilité d'image** (Trivy/Grype) avant push GHCR : les CVE des couches Alpine/Node/Python ne sont jamais évaluées sur le livrable.                                                                                                        | High   | **S**  | SLSA, CNCF, DORA                                     | grep `trivy\|grype\|scout\|snyk` sur `.github` = 0 ; SBOM npm-only. **Meilleur rapport impact/effort.**                       |
| G3  | **Aucune boucle d'exploitation observable depuis `atlas`** (ni monitoring/alerting applicatif, ni déploiement runtime, ni rollback) : plafonne DORA à _High_ (CFR/MTTR non observables).                                                                       | High   | XL     | DORA, CNCF (observabilité), SAMM (Operations)        | grep observ/monitor/alert/rollback = néant ; `docs.yml` seul `environment` ; `incident-response.md:78` restauration manuelle. |
| G4  | **`/metrics` Prometheus non implémenté** alors qu'[ADR 0033:73](/atlas/decisions/0033-contrat-interface-cluster/) l'exige : le ServiceMonitor du cluster scrapperait du vide (écart contrat↔code).                                                             | High   | M      | CNCF (observabilité), DORA                           | grep `metrics\|prom-client\|ServiceMonitor` sur src = vide (vérifié) ; contredit ADR 0033:73.                                 |
| G5  | **CT non déclenché** : `transform_job` sans `@schedule`/`@sensor` → recalcul d'embeddings 100 % manuel ; verrou qui maintient Google MLOps au niveau 1.                                                                                                        | High   | **S**  | MLOps (Google/Azure)                                 | grep `@schedule\|@sensor` dataops = 0 (vérifié) ; `definitions.py:123`.                                                       |
| G6  | **Aucun model tracking / registry** (MLflow) : provenance figée par sha256, zéro historique de runs ni modèle catalogué.                                                                                                                                       | High   | L      | MLOps                                                | Absence : `pyproject.toml` sans MLflow ; [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) « Absent ».      |
| G7  | **_Bus factor_ 1 sans revue obligatoire** : CODEOWNERS = tout `@chasset` ; le delivery rapide repose entièrement sur les gates automatiques, sans second regard humain sur les zones sensibles (auth, crf-client).                                             | High   | L      | DORA (trunk/approval), SPACE                         | CODEOWNERS (« bus-factor is currently 1 »).                                                                                   |
| G8  | **Détection de dérive absente** : aucune mesure de la dérive de distribution des embeddings entre snapshots → dégradation silencieuse.                                                                                                                         | High   | M      | MLOps                                                | Absence : pas d'Evidently ; [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) « Absente ».                  |
| G9  | **Couverture de tests à 40 % excluant le code zéro-couvert**, et E2E souvent en « succès » sans rien tester (REDCap absent) → angles morts d'intégration.                                                                                                      | Medium | M      | DORA (test automation), SAMM                         | `coverage-report.mjs:271` (exclusion 0 % vérifiée) ; `e2e.yml` steps gardés.                                                  |
| G10 | **Images de base par tag mutable + écosystème docker/pip absent de Dependabot** : builds non hermétiques, base images jamais re-pinnées (bloque SLSA L3).                                                                                                      | Medium | **S**  | SLSA, CNCF                                           | `FROM node:…-alpine…`, `FROM python:3.10-slim` (vérifié) ; `dependabot.yml` = npm + github-actions seulement.                 |
| G11 | **La seule charge K8s (citation-dagster) sans resources/limits, livenessProbe, PDB, HPA** ; `replicas:1` → point de défaillance unique, pas de QoS ni base d'autoscaling.                                                                                      | Medium | M      | CNCF (orchestration/résilience)                      | `code-location.yaml` (replicas:1, readinessProbe tcpSocket seule, aucun bloc resources).                                      |
| G12 | **Aucun manifeste Argo CD Application ni Deployment/Service/Ingress applicatif** livré par `atlas`, contrairement à [ADR 0033:72](/atlas/decisions/0033-contrat-interface-cluster/) : GitOps de l'applicatif non auto-décrit, coordination humaine non testée. | Medium | L      | CNCF (GitOps), DORA                                  | grep `kind: Application` = vide (vérifié) ; ADR 0033:103-106 (garde-fou « humain, pas mécanique »).                           |
| G13 | **Revendication « SLSA Build L3 » dans SECURITY.md non étayée** (mécanisme réel = L2), et aucun ADR ne documente le palier réellement atteint.                                                                                                                 | Low    | S      | SLSA (Governance/doc)                                | `SECURITY.md:50` ; grep `slsa\|cosign` dans `docs/.../decisions` = 0.                                                         |
| G14 | **DAST ZAP en `workflow_dispatch` manuel seul** : aucune exécution récurrente, donc aucune couverture dynamique continue (plafonne SAMM Verification).                                                                                                         | Medium | M      | SAMM, DORA                                           | `zap-baseline.yml` (`on: workflow_dispatch` seul, vérifié).                                                                   |
| G15 | **Schéma de base non géré par migrations versionnées/testées en CI** alors que des schémas pgvector sont introduits → risque de dérive non gardée.                                                                                                             | Medium | M      | DORA (DB change mgmt)                                | Aucun flyway/liquibase/drizzle-kit migrate dans scripts/workflows.                                                            |

**Lecture priorisée.** Les deux _quick wins_ à plus fort effet de levier sont
**G2** (scan d'image, effort S) et **G5** (déclencheur CT, effort S), qui font
chacun progresser deux référentiels pour un coût faible ; **G10** et **G13** sont
de petits durcissements supply-chain à coût marginal. À l'opposé, **G3**
(observabilité/runtime) est de loin le plus structurant mais d'effort XL et
partiellement **délégué au dépôt `cluster`** : il ne sera levé qu'en
instrumentant la boucle cross-dépôt, pas dans `atlas` seul.

## Note de méthode et limites

**Forces des preuves.** Trois des quatre métriques DORA de delivery sont
ancrées sur des faits reproductibles (lead time mesuré sur 30 PR réelles ;
cadence de publication via `release.yml`/`images.yml` + 20/20 runs release). Les
quatre scorecards reposent sur lecture directe du code et des workflows, et les
**absences** (cosign, Trivy, MLflow, Evidently, `@schedule`/`@sensor`, `/metrics`,
Argo Application) sont des absences **constatées par grep ciblé** sur des motifs
standards — fiables car le périmètre excluait `node_modules` et l'upstream
vendored. Les points décisifs de la contestation (exclusion 0 % en
`coverage-report.mjs:271`, retry `crf-client/src/client.ts:58-82`, revendication
L3 en `SECURITY.md:50`, 64 ADR) ont été **re-vérifiés indépendamment** lors de la
rédaction de ce rapport.

**Ce qui n'est pas observable sur un dépôt sans télémétrie de prod.**

1. **CFR et MTTR (DORA)** ne se mesurent pas : aucune télémétrie de production
   dans `atlas`, le runtime et l'observabilité vivant dans le dépôt `cluster`.
   Ils sont classés « non observables » plutôt que chiffrés.
2. **Lead time** mesuré création-PR→merge, **pas** idée→prod (le « prod »
   runtime étant hors dépôt) ; le délai commit→tag de release n'a pas été
   quantifié.
3. **Performance et Satisfaction (SPACE)** : aucun outcome de prod ni signal
   d'équipe ; la Satisfaction est intrinsèquement non instrumentable sur un
   dépôt mono-mainteneur (aucun survey).
4. **Dérive et performance modèle (MLOps)** : non mesurées (drift absent, pas de
   recall@k/NDCG sur jeu d'éval) ; les quality gates valident la donnée
   (dim=384, norme L2), pas la performance du modèle.

**Limites assumées.** (a) Les paramètres de **branch protection** côté serveur
GitHub (`required_status_checks`, `required_approving_review_count`,
`enforce_admins`) proviennent d'un appel API non rejouable en lecture seule du
dépôt ; ils sont à traiter comme une **affirmation non re-vérifiée** ici — seul
CODEOWNERS (« bus-factor 1 ») et les hooks lefthook sont vérifiables localement.
(b) Les pipelines n'ont **pas été exécutés** ; l'évaluation des gates et des
paliers SLSA porte sur la **définition** des workflows et les conclusions de
runs, pas sur l'inspection d'un artefact de provenance réel — or un palier SLSA
se prouve _in fine_ sur l'artefact. (c) Les 264 fichiers de test ont été comptés,
**pas** audités en qualité d'assertion. (d) [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)
est un **plan** (code non écrit) : il ne relève pas le niveau MLOps actuel.
(e) Le dépôt `cluster` (orchestration, observabilité déployée, GitOps
réconciliateur, mesh, durcissement runtime) n'a **pas** été exploré : les axes
notés « hors-périmètre » devront être évalués là-bas pour scorer le **système
complet**, dont `atlas` n'est que le côté applicatif.

**Suivi.** Conformément à la convention des audits, ce rapport est **figé** : il
décrit l'état au 2026-06-15. Les findings actionnables (G1–G15) ouvrent des
issues GitHub (`enhancement` / `tech-debt`) ou un ADR lorsque la résolution
implique une décision structurante (notamment G3, G6, G12). Un futur audit
produira un nouveau rapport daté.
