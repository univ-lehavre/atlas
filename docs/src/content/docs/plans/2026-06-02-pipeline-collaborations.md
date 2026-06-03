---
title: Plan — Pipeline de collaborations entre chercheurs (V1, plateforme DataOps)
---

> Date du plan : 2026-06-02. Socle décisionnel : [ADR 0029](../decisions/0029-architecture-pipeline-collaborations) (architecture de la plateforme DataOps) + [ADR 0030](../decisions/0030-rgpd-profilage-collaborations) (gate RGPD, profilage) + ADR cluster [0016](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0016-observabilite.md) (observabilité, palier 2 déclenché), [0011](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0011-registry-http-sans-auth.md) (registry HTTP), [0004](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0004-erasure-coding-2plus1-datalake.md) (EC 2+1), [0002](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0002-control-plane-unique-avec-endpoint.md) (control-plane unique), [0003](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0003-pas-de-chiffrement-ceph-tailscale.md) (pas de TLS interne), [0019](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0019-durcissement-reseau-cilium.md) (réseau Cilium default-deny).

## Introduction

### Objectif

Livrer la **V1 du pipeline de recommandation de collaborations** sous la forme d'une **plateforme DataOps alignée sur les standards du marché**, et non d'une ossature minimale. Le démonstrateur incarne littéralement le profil attendu par la fiche `dataops` :

> « Pipeline lakehouse de démonstration : ingestion → DuckDB/Iceberg sur le S3 Ceph du cluster, transformations **dbt**, orchestration **Dagster**, lineage **OpenLineage**. »

Concrètement, un flux **batch mensuel orchestré par Dagster** ingère les métadonnées de publications (source bibliographique OpenAlex) **plus** leurs références (`referenced_works`), les transforme via **dbt (`dbt-duckdb`)** en couches `staging → curated → marts`, dérive un signal de **citations croisées article↔article** entre chercheurs (modèle dbt + SQL), produit un **mart Parquet + `manifest.json`** sur le S3 Ceph, **alimente un index PostgreSQL/pgvector** (FTS lexical + recherche sémantique), score les paires de façon **déterministe** (poids fixes `EnsembleWeights`), et expose le résultat via `atlas-api` (Hono + OpenAPI 3.1 + Scalar — **rôle métier ET rôle exploration/vérification**) et une **PWA** `find-an-expert`. Qualité par **Great Expectations** (en complément des tests dbt), lineage par **OpenLineage → Marquez**. Le tout posé sur un socle cluster relevé (ingress + TLS + GitOps + Prometheus complet + CloudNativePG + Dagster).

Ce que la V1 **n'est pas** : un système de ML entraîné/calibré (MLflow), un LLM génératif synchrone, un feature store (Feast), un format de table transactionnel (Iceberg), un serving versionné (KServe). Ces briques sont nommées au [Palier 2](#palier-2--hors-v1-en-ligne-de-mire) et explicitement hors périmètre.

### Périmètre — `atlas` vs `cluster`

- **Dépôt `atlas`** (ce dépôt) : les ADR 0029/0030 ; l'asset Dagster d'ingestion (réutilise `citation-fetch` _tel quel_) ; l'ingestion **neuve** des `referenced_works` ; l'accès lakehouse DuckDB↔S3↔Parquet (httpfs/secret RGW/COPY, **neuf**) ; les **modèles dbt** (`staging`/`curated`/`marts`) dont la **feature citations croisées** ; le contrat `manifest.json` + partitions immuables + `schema_version` (validateur dans `packages/citation`) ; les suites **Great Expectations** ; le **chargement de l'index Postgres/pgvector** ; le 3ᵉ signal sur `EnsembleWeights` ; `atlas-api` (métier + exploration) ; les résumés extractifs ; la PWA `find-an-expert` ; la signature d'images. **Seuls les manifestes _applicatifs_** (Deployment/Service/Ingress/`Application` Argo CD de ses propres composants, définitions d'assets Dagster) vivent ici.
- **Dépôt `cluster`** (séparé, `../cluster`) : **tout l'addon d'infrastructure** — ingress-nginx, cert-manager, MetalLB, Argo CD, kube-prometheus-stack, Loki, **CloudNativePG**, **Dagster (`dagster-k8s`)**, **Marquez** — déployé via `platform/<addon>/` + Ansible (`bootstrap/`), **validé d'abord sur les bancs Vagrant** (`test/single-node` puis `test/multi-node`). **Aucun manifeste d'infra ne vit dans `atlas`.**
- **Données** : périmètre profilé en **opt-out**, base légale d'intérêt public / intérêt légitime (pas le consentement) — tout chercheur du périmètre d'ingestion est profilé par défaut, sauf opposition. Le dispositif `consent-events` Appwrite (`ConsentType openalex_email` de `find-an-expert`) sert de **registre d'opposition** (il **retire** les personnes s'étant opposées). L'outil est **générique/multi-tenant** : la déclaration des alliances par l'utilisateur **filtre l'affichage**, pas l'ingestion. Aucune ingestion de donnée réelle avant la levée du gate RGPD (Phase 0).

### Principes directeurs

- **RGPD-gate-first.** Phase 0 est **bloquante** : aucune ligne de code touchant une donnée personnelle réelle n'est exécutée tant que l'ADR 0030 n'est pas `Accepted` et que l'arbitrage base légale/DPO n'est pas au moins **tracé** (demande envoyée, ticket ouvert). Les phases suivantes se développent sur **données synthétiques/fixtures** en attendant l'arbitrage ; le **déploiement prod avec données nominatives** reste subordonné à la levée du gate.
- **Non-régression.** À chaque étape côté `atlas`, `pnpm ci:checks && pnpm ci:audit && pnpm docs:build` reste vert. Côté `cluster`, `pnpm lint && pnpm test:shell` reste vert et le banc Vagrant cible converge.
- **Libre & souverain.** Aucune dépendance SaaS. Tout composant (ingress, certs, monitoring, Postgres, Dagster, Marquez, modèle d'embedding ONNX, futur LLM) est auto-hébergé sur le cluster, artefacts mirrorés sur le registry interne. Licences permissives uniquement (Apache-2.0 / MIT / BSD). Dagster, dbt, DuckDB, Great Expectations, OpenLineage/Marquez, pgvector, Hono, Scalar : tous OSS.
- **IA 100 % interne, CPU, sans appel externe — _free tier_ inclus.** Aucune donnée (a fortiori un mart nominatif) n'est envoyée à une IA SaaS, même gratuite : ce serait un transfert de données personnelles contraire à [ADR 0030](../decisions/0030-rgpd-profilage-collaborations), et le _free tier_ n'y change rien (transfert hors UE, entraînement possible sur les données, quotas instables). Embeddings ONNX `all-MiniLM-L6-v2` en V1 ; LLM self-host (Ollama, **Mistral-7B-Instruct Apache-2.0**, batch) au palier 2. Tout tourne sur le cluster, sans GPU.
- **Aligné-benchmark, assumé.** On vise la **plateforme DataOps représentative** (Dagster + dbt + OpenLineage + Great Expectations + pgvector), pas l'ossature minimale « CronJob + SQL brut ». C'est un **choix de positionnement** : la stack est **plus riche** (composants stateful nouveaux : Dagster, CloudNativePG, Marquez), donc l'**effort et la charge opérationnelle sont accrus** — c'est explicitement assumé (cf. ADR 0029, _Prix à payer_, et la section [Risques](#risques--questions-ouvertes)).
- **Interface DataOps↔scoring inchangée.** Le contrat producteur↔consommateur reste **un fichier Parquet + un `manifest.json`** atomique sur S3 Ceph (partitions immuables, `sha256`, `schema_version`). dbt **produit** ce mart ; l'index Postgres/pgvector en est **dérivé** (exploration/recherche), **jamais** le contrat de transfert. Pas de queue, pas de base partagée, pas d'API sur le **chemin de calcul**.
- **Une PR par phase** (sauf découpage explicitement prévu). Les PRs `cluster` et `atlas` sont distinctes par construction (dépôts séparés).

### Conventions agent (à respecter à chaque étape)

- **Nommage local strict.** Jamais « OpenAlex » dans un identifiant (bucket, namespace, paquet, variable, label, modèle dbt) : utiliser `citation`. La marque n'apparaît que dans la prose. Bucket = `s3://citation`. Namespaces = `citation-ingest`, `citation-marts`, `citation-serving`, `citation-pwa`. **Cette règle est une convention de _dépôt_, pas portée par [ADR 0022](../decisions/0022-naming-convention)** (qui ne traite que du préfixe `atlas-`) : dette connue, pas encore d'ADR dédié.
- **Commits.** Conventional Commits, scope ∈ `scope-enum` de `commitlint.config.js` (vérifier avant chaque commit : `citation`, `citation-cli`, `citation-fetch`, `citation-types`, `citation-validate`, `find-an-expert`, `researcher-profiles`, `infra`, `ci`, `docs`…). Les assets dbt/Dagster commitent sous le scope **`citation`** (déjà présent) — **aucun scope `dagster`/`dbt` n'est requis**. Le **seul** scope nouveau à ajouter au `scope-enum` est **`atlas-api`** (Phase 5.2, dans la PR qui crée le service). **Pas de `Co-Authored-By`.**
- **Hooks lefthook JAMAIS bypassés** : pas de `--no-verify`, `LEFTHOOK=0`, etc. Si un hook bloque, fixer en racine. `knip` casse pré-push sur `main` : résorber la dette à la racine, ne pas contourner.
- **Décisions structurantes via ADR** (Nygard léger), jamais en bullets dans un TODO.
- **Idempotence & immutabilité.** Avant écriture, vérifier que l'état cible n'est pas déjà atteint. Une partition de mart déjà produite ne se réécrit **jamais** en place (rejeu = nouveau `run=<id>`).
- **Effect & thin clients.** Logique dans `packages/*` ([ADR 0008](../decisions/0008-clis-thins-logique-dans-packages)), retours `Effect<A, E>` ([ADR 0005](../decisions/0005-effect-pour-la-pf)), `run` aux points d'entrée (handler Hono, `bin` batch, op Dagster).
- **Validation systématique.** Chaque étape se clôt par ses commandes de validation, qui doivent toutes passer.

### Vue d'ensemble des phases

| Phase | Titre                                                   | Dépôt     | Bloque        | Effort |
| ----- | ------------------------------------------------------- | --------- | ------------- | ------ |
| 0     | Gate RGPD (BLOQUANT)                                    | `atlas`   | tout le reste | M      |
| 1     | Socle cluster (ingress/TLS/GitOps/obs/Postgres/Dagster) | `cluster` | 2, 3, 4, 5    | XL     |
| 2     | Ingestion mensuelle + références                        | `atlas`   | 3             | L      |
| 3     | Transformations dbt + mart + contrat + qualité          | `atlas`   | 4             | XL     |
| 4     | Indexation PostgreSQL/pgvector                          | `atlas`   | 5             | L      |
| 5     | Scoring déterministe + `atlas-api` (métier + explo)     | `atlas`   | 6             | XL     |
| 6     | PWA `find-an-expert` + exposition                       | `atlas`   | —             | M      |
| 7     | DevSecOps images (cosign/SLSA/SBOM/Trivy)               | `atlas`   | (transverse)  | M      |

**Chemin critique.** 0 → 1 → 2 → 3 → 4 → 5 → 6. La Phase 1 (cluster) est parallélisable avec les Phases 2–5 **en développement** (fixtures synthétiques), mais conditionne le **déploiement** de 2 (OBC/Argo CD), 3–4 (Dagster, Postgres) et 5–6 (ingress/TLS). La Phase 7 est transverse : applicable dès qu'une image existe (Phase 2), traitée en dernier sans bloquer la chaîne fonctionnelle.

> **Honnêteté sur l'effort.** Ce plan représente nettement **plus que la charge** d'une ossature « CronJob + SQL brut » : c'est le **prix assumé** du positionnement plateforme. Outre les chantiers de **code neuf à 100 %** — (1) l'accès lakehouse DuckDB↔S3↔Parquet (`packages/citation/src/db/index.ts` est aujourd'hui un wrapper DuckDB **local** trivial, zéro `httpfs`/`s3://`/`CREATE SECRET`/`COPY … FORMAT PARQUET`) **et** les modèles dbt ; (2) la feature **citations croisées** + l'ingestion des `referenced_works` (volumétrie lourde) — `scorer.ts`/`ensemble.ts` ne pondèrent que `{tfidf, embedding}` ; (3) l'**index PostgreSQL/pgvector** + l'API d'exploration ; (4) l'**intégration Dagster** (assets, schedule, asset checks) + **OpenLineage** — la V1 introduit **trois composants stateful nouveaux** à exploiter (Dagster, CloudNativePG, Marquez), avec la charge opérationnelle correspondante. Ce qui est réutilisable l'est _tel quel_ et est nommé étape par étape, sans survente.

---

## Phase 0 — Gate RGPD (BLOQUANT)

**Objectif.** Acter le cadre RGPD du profilage de collaborations _avant_ toute ingestion de donnée réelle. L'[ADR 0030](../decisions/0030-rgpd-profilage-collaborations) **rouvre** [ADR 0026](../decisions/0026-rgpd-perimetre) pour le cas précis du profilage (sans le contredire), pose une **base légale d'intérêt public / intérêt légitime en opt-out** (le dispositif `consent-events` devient un **registre d'opposition**), acte le caractère **générique/multi-tenant** (déclaration des alliances = filtre d'affichage), pose la ré-dérivabilité du mart **et de l'index dérivé**, et trace la demande d'arbitrage institutionnel (base légale, responsable de traitement).
**Dépendances.** Aucune. **Bloque tout le reste** pour ce qui touche aux données nominatives réelles.
**Parallélisable ?** Non en interne (0.1 → 0.2 → 0.3 séquentiels par dépendance documentaire).
**Critère de sortie de phase.** ADR 0030 `Accepted` ; la ré-dérivabilité du mart **et de l'index pgvector** est spécifiée (régénération/masquage by-design) ; le périmètre servi est défini comme « ensemble des chercheurs du périmètre d'ingestion **hors opposition** (registre d'opposition `consent-events`) » ; la demande d'arbitrage base légale/DPO est **tracée** (issue `blocker:rgpd` ou courriel horodaté référencé dans l'ADR). `pnpm docs:build` vert.

### Étape 0.1 — Acter l'ADR 0030 (gate RGPD, profilage)

- **Goal :** Écrire l'ADR qui rouvre 0026 pour le profilage nominatif, pose les bornes techniques (base légale d'intérêt public / intérêt légitime en **opt-out**, registre d'opposition, ré-dérivabilité, auth obligatoire **y compris routes d'exploration**), acte le caractère **générique/multi-tenant** (déclaration des alliances = filtre d'affichage), et nomme le risque EU AI Act (scoring d'individus, recommandations nominatives).
- **Files (read) :** `docs/decisions/0026-rgpd-perimetre.md`, `docs/decisions/0029-architecture-pipeline-collaborations.md`, `docs/decisions/README.md`, `apps/find-an-expert/` (modules `consent-events`, `current-consents`, `ConsentType`, `/api/v1/consents`, `ConsentStatusCard`).
- **Files (write) :** `docs/decisions/0030-rgpd-profilage-collaborations.md`, `docs/decisions/README.md` (entrée index).
- **Invariants à préserver :** ADR 0026 non amendé (0030 le **rouvre**) ; format Nygard léger (`## Contexte` / `## Décision` avec `###` / `## Statut` `Accepted (2026-06-02)` / `## Conséquences` `**Bénéfices.**` / `**Prix à payer.**` / `**Garde-fous.**`).
- **Validation :** `pnpm docs:build` ; liens relatifs `[NNNN](NNNN-slug)` vérifiés.
- **Done criteria :**
  1. ADR 0030 présent, `Accepted (2026-06-02)`, liant 0026 et 0029.
  2. Acte : base légale d'intérêt public / intérêt légitime, périmètre en **opt-out** (registre d'opposition `consent-events`) ; outil **générique/multi-tenant** (déclaration des alliances = filtre d'affichage) ; mart **et index dérivé ré-dérivables** ; auth obligatoire sur toute route nominative (y compris `/search` et filtres d'exploration) ; mention EU AI Act.
  3. `## Garde-fous` renvoie au gate de ce plan (« aucune ingestion réelle avant arbitrage tracé »).
- **PR title :** `docs(adr): gate RGPD profilage de collaborations (ADR 0030)`

### Étape 0.2 — Concevoir la ré-dérivabilité du mart et de l'index

- **Goal :** Spécifier comment une **opposition** se propage à un mart de partitions immuables **et à l'index pgvector dérivé** : régénération de la partition courante par re-dérivation depuis `curated` filtré sur le **registre d'opposition à T** (on **exclut** les personnes opposées), masquage rétroactif des partitions historiques, **et purge/recharge des lignes correspondantes dans l'index Postgres** (qui n'est pas source de vérité, donc régénérable).
- **Files (read) :** ADR 0030, ADR 0029 (interface Parquet + index dérivé), `packages/citation-types`.
- **Files (write) :** page dédiée dans `docs/architecture/` (« ré-dérivabilité du mart et de l'index »), référencée par l'ADR 0030.
- **Invariants à préserver :** immutabilité des partitions de production (on n'écrit jamais en place) ; la ré-dérivation produit une **nouvelle** partition `run=<id>`, l'ancienne marquée obsolète ; l'index est régénéré, jamais traité comme autorité du contrat.
- **Validation :** `pnpm docs:build` ; revue de cohérence « partitions immuables » + « mart ré-dérivable » + « index dérivé purgeable ».
- **Done criteria :** Document décrivant (a) registre d'opposition (`consent-events`, qui **retire** les personnes opposées), (b) régénération de la partition mart, (c) masquage à la lecture pour l'historique, (d) purge/recharge de l'index pgvector, (e) SLA de propagation d'une opposition.
- **PR title :** `docs(architecture): ré-dérivabilité du mart et de l'index sous RGPD`

### Étape 0.3 — Tracer la demande d'arbitrage base légale / DPO

- **Goal :** Matérialiser la demande d'arbitrage institutionnel (base légale, responsable de traitement, rétention) que le code ne peut pas trancher.
- **Files (read) :** ADR 0026 (questions ouvertes Q2/Q6), ADR 0030.
- **Files (write) :** issue GitHub `blocker:rgpd` (via `gh issue create`) **ou** note horodatée référencée par l'ADR 0030 ; mise à jour du `## Statut`/`## Garde-fous` de 0030 avec le lien.
- **Invariants à préserver :** aucune affirmation de conformité non validée n'est écrite (le code ne se prononce pas sur la base légale).
- **Validation :** `gh issue list --label blocker:rgpd` retourne l'issue ; lien présent dans l'ADR ; `pnpm docs:build`.
- **Done criteria :** Demande tracée et liée depuis l'ADR. Le gate est « ouvert pour le développement sur fixtures » ; « fermé pour le déploiement prod nominatif » tant que l'arbitrage n'est pas revenu.
- **PR title :** `docs(adr): tracer la demande d'arbitrage DPO (ADR 0030)`

---

## Phase 1 — Socle cluster (dépôt `../cluster`)

> **Tous les artefacts de cette phase vivent dans le dépôt `cluster`, pas dans `atlas`.** Chaque addon suit le patron existant `platform/<addon>/` (cf. `platform/metrics-server/`, `platform/network-policies/`), déployé via Ansible (`bootstrap/`) et **validé d'abord sur le banc Vagrant** (`test/single-node` puis `test/multi-node`) avant tout passage sur le cluster réel. Déclenche le **palier 2** de [ADR cluster 0016](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0016-observabilite.md) et **ajoute les composants stateful** de la plateforme (CloudNativePG, Dagster, Marquez).

### Pour l'agent qui reprend cette phase

> Cette section rend la Phase 1 **auto-porteuse** : un agent lancé dans le dépôt
> `cluster` doit pouvoir l'exécuter sans contexte externe. Le plan détaillé
> (étapes 1.1→1.8) est dans le dépôt `atlas`
> (`docs/plans/2026-06-02-pipeline-collaborations.md`) ; les **livrables**, eux,
> sont dans `cluster`.

- **Où travailler.** Dans le dépôt **`cluster`** (Ansible + manifestes K8s). Le
  dépôt `atlas` n'est lu que pour ce plan ; aucun fichier n'y est modifié en
  Phase 1.
- **Patron d'un addon.** Copier la structure d'un addon existant —
  [`platform/metrics-server/`](https://github.com/univ-lehavre/cluster/tree/main/platform/metrics-server)
  est la référence (manifestes + `manage.sh` + README + tâche/role Ansible sous
  `bootstrap/`). Chaque nouvel addon suit `platform/<addon>/`.
- **Conventions du dépôt cluster** (différentes d'`atlas`) :
  - **Commits** : Conventional Commits, vérifiés par `commitlint` via **lefthook**
    (hook `commit-msg`) ; **pas d'email** dans le message ; **jamais** de
    `--no-verify`. Sujet en minuscules.
  - **Branche + PR** : jamais de commit direct sur `main` ; une PR par étape, le
    `PR title` est donné à chaque étape.
  - **Lint/validation** : `pnpm lint` (enchaîne `format:check`, `yamllint`,
    `shellcheck`, `kubeconform`, `ansible-lint`, `jscpd`, puis `test:shell`) ;
    `pnpm test:shell` = `bats test/unit/`. Le `Justfile` donne les raccourcis
    (`just lint`, `just test-unit`, `just checks`).
- **Banc Vagrant.** Les étapes valident sur le banc : `test/single-node/` puis
  `test/multi-node/` (3 VMs Debian, `Vagrantfile` + `run-phases.sh`). **Le monter
  prend plusieurs minutes** (`vagrant up`, VirtualBox requis). Si le banc n'est
  **pas** disponible dans l'environnement de l'agent, voir le mode dégradé
  ci-dessous.
- **ADR cluster.** Le dépôt `cluster` a sa propre suite d'ADR sous
  `docs/decisions/` (format Nygard léger, même esprit qu'`atlas`). Au démarrage,
  le **prochain numéro libre est `0020`** (les ADR vont jusqu'à `0019`) ;
  **vérifier `docs/decisions/` avant de numéroter** (d'autres ADR ont pu être
  ajoutés depuis la rédaction de ce plan). Chaque étape qui demande un « ADR
  cluster … » crée le fichier numéroté suivant et l'ajoute à l'index.
- **Mode dégradé (pas de banc disponible).** Si l'agent ne peut pas lancer le
  banc Vagrant : **écrire les manifestes/rôles et les faire passer `pnpm lint`**
  (kubeconform + ansible-lint valident la forme sans cluster), puis **marquer
  explicitement le critère « validé sur `test/multi-node` » comme _à exécuter par
  un humain_** dans la description de la PR. Ne pas prétendre une validation
  end-to-end qui n'a pas eu lieu (cf. principe « rapporter fidèlement »). Le
  déploiement sur le cluster réel reste, dans tous les cas, une action humaine.
- **Ordre conseillé.** Suivre le chemin critique : 1.1 → 1.2 → 1.3, puis 1.4 et
  1.5 (après 1.1), puis 1.6 → 1.7 → 1.8. Une PR par étape, mergée avant la
  suivante quand elle en dépend.

**Objectif.** Relever le socle pour une plateforme DataOps **exposable, observable et stateful** : exposition HTTPS (MetalLB + ingress-nginx + cert-manager), GitOps (Argo CD), monitoring **complet** (kube-prometheus-stack + Loki, `ServiceMonitor` Ceph activé), **PostgreSQL managé via CloudNativePG** (event log Dagster **+** index pgvector), **Dagster** (`dagster-k8s` : daemon + webserver + run workers, event log Postgres), **Marquez** (store de lineage OpenLineage).
**Dépendances.** Aucune technique vis-à-vis de la Phase 0 (infra pure). **Bloque le déploiement** des Phases 2 (OBC/Argo CD), 3–4 (Dagster, Postgres) et 5–6 (ingress/TLS).
**Parallélisable ?** 1.1 (MetalLB) → 1.2 (ingress) → 1.3 (cert-manager). 1.4 (Argo CD) et 1.5 (monitoring) indépendants après 1.1. 1.6 (CloudNativePG) prérequis de 1.7 (Dagster, event log Postgres) et de 1.8 (Marquez, store Postgres). 1.7/1.8 après 1.4 (déployés en GitOps).
**Critère de sortie de phase.** Sur le banc multi-node : un Ingress de test répond en HTTPS (cert émis par cert-manager) ; Argo CD réconcilie une app de test ; Grafana affiche les métriques Ceph (OSD, near-full) + logs Loki ; un cluster CloudNativePG **avec extension `pgvector`** est `Healthy` ; le **webserver Dagster** répond et le **daemon** est up (event log dans Postgres) ; **Marquez** ingère un événement OpenLineage de test. Nouveaux ADR cluster (ingress/GitOps/Postgres/Dagster) + ADR 0016 mis à jour (palier 2 livré). `pnpm lint && pnpm test:shell` verts.

### Étape 1.1 — MetalLB (pool d'IP LoadBalancer)

- **Goal :** Fournir des IP `LoadBalancer` sur cluster bare-metal (prérequis ingress).
- **Files (read) :** `platform/metrics-server/` (patron addon), `bootstrap/RUNBOOK.md`, `bootstrap/hosts.yaml` (plage réseau).
- **Files (write) :** `platform/metallb/` (`IPAddressPool` + `L2Advertisement`), tâche Ansible, entrée RUNBOOK.
- **Invariants à préserver :** NetworkPolicies default-deny ([ADR cluster 0019](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0019-durcissement-reseau-cilium.md)) — ouvrir explicitement le L2 nécessaire ; Cilium ne fait pas le LB de service externe ici.
- **Validation :** sur `test/multi-node` : un Service `type=LoadBalancer` de test obtient une IP du pool ; `pnpm lint`.
- **Done criteria :** Pool MetalLB actif, IP attribuée, documenté.
- **PR title :** `feat(platform): MetalLB pour IP LoadBalancer bare-metal`

### Étape 1.2 — ingress-nginx

- **Goal :** Contrôleur d'ingress exposé via une IP MetalLB.
- **Files (read) :** `platform/metallb/`, NetworkPolicies.
- **Files (write) :** `platform/ingress-nginx/`, NetworkPolicy autorisant l'ingress vers les namespaces applicatifs, ADR cluster ingress.
- **Invariants à préserver :** default-deny respecté ; pas de TLS interne supposé ([ADR cluster 0003](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0003-pas-de-chiffrement-ceph-tailscale.md)) — terminaison TLS en bordure.
- **Validation :** sur `test/multi-node` : un Ingress HTTP de test route vers un pod echo ; `pnpm lint`.
- **Done criteria :** ingress-nginx déployé, IP stable, Ingress HTTP de test fonctionnel.
- **PR title :** `feat(platform): ingress-nginx en bordure`

### Étape 1.3 — cert-manager (TLS de bordure)

- **Goal :** Émission automatique de certificats pour les Ingress (HTTPS en bordure).
- **Files (read) :** `platform/ingress-nginx/`.
- **Files (write) :** `platform/cert-manager/`, `ClusterIssuer` (ACME si domaine public, sinon CA interne), ADR cluster TLS-bordure (relation explicite avec 0003 : TLS _en bordure_ vs pas-de-TLS _interne_).
- **Invariants à préserver :** ADR 0003 non contredit (on ajoute le TLS **externe** uniquement) ; documenter que l'exposition d'un mart/index **nominatif** exige ce TLS (lien ADR 0030).
- **Validation :** sur `test/multi-node` : Ingress de test en HTTPS, cert valide ; `pnpm lint`.
- **Done criteria :** HTTPS de bout en bout ; rotation auto vérifiée/documentée.
- **PR title :** `feat(platform): cert-manager + TLS en bordure`

### Étape 1.4 — Argo CD (GitOps)

- **Goal :** Réconciliation GitOps des manifestes applicatifs (apps `atlas` + composants stateful de plateforme déclarés en `Application`).
- **Files (read) :** patron addon, RUNBOOK.
- **Files (write) :** `platform/argocd/`, `AppProject` cadrant les namespaces `citation-*` + `dagster`/`marquez`, ADR cluster GitOps.
- **Invariants à préserver :** Argo CD lit les manifestes **applicatifs** ; les addons d'infra restent gérés par Ansible (pas de bootstrap circulaire). Registry interne HTTP sans auth ([ADR cluster 0011](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0011-registry-http-sans-auth.md)) référencé tel quel.
- **Validation :** sur `test/multi-node` : une `Application` de test passe `Healthy/Synced` ; `pnpm lint`.
- **Done criteria :** Argo CD opérationnel, `AppProject` pour `citation-*`/`dagster`/`marquez`, app de test réconciliée.
- **PR title :** `feat(platform): Argo CD pour GitOps applicatif`

### Étape 1.5 — kube-prometheus-stack + Loki + monitoring Ceph (palier 2)

- **Goal :** Livrer le palier 2 de l'ADR cluster 0016 : Prometheus + Grafana + Alertmanager + Loki, et activer `monitoring.enabled: true` côté Ceph (CRDs `monitoring.coreos.com` désormais présents).
- **Files (read) :** `docs/decisions/0016-observabilite.md`, `storage/ceph/cluster.yaml`.
- **Files (write) :** `platform/kube-prometheus-stack/`, `platform/loki/`, `storage/ceph/cluster.yaml` (`monitoring.enabled: true`), `ServiceMonitor` Ceph, routes Alertmanager (réutiliser la couche mail `alert`/postfix), mise à jour ADR 0016 (palier 2 livré).
- **Invariants à préserver :** empreinte maîtrisée sur cluster hyperconvergé (`requests`/`limits` bornés) ; pas de CRD orphelin (activer Ceph monitoring **après** déploiement des CRDs) ; `--kubelet-insecure-tls` toléré comme metrics-server (ADR 0003).
- **Validation :** sur `test/multi-node` : Grafana affiche métriques nœuds + Ceph (OSD up, near-full) ; un OSD coupé déclenche une alerte ; Loki ingère les logs d'un pod ; `pnpm lint && pnpm test:shell`.
- **Done criteria :** stack déployée et accessible (via Ingress+TLS) ; Ceph monitoring sans erreur CRD ; ≥1 alerte Ceph routée vers le mail d'exploitation ; ADR 0016 « palier 2 livré ».
- **PR title :** `feat(platform): kube-prometheus-stack + Loki + monitoring Ceph (palier 2)`

### Étape 1.6 — CloudNativePG (PostgreSQL managé + pgvector)

- **Goal :** Déployer un cluster PostgreSQL managé par **CloudNativePG**, support de **deux usages** : l'**event log Dagster** et l'**index d'exploration pgvector**. Activer l'extension `pgvector`.
- **Files (read) :** patron addon, `platform/network-policies/`, RUNBOOK (sauvegardes).
- **Files (write) :** `platform/cloudnative-pg/` (opérateur + `Cluster` CNPG, image avec `pgvector`, stockage RBD, sauvegardes vers RGW), NetworkPolicy d'accès depuis les namespaces `dagster`/`citation-serving`, ADR cluster Postgres.
- **Invariants à préserver :** données stateful sur RBD (RWO) ; sauvegardes vers le RGW S3 ; default-deny → accès Postgres restreint aux consommateurs déclarés ; pas de chiffrement interne supposé (ADR 0003) — Postgres reste interne au cluster. **SPOF/EC 2+1 assumés** : l'event log et l'index deviennent sensibles à la disponibilité du stockage (cf. Risques).
- **Validation :** sur `test/multi-node` : cluster CNPG `Healthy`, `CREATE EXTENSION vector;` réussit, un `vector(384)` se crée et s'interroge ; sauvegarde/restauration de base testée ; `pnpm lint`.
- **Done criteria :** Postgres managé `Healthy`, `pgvector` actif, sauvegarde testée, ADR cluster posé.
- **PR title :** `feat(platform): CloudNativePG (PostgreSQL + pgvector)`

### Étape 1.7 — Dagster (`dagster-k8s` : daemon + webserver + run workers)

- **Goal :** Déployer l'orchestrateur **Dagster** sur K8s (daemon + webserver + run workers via `K8sRunLauncher`/run-as-job), **event log persisté dans le Postgres CNPG** (1.6). C'est le livrable représentatif du profil DataOps ; il **remplace les CronJobs K8s bruts**.
- **Files (read) :** étape 1.6 (DSN Postgres), `platform/argocd/`, patron addon.
- **Files (write) :** `platform/dagster/` (Helm/manifestes `dagster-k8s` : webserver, daemon, `dagster.yaml` pointant l'event/run/schedule storage vers CNPG), Ingress+TLS pour le webserver (auth en bordure), NetworkPolicy (Dagster→Postgres, Dagster→RGW, Dagster→registry), `Application` Argo CD, ADR cluster orchestration.
- **Invariants à préserver :** event log/schedule storage dans Postgres (pas en SQLite éphémère) ; les **run workers tirent les images** du registry interne HTTP ([ADR 0011](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0011-registry-http-sans-auth.md)) ; default-deny → flux explicites ; le code-location/repo `atlas` (assets) est **packagé côté `atlas`** (Phase 2+), pas ici — ici on déploie l'orchestrateur « vide ».
- **Validation :** sur `test/multi-node` : webserver Dagster accessible en HTTPS, daemon up, un **job de test** (asset trivial) se lance via `K8sRunLauncher` et son run apparaît dans l'event log Postgres ; un **schedule** de test se déclenche ; `pnpm lint && pnpm test:shell`.
- **Done criteria :** Dagster opérationnel (webserver+daemon+run worker), event log dans CNPG, schedule de test déclenché, ADR cluster posé.
- **PR title :** `feat(platform): Dagster (dagster-k8s, event log Postgres)`

### Étape 1.8 — Marquez (store de lineage OpenLineage)

- **Goal :** Déployer **Marquez** comme collecteur/visualiseur de lineage **OpenLineage** (émis nativement par dbt et Dagster en Phases 2–4), store dans Postgres CNPG.
- **Files (read) :** étape 1.6 (Postgres), 1.7 (Dagster, émetteur OL), patron addon.
- **Files (write) :** `platform/marquez/` (API + web, store Postgres CNPG ou base dédiée), Ingress+TLS (auth bordure), NetworkPolicy (émetteurs→Marquez, Marquez→Postgres), `Application` Argo CD, ADR cluster lineage.
- **Invariants à préserver :** composant stateful supplémentaire **assumé** (cf. Risques) ; aucune donnée nominative dans les métadonnées de lineage (noms d'assets/colonnes techniques, pas de PII) ; default-deny → flux explicites.
- **Validation :** sur `test/multi-node` : Marquez accessible, un **événement OpenLineage de test** (`OPENLINEAGE_URL`) est ingéré et visible dans l'UI ; `pnpm lint`.
- **Done criteria :** Marquez opérationnel, événement OL de test visible, ADR cluster posé.
- **PR title :** `feat(platform): Marquez (store de lineage OpenLineage)`

---

## Phase 2 — Ingestion mensuelle + références (dépôt `atlas`)

**Objectif.** **Asset Dagster d'ingestion** (schedule mensuel) qui ingère le delta de publications via `citation-fetch` **réutilisé _tel quel_** (Effect, rate-limit 1 req/s, `from_updated_date=watermark`) vers `s3://citation/raw`, **plus** l'ingestion **neuve** des `referenced_works` (références bibliographiques, **volumétrie lourde**) — matière première du signal citations croisées. Watermark persisté pour le delta. Greffé sur le `cli/citation` existant (`@univ-lehavre/atlas-citation-cli`).
**Dépendances.** Phase 0 levée (données réelles ; dev possible sur fixtures avant). Phase 1 pour le déploiement (Dagster, Argo CD, OBC). Le **secret S3** et le **bucket** viennent de l'`ObjectBucketClaim` déjà déclaré côté cluster.
**Parallélisable ?** 2.1 (asset delta + image) et 2.4 (watermark) avant 2.2 (références). 2.3 (packaging code-location Dagster + déploiement) après 2.1.
**Critère de sortie de phase.** L'asset `raw_citations` matérialisé par Dagster sur un sous-périmètre d'ingestion (hors opposition) écrit des objets dans `s3://citation/raw/dt=YYYY-MM/run=<id>/` (publications + références), le watermark avance, le rate-limit 1 req/s est respecté, aucune réécriture en place ; le run apparaît dans l'event log Dagster. `pnpm ci:checks` vert.

### Étape 2.1 — Asset Dagster `raw_citations` (réutilise `citation-fetch`)

- **Goal :** Définir un **asset Dagster** (op long-vivant déclenché par le schedule mensuel) qui appelle `citation-fetch` avec `from_updated_date=<watermark>` et écrit le brut sur `s3://citation/raw`. La logique d'écriture vit dans `packages/citation` (thin asset, [ADR 0008](../decisions/0008-clis-thins-logique-dans-packages)).
- **Files (read) :** `packages/citation-fetch/src/`, `packages/fetch-one-api-page/src/`, `packages/citation/src/fetch/`, `cli/citation/` (point d'entrée existant), `services/crf/` (patron conteneurisation).
- **Files (write) :** définition de l'asset (`packages/citation` ou module assets dédié) + writer S3 brut (NDJSON tel que reçu, **pas encore Parquet**), `bin` réutilisable par le CLI **et** par l'op Dagster, Dockerfile de la code-location.
- **Invariants à préserver :** `citation-fetch` **non modifié** (réutilisé tel quel) ; rate-limit 1 req/s conservé ; nommage `citation` (jamais « OpenAlex » dans un identifiant) ; chemin `dt=YYYY-MM/run=<id>/`.
- **Validation :** `pnpm ci:checks` ; run local contre fixtures écrivant dans un MinIO/localstack ; matérialisation de l'asset vérifiée en mode dev (`dagster dev`).
- **Done criteria :** asset `raw_citations` défini, run de test écrit le brut partitionné, rate-limit respecté.
- **PR title :** `feat(citation): asset Dagster d'ingestion delta vers s3://citation/raw`

### Étape 2.2 — Ingestion des `referenced_works` + métadonnées d'impact FWCI (NEUF, volumétrie lourde)

- **Goal :** En une seule extension de l'ingestion des œuvres, capter (a) les **références bibliographiques** (`referenced_works`) — matière première du signal citations croisées — et (b) le **FWCI** (_Field-Weighted Citation Impact_) et l'impact (`cited_by_count`), **métadonnées OpenAlex au niveau _work_** — signal d'excellence du modèle supervisé du palier 2. Les deux sont **absents** des types actuels (`WorksResult` n'a ni `referenced_works` exploité, ni `fwci`, ni `cited_by_count`). Capter le FWCI **dès maintenant** (même si le modèle supervisé est palier 2) évite une seconde passe d'ingestion coûteuse.
- **Files (read) :** schéma source des œuvres, `packages/citation-types/src/api-results.ts`, étape 2.1.
- **Files (write) :** extension de `packages/citation-types` (`referenced_works`, `fwci`, `cited_by_count` sur `WorksResult`), extension de l'ingestion, writer dédié `s3://citation/raw/references/dt=YYYY-MM/run=<id>/`.
- **Invariants à préserver :** rate-limit 1 req/s **global** (les références **alourdissent** le volume → surveiller la durée du run, prévoir reprise) ; immutabilité (rejeu = nouveau `run=<id>`) ; FWCI capté tel quel (métadonnée fournie par OpenAlex, pas de calcul maison).
- **Validation :** `pnpm ci:checks` ; sur fixtures : les arêtes article→référence et la colonne `fwci` sont dans le brut ; **estimer et documenter** le ratio volumétrique (références/œuvre) — entrée pour la section Risques.
- **Done criteria :** brut des références + FWCI écrit et partitionné ; types étendus ; note de volumétrie (taille brute estimée/mois) dans `docs/architecture/`.
- **PR title :** `feat(citation): ingestion des références et du FWCI`

### Étape 2.3 — Code-location Dagster + Secret S3 (OBC) + déploiement GitOps

- **Goal :** Packager la **code-location Dagster** `atlas` (assets d'ingestion) comme image, la câbler au bucket `s3://citation` (RGW Ceph, **path-style**) via le Secret/ConfigMap de l'`ObjectBucketClaim` existant, et la déployer en GitOps.
- **Files (read) :** déclaration de l'`ObjectBucketClaim` côté cluster (Secret généré : `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/endpoint), `platform/dagster/` + `platform/argocd/` (côté cluster).
- **Files (write) :** manifeste de la code-location (Deployment gRPC du repo Dagster) dans `citation-ingest` + montage du Secret OBC + NetworkPolicy vers RGW, `Application` Argo CD pour la code-location.
- **Invariants à préserver :** default-deny → NetworkPolicy explicite vers le service RGW uniquement ; pas de credentials en clair dans le dépôt (référence au Secret OBC) ; endpoint RGW **path-style** ; l'orchestrateur Dagster lui-même reste côté `cluster` (Phase 1.7), seule la **code-location applicative** est ici.
- **Validation :** `pnpm ci:checks` ; déploiement banc Vagrant via Argo CD : la code-location s'enregistre dans Dagster, un run lit le Secret OBC et atteint le RGW.
- **Done criteria :** code-location déployée par Argo CD, visible dans le webserver Dagster, accès au bucket via OBC, NetworkPolicy en place.
- **PR title :** `feat(citation): code-location Dagster déployée en GitOps`

### Étape 2.4 — Watermark delta persistant

- **Goal :** Persister le `from_updated_date` du dernier run réussi pour ne réingérer que le delta mensuel.
- **Files (read) :** logique de pagination `citation-fetch`.
- **Files (write) :** writer/reader du watermark (objet `s3://citation/raw/_watermark.json`, écrit **après** succès du run), wiring dans l'asset.
- **Invariants à préserver :** le watermark n'avance qu'après écriture **complète et réussie** du run ; idempotence (rejeu manuel = nouveau `run=<id>`, watermark inchangé). Option : exposer le watermark comme **état d'asset** Dagster pour la traçabilité.
- **Validation :** `pnpm ci:checks` ; deux runs consécutifs (le second ne réingère pas le premier mois) ; un run échoué ne fait pas avancer le watermark.
- **Done criteria :** watermark lu au démarrage, écrit en fin de run réussi, testé.
- **PR title :** `feat(citation): watermark delta pour l'ingestion mensuelle`

---

## Phase 3 — Transformations dbt + mart + contrat + qualité (dépôt `atlas`)

**Objectif.** Le **cœur DataOps**. Écrire l'**accès lakehouse DuckDB↔S3↔Parquet (100 % neuf)**, les **modèles dbt (`dbt-duckdb`)** en couches `staging → curated → marts`, la **feature citations croisées (NEUVE, modèle dbt + SQL)**, le `manifest.json` **atomique** (écrit en dernier) + **partitions immuables** + `schema_version` (validateur dans **`packages/citation`**, pas `citation-validate`), les **tests dbt + suites Great Expectations** (asset checks Dagster), et le **lineage OpenLineage → Marquez**. Les modèles `marts` matérialisent le mart Parquet ; le manifest est écrit en dernier par l'asset de matérialisation.
**Dépendances.** Phase 2 (le brut + les références existent). Phase 0 (ré-dérivabilité spécifiée → implémentée ici). Phase 1 (Dagster orchestre les assets dbt + Marquez collecte le lineage).
**Parallélisable ?** 3.1 (accès lakehouse) est le socle de tout le reste. 3.2 (projet dbt + staging/curated) puis 3.3 (feature citations croisées en `marts`) puis 3.4 (matérialisation Parquet + manifest) sont séquentiels. 3.5 (qualité GE + lineage) et 3.6 (validateur contrat) après 3.4. 3.7 (ré-dérivabilité) en dernier.
**Critère de sortie de phase.** Les assets dbt orchestrés par Dagster produisent `s3://citation/curated/…` puis `s3://citation/marts/collab/dt=YYYY-MM/run=<id>/` + `manifest.json` ; la feature citations croisées est calculée et non nulle sur fixtures ; les **tests dbt** passent et les **asset checks Great Expectations** sont verts ; le **lineage** source→staging→curated→mart est visible dans Marquez ; un consommateur valide `row_count`+`sha256` et **refuse** une `schema_version` inconnue ; aucune partition réécrite en place. `pnpm ci:checks` vert.

### Étape 3.1 — Accès lakehouse DuckDB↔S3↔Parquet (NEUF)

- **Goal :** Doter `packages/citation` d'un vrai accès lakehouse : `httpfs`, `CREATE SECRET` (RGW path-style), lecture/écriture `s3://`, `COPY … TO 's3://…' (FORMAT PARQUET)`, partitionnement Hive. C'est l'adaptateur sous-jacent que **dbt-duckdb** utilisera ; l'actuel `packages/citation/src/db/index.ts` est un wrapper **local** trivial sans aucun de ces éléments.
- **Files (read) :** `packages/citation/src/db/index.ts` (état actuel à étendre), `packages/citation/src/index.ts`.
- **Files (write) :** `packages/citation/src/db/` (install/load `httpfs`, secret RGW path-style depuis l'env du Secret OBC, helpers `copyToParquet`/`readParquet`), tests d'intégration contre un endpoint S3 de test.
- **Invariants à préserver :** le wrapper local existant reste fonctionnel (rétro-compat) ; configuration S3 **path-style** ; pas de credentials en dur ; couverture conforme aux seuils ([ADR 0019](../decisions/0019-derogations-workspace-audit)).
- **Validation :** `pnpm test --filter citation` ; intégration : écrire puis relire un Parquet sur un S3 de test (MinIO/localstack), partition Hive ; `pnpm ci:checks`.
- **Done criteria :** accès DuckDB↔S3↔Parquet testé (write+read+partition Hive), documenté ; profil dbt-duckdb pointant ce backend prêt à être branché en 3.2.
- **PR title :** `feat(citation): accès lakehouse DuckDB↔S3↔Parquet (httpfs + COPY)`

### Étape 3.2 — Projet dbt-duckdb : `staging` → `curated`

- **Goal :** Initialiser le **projet dbt** (`dbt-duckdb`, `profiles.yml` pointant le backend S3 de 3.1) et écrire les couches `staging` (typage/nettoyage des `works`, `authorships`, `referenced_works`) et `curated` (`works` canoniques, `authorships`, `edges` = arêtes article→référence dédupliquées). Tests dbt (`not_null`, `unique`, `relationships`) sur chaque couche.
- **Files (read) :** schéma du brut (Phase 2), `packages/citation-types`, accès lakehouse 3.1.
- **Files (write) :** projet dbt (`models/staging/`, `models/curated/`, `dbt_project.yml`, `profiles.yml`, schemas/tests), matérialisation `curated` en Parquet `s3://citation/curated/dt=YYYY-MM/run=<id>/`, assets dbt exposés à Dagster (`dagster-dbt`).
- **Invariants à préserver :** déduplication déterministe (même brut → même curated) ; partitions immuables ; filtrage sur le **périmètre servi (hors opposition)** via le registre d'opposition (lien Phase 0) ; modèles nommés sans marque (`stg_citation_*`, `curated_*`).
- **Validation :** `pnpm ci:checks` ; `dbt build` (ou via Dagster) sur fixtures : `staging`/`curated` produits, **tests dbt verts**, dédup vérifiée (pas de doublon d'arête).
- **Done criteria :** projet dbt opérationnel, `curated` en Parquet partitionné, tests dbt verts, assets exposés à Dagster.
- **PR title :** `feat(citation): projet dbt-duckdb (staging → curated)`

### Étape 3.3 — Feature citations croisées (NEUVE, modèle dbt + SQL)

- **Goal :** Calculer le signal **cœur** comme **modèle dbt `marts`** : pour chaque paire de chercheurs (A, B), le nombre de **citations croisées article↔article** (un article de A cite/est cité par un article de B). 100 % de nouveau code métier ; aucune feature de référence n'existe aujourd'hui.
- **Files (read) :** `edges`/`curated` (3.2), `packages/researcher-profiles/src/`, `match-formatter.ts` (alignement des champs explicatifs).
- **Files (write) :** modèle dbt `marts/collab_pairs` calculant `cross_citations` (+ direction, fenêtre temporelle), table de fait des **paires** de chercheurs ; tests dbt singuliers sur la feature.
- **Invariants à préserver :** déterminisme strict (même curated → mêmes valeurs) ; pas de fuite hors périmètre servi (les personnes opposées sont exclues) ; symétrie/asymétrie documentée (A cite B vs B cite A).
- **Validation :** `pnpm ci:checks` ; **golden test** sur fixtures à citations croisées connues : valeur calculée == valeur attendue ; test dbt singulier vert.
- **Done criteria :** feature `cross_citations` calculée (modèle dbt), golden test vert, sémantique documentée.
- **PR title :** `feat(citation): feature citations croisées (modèle dbt)`

### Étape 3.4 — Matérialisation du mart `collab` + `manifest.json` atomique

- **Goal :** Matérialiser le modèle `marts` (paires + features) en `s3://citation/marts/collab/dt=YYYY-MM/run=<id>/`, puis écrire **en dernier** un `manifest.json` atomique `{partition, schema_version, row_count, parts:[{key,sha256,bytes}], produced_at}`. dbt **produit** le mart ; l'asset de matérialisation Dagster écrit le manifest.
- **Files (read) :** modèles 3.2/3.3, `citation-types`, accès lakehouse 3.1.
- **Files (write) :** asset/op de matérialisation + générateur de `manifest.json` (calcul `sha256`/`bytes` par part, écriture atomique en dernier), schedule mensuel du pipeline complet.
- **Invariants à préserver :** `manifest.json` écrit **après** tous les parts (sentinelle de complétude) ; `schema_version` dérivée de `citation-types` ; **jamais** de réécriture en place (rejeu = nouveau `run=<id>`).
- **Validation :** `pnpm ci:checks` ; le manifest référence exactement les parts présents avec sha256 corrects ; couper un run avant le manifest → pas de manifest (consommateur doit refuser de lire).
- **Done criteria :** mart + manifest produits ; atomicité vérifiée ; `schema_version` présente.
- **PR title :** `feat(citation): mart collab + manifest.json atomique`

### Étape 3.5 — Qualité Great Expectations + lineage OpenLineage → Marquez

- **Goal :** Brancher les **suites Great Expectations** (sur `raw`/`curated`/`marts`) comme **asset checks Dagster** (en complément des tests dbt), et activer l'**émission OpenLineage** native de dbt et Dagster vers **Marquez** (Phase 1.8).
- **Files (read) :** assets dbt (3.2/3.3), matérialisation (3.4), `platform/marquez/` (côté cluster, `OPENLINEAGE_URL`).
- **Files (write) :** suites GE (raw : champs présents ; curated : intégrité référentielle ; marts : bornes de `cross_citations`, non-nullité), wiring asset checks Dagster, config OpenLineage (dbt `openlineage`/Dagster `dagster-openlineage` ou intégration native).
- **Invariants à préserver :** asset checks en **porte d'entrée et de sortie** (qualité bloquante en cas d'échec) ; aucune PII dans les métadonnées de lineage (noms techniques uniquement) ; variante Elementary documentée mais GE retenu.
- **Validation :** `pnpm ci:checks` ; sur fixtures : un échec GE injecté **bloque** le run ; le lineage source→staging→curated→mart apparaît dans Marquez.
- **Done criteria :** suites GE en asset checks (bloquantes), lineage visible dans Marquez.
- **PR title :** `feat(citation): qualité Great Expectations + lineage OpenLineage`

### Étape 3.6 — Validateur du contrat de données (dans `packages/citation`)

- **Goal :** Bibliothèque de **validation du contrat** : un consommateur valide `row_count` + `sha256` de chaque part **avant** de lire et **refuse** une `schema_version` inconnue. Le validateur vit dans **`packages/citation`** (PAS `packages/citation-validate`, qui est l'outil interactif OpenAlex sans rapport).
- **Files (read) :** `manifest.json` (3.4), `packages/citation-types`, `packages/citation` (db/contrat).
- **Files (write) :** module validateur de manifest dans `packages/citation`, exporté pour `atlas-api` (Phase 5) et le chargement d'index (Phase 4).
- **Invariants à préserver :** `schema_version` inconnue → **refus** (pas de best-effort) ; sha256 mismatch → refus ; validation **avant** toute lecture ; **ne pas** détourner `citation-validate`.
- **Validation :** `pnpm test --filter citation` ; cas négatifs : version inconnue refusée, sha256 corrompu refusé, manifest absent refusé.
- **Done criteria :** validateur testé (positifs + 3 négatifs), exporté depuis `packages/citation`.
- **PR title :** `feat(citation): validateur du contrat de données (manifest)`

### Étape 3.7 — Ré-dérivabilité du mart (implémentation Phase 0)

- **Goal :** Implémenter le mécanisme spécifié en 0.2 : régénération de la partition courante depuis `curated` filtré sur le **registre d'opposition à T** (re-run dbt, on **exclut** les personnes opposées), masquage des partitions historiques pour les chercheurs s'étant opposés, **+** purge/recharge des lignes correspondantes dans l'index pgvector (Phase 4).
- **Files (read) :** spec 0.2, `consent-events` (registre d'opposition), mart 3.4.
- **Files (write) :** liste d'exclusion dérivée de `consent-events`, paramétrage dbt de filtrage, asset Dagster de ré-dérivation (nouveau `run=<id>`), procédure de masquage à la lecture.
- **Invariants à préserver :** immutabilité préservée (on régénère, on ne modifie pas) ; opposition effective dans le SLA défini en 0.2 ; masquage couvrant l'historique sans réécrire les anciennes partitions.
- **Validation :** `pnpm ci:checks` ; test : un chercheur s'étant opposé disparaît du mart régénéré et est masqué à la lecture de l'historique.
- **Done criteria :** régénération + masquage testés, conformes à l'ADR 0030.
- **PR title :** `feat(citation): ré-dérivabilité du mart sous opposition`

---

## Phase 4 — Indexation PostgreSQL/pgvector (dépôt `atlas`)

**Objectif.** Charger le mart dans **PostgreSQL** (CloudNativePG, Phase 1.6) pour l'**exploration** et la **recherche** : schéma `works`/`authorships`/`pairs`, **FTS `tsvector`** sur titres/topics/mots-clés (lexical), **colonne `vector(384)` + index pgvector** sur les embeddings `all-MiniLM-L6-v2` **réutilisés** (produits par `researcher-profiles`, CPU, aucun nouveau modèle). **Job/asset Dagster de matérialisation mart→Postgres**. L'index est **dérivé** du mart (régénérable), **jamais** source de vérité du contrat.
**Dépendances.** Phase 3 (mart + manifest validables). Phase 1 (CloudNativePG + pgvector). Phase 0 (ré-dérivabilité — l'index est purgeable, 3.7).
**Parallélisable ?** 4.1 (schéma + migrations) avant 4.2 (chargement FTS) et 4.3 (chargement vecteurs). 4.4 (asset Dagster d'orchestration du chargement) après 4.1–4.3.
**Critère de sortie de phase.** Un asset Dagster charge la dernière partition **validée** (contrat 3.6) du mart dans Postgres ; une recherche FTS et une recherche vectorielle (kNN pgvector) renvoient des résultats cohérents sur fixtures ; un chercheur s'étant opposé est purgé de l'index ; le chargement est idempotent (recharge = remplacement de la partition, pas de doublon). `pnpm ci:checks` vert.

### Étape 4.1 — Schéma Postgres + migrations (`works`/`authorships`/`pairs`)

- **Goal :** Définir le schéma d'exploration et ses migrations : tables `works`, `authorships`, `pairs` (paires de chercheurs + features dont `cross_citations`) et une table **`researchers`** portant la colonne `vector(384)`. **Attention à la granularité :** `embedding-profile.ts` produit **un vecteur par chercheur** (`EmbeddingProfile { researcherId, vector }`, mean-pooling des œuvres), donc la colonne `vector(384)` est portée par l'entité **chercheur** (clé `researcherId`), **pas** par `works` (qui n'a pas d'embedding produit). Les colonnes `tsvector` (lexical) vivent sur `works`/`researchers` selon le champ indexé. Métadonnées de partition (`dt`, `run`, `institution`, période) pour le filtrage structuré.
- **Files (read) :** schéma du mart (Phase 3), `packages/citation-types`, `platform/cloudnative-pg/` (côté cluster, DSN/extension).
- **Files (write) :** migrations SQL (création tables + extension `vector` + index), module d'accès Postgres dans `packages/citation` (Effect), secret de connexion référencé (pas en clair).
- **Invariants à préserver :** `pgvector` activé via l'image CNPG (Phase 1.6) ; nommage sans marque ; aucune écriture côté index ne fait autorité sur le contrat Parquet ; index **régénérable**.
- **Validation :** `pnpm ci:checks` ; migrations appliquées sur un Postgres de test (conteneur `pgvector`), schéma créé, `CREATE EXTENSION vector` ok.
- **Done criteria :** schéma + migrations testés, module d'accès Postgres exporté.
- **PR title :** `feat(citation): schéma Postgres d'index (works/authorships/pairs)`

### Étape 4.2 — Chargement FTS (`tsvector`) lexical

- **Goal :** Charger titres/topics/mots-clés du mart dans les colonnes `tsvector`, index GIN, pour la recherche plein-texte.
- **Files (read) :** mart (3.4), schéma 4.1, validateur de contrat 3.6.
- **Files (write) :** loader lexical (lit le Parquet validé, peuple `tsvector`), index GIN, requêtes FTS de base (réutilisées par `atlas-api` Phase 5).
- **Invariants à préserver :** **validation du contrat avant chargement** (refus d'une `schema_version` inconnue) ; chargement par **remplacement de partition** (idempotent, pas de doublon) ; périmètre servi (hors opposition) uniquement.
- **Validation :** `pnpm ci:checks` ; sur fixtures : une requête FTS renvoie les œuvres attendues, ranking cohérent.
- **Done criteria :** FTS chargé et indexé (GIN), requête lexicale testée.
- **PR title :** `feat(citation): chargement FTS tsvector (lexical)`

### Étape 4.3 — Chargement vecteurs + index pgvector (sémantique)

- **Goal :** Charger les embeddings `all-MiniLM-L6-v2` **déjà produits** par `researcher-profiles` dans la colonne `vector(384)` de la table **`researchers`** (un vecteur **par chercheur**, clé `researcherId`), créer l'index pgvector (HNSW/IVFFlat), pour la recherche sémantique kNN de chercheurs.
- **Files (read) :** `packages/researcher-profiles/src/services/embedding-profile.ts` (type `EmbeddingProfile { researcherId, vector }`, embeddings ONNX CPU réutilisés tels quels), schéma 4.1.
- **Files (write) :** loader vectoriel (alimente `researchers.vector(384)` depuis les `EmbeddingProfile` existants), index pgvector + paramètres (lists/ef), requête kNN de base.
- **Invariants à préserver :** **aucun nouveau modèle, aucun GPU** (embeddings réutilisés) ; **un vecteur par chercheur** (pas par work) ; dimension 384 cohérente avec `all-MiniLM-L6-v2` ; chargement idempotent ; validation du contrat avant chargement.
- **Validation :** `pnpm ci:checks` ; sur fixtures : une requête kNN renvoie les voisins sémantiques attendus.
- **Done criteria :** vecteurs chargés, index pgvector créé, requête sémantique testée.
- **PR title :** `feat(citation): index pgvector (recherche sémantique)`

### Étape 4.4 — Asset Dagster de matérialisation mart→Postgres

- **Goal :** Orchestrer le chargement (4.2 + 4.3) comme **asset Dagster `index_load`** en aval du mart (lineage OpenLineage continué jusqu'à l'index), avec validation du contrat et idempotence par partition.
- **Files (read) :** loaders 4.2/4.3, validateur 3.6, schedule du pipeline (3.4).
- **Files (write) :** asset `index_load` (dépend de l'asset mart), asset check de cohérence (count Postgres == `row_count` du manifest), wiring OpenLineage.
- **Invariants à préserver :** l'index n'est chargé qu'à partir d'une partition **validée** ; recharge = remplacement (pas de doublon) ; purge des chercheurs s'étant opposés propagée (lien 3.7).
- **Validation :** `pnpm ci:checks` ; sur banc/fixtures : l'asset `index_load` se matérialise après le mart, l'asset check de cohérence passe, le lineage va jusqu'à l'index dans Marquez.
- **Done criteria :** asset `index_load` orchestré, cohérence vérifiée, lineage complet.
- **PR title :** `feat(citation): asset Dagster de chargement de l'index`

---

## Phase 5 — Scoring déterministe + `atlas-api` (métier + EXPLORATION) (dépôt `atlas`)

**Objectif.** Brancher le **3ᵉ signal** (citations croisées) sur `EnsembleWeights` à **poids fixes** (déterministe, pas de modèle entraîné), puis créer **`atlas-api`** (clone du patron `services/crf` : Hono + OpenAPI 3.1 + Scalar) avec **deux rôles** : **(a) métier** — `/recommendations` (paires scorées) + `/summary` (résumé **extractif**) ; **(b) exploration/vérification** — `/search` (FTS lexical **+** pgvector sémantique), **filtres structurés** (`/works`, `/authorships`, `/pairs` par chercheur/run/partition/institution/période), `/stats`. **Cache local sur PVC RBD** (découple la latence du RGW), **métriques Prometheus**, **auth obligatoire** (RGPD, [ADR 0030](../decisions/0030-rgpd-profilage-collaborations) — y compris routes d'exploration).
**Dépendances.** Phase 3 (mart + contrat), Phase 4 (index Postgres/pgvector). Phase 1 (déploiement + monitoring) pour la prod.
**Parallélisable ?** 5.1 (3ᵉ signal) indépendant de 5.2 (squelette API). 5.3 (lecture mart + cache RBD), 5.4 (endpoints métier), 5.5 (endpoints exploration), 5.6 (métriques) après 5.2.
**Critère de sortie de phase.** `atlas-api` lit le mart validé (contrat 3.6) **et** l'index Postgres (Phase 4), répond à `/recommendations` (3 signaux pondérés fixes), `/summary` (extractif), `/search` (lexical + sémantique), aux filtres structurés et à `/stats` ; expose `/metrics` scrappé par Prometheus ; sert depuis le cache RBD quand le RGW est indisponible ; **refuse tout accès non authentifié**. OpenAPI 3.1 + Scalar servis. `pnpm ci:checks` vert.

### Étape 5.1 — 3ᵉ signal sur `EnsembleWeights` (poids fixes)

- **Goal :** Ajouter le signal `cross_citations` à l'ensemble de scoring, au point d'extension `EnsembleWeights` existant (`packages/researcher-profiles/src/services/ensemble.ts`, aujourd'hui `{tfidf, embedding}`) ; poids **fixes** (déterministe), pas d'apprentissage.
- **Files (read) :** `packages/researcher-profiles/src/services/ensemble.ts`, `scorer.ts`, `EnsembleWeights`, feature 3.3.
- **Files (write) :** extension de `EnsembleWeights` avec le 3ᵉ poids, intégration de la feature dans le score, tests de pondération.
- **Invariants à préserver :** déterminisme (mêmes entrées → même score) ; les deux signaux existants inchangés en comportement ; poids documentés (justification dans l'ADR 0029).
- **Validation :** `pnpm ci:checks` ; test : score d'une paire à citations croisées connues == valeur attendue par la combinaison pondérée.
- **Done criteria :** 3ᵉ signal branché, poids fixes documentés, tests verts.
- **PR title :** `feat(researcher-profiles): signal citations croisées dans EnsembleWeights`

### Étape 5.2 — Squelette `atlas-api` (clone patron `services/crf`)

- **Goal :** Créer `services/atlas-api` à partir du patron `services/crf/src/server/app.ts` : Hono + OpenAPI 3.1 + Scalar, healthcheck, structure de handlers, headers de sécurité (CSP).
- **Files (read) :** `services/crf/src/server/app.ts` (patron), `services/crf/` (structure).
- **Files (write) :** `services/atlas-api/` (app Hono, doc OpenAPI 3.1, Scalar, Dockerfile) ; ajout du scope `atlas-api` au `scope-enum` de `commitlint.config.js`.
- **Invariants à préserver :** standardisation handler→app identique à `crf` ; CSP/headers repris ; nommage `citation`/`atlas` (pas de marque).
- **Validation :** `pnpm ci:checks` ; `atlas-api` démarre, `/health` OK, doc OpenAPI servie, Scalar accessible.
- **Done criteria :** service démarrable, OpenAPI 3.1 valide, Scalar servi.
- **PR title :** `feat(atlas-api): squelette Hono + OpenAPI 3.1 (patron crf)`

### Étape 5.3 — Lecture du mart validé + cache local RBD

- **Goal :** `atlas-api` lit le mart via l'accès lakehouse (3.1), **valide le contrat** (3.6) avant lecture, et maintient un **cache local sur PVC RBD** pour servir même si le RGW est indisponible (rappel : EC 2+1, perte d'1 nœud bloque les I/O datalake).
- **Files (read) :** accès lakehouse 3.1, validateur 3.6, manifest 3.4.
- **Files (write) :** couche d'accès au mart dans `atlas-api`, logique de cache RBD (télécharge la dernière partition valide, sert depuis le cache), PVC RBD (RWO) dans les manifestes applicatifs.
- **Invariants à préserver :** validation du contrat **avant** lecture ; `schema_version` inconnue → 503/erreur explicite, pas de réponse silencieuse ; le cache ne sert qu'une partition **validée** ; refus de servir une partition sans manifest.
- **Validation :** `pnpm ci:checks` ; test : RGW coupé → `atlas-api` sert depuis le cache RBD ; manifest corrompu → refus.
- **Done criteria :** lecture validée + cache RBD testés (dégradation gracieuse).
- **PR title :** `feat(atlas-api): lecture du mart validé + cache RBD`

### Étape 5.4 — Endpoints métier `/recommendations` + `/summary`

- **Goal :** `/recommendations` (paires nominatives scorées par les 3 signaux pondérés fixes, 5.1) et `/summary` (résumé **extractif déterministe**, template à trous depuis `match-formatter` : `sharedDomains`/`distinctTopicsA`/`distinctTopicsB`/`sharedKeywords`, **pas de LLM**).
- **Files (read) :** `match-formatter.ts`, scoring 5.1, données du mart (3.3/3.4).
- **Files (write) :** endpoints `/recommendations` + `/summary` dans `atlas-api`, formateur de template extractif.
- **Invariants à préserver :** déterminisme (mêmes entrées → même texte) ; pas d'appel génératif (LLM = palier 2) ; explicabilité conservée ; **auth obligatoire** (route nominative).
- **Validation :** `pnpm ci:checks` ; golden test sur un résumé pour une paire de fixtures ; `/recommendations` ordonne par score attendu.
- **Done criteria :** `/recommendations` + `/summary` stables, golden test vert, auth exigée.
- **PR title :** `feat(atlas-api): endpoints métier /recommendations + /summary`

### Étape 5.5 — Endpoints exploration `/search` + filtres structurés + `/stats`

- **Goal :** Le **second rôle** (demande explicite) : `/search` (recherche **lexicale FTS** _et_ **sémantique pgvector**, Phase 4), **filtrage structuré** `/works` `/authorships` `/pairs` (filtres chercheur/run/partition/institution/période → **vérification/débogage** de l'indexation), `/stats` (compteurs par partition/run). En **lecture seule** sur l'index Postgres ; **n'invalide pas** le contrat Parquet (qui reste batch).
- **Files (read) :** module d'accès Postgres (4.1), requêtes FTS (4.2) et kNN (4.3).
- **Files (write) :** endpoints d'exploration dans `atlas-api` (schémas OpenAPI 3.1 typés, pagination, filtres), client de l'index Postgres.
- **Invariants à préserver :** **auth obligatoire y compris ici** ([ADR 0030](../decisions/0030-rgpd-profilage-collaborations) : toute route nominative, exploration comprise) ; lecture seule (aucune écriture via l'API) ; périmètre servi (hors opposition) ; cardinalité maîtrisée (pas de fuite de volumétrie).
- **Validation :** `pnpm ci:checks` ; `/search?mode=lexical` et `?mode=semantic` renvoient des résultats cohérents sur fixtures ; un filtre par run/partition isole la bonne tranche ; accès non authentifié refusé.
- **Done criteria :** `/search` (lexical+sémantique), filtres structurés, `/stats` opérationnels et authentifiés.
- **PR title :** `feat(atlas-api): exploration /search + filtres structurés + /stats`

### Étape 5.6 — Métriques Prometheus custom

- **Goal :** Exposer `/metrics` (latence, hits/miss du cache RBD, fraîcheur de la partition servie, refus de contrat, latence FTS/kNN) scrappé par le Prometheus de la Phase 1.
- **Files (read) :** `atlas-api` (5.2–5.5), patron observabilité du dépôt.
- **Files (write) :** instrumentation + `/metrics`, `ServiceMonitor` (manifeste applicatif `atlas`), dashboard Grafana de base (provisionné).
- **Invariants à préserver :** **pas de donnée personnelle dans les labels** (cardinalité + RGPD) ; `/metrics` non exposé publiquement (interne au scrape).
- **Validation :** `pnpm ci:checks` ; sur banc : Prometheus scrappe `atlas-api`, métriques visibles dans Grafana.
- **Done criteria :** `/metrics` + `ServiceMonitor` + dashboard ; scrape vérifié.
- **PR title :** `feat(atlas-api): métriques Prometheus custom`

---

## Phase 6 — PWA `find-an-expert` + exposition (dépôt `atlas`)

**Objectif.** Transformer `find-an-expert` (SvelteKit) en **PWA** (`vite-plugin-pwa`, Workbox, Dexie offline), brancher la consommation d'`atlas-api` (**recommandations + résumé + recherche**), garantir la qualité via **Lighthouse CI**, exposer via **ingress + TLS** (Phase 1) avec **auth obligatoire** (Appwrite).
**Dépendances.** Phase 5 (`atlas-api`). Phase 1 (ingress + TLS). Auth Appwrite et dispositif `consent-events` (réinterprété en registre d'opposition) déjà présents dans `find-an-expert`.
**Parallélisable ?** 6.1 (PWA) et 6.3 (Lighthouse CI) indépendants de 6.2 (intégration API). 6.4 (exposition) en dernier.
**Critère de sortie de phase.** `find-an-expert` est installable (PWA), consomme recommandations/résumés/recherche via `atlas-api` derrière auth, fonctionne hors-ligne (Dexie) pour les données déjà chargées, passe les seuils Lighthouse CI, est exposée en HTTPS via l'ingress. `pnpm ci:checks` vert.

### Étape 6.1 — PWA (vite-plugin-pwa + Workbox + Dexie)

- **Goal :** Rendre `find-an-expert` installable et résiliente hors-ligne.
- **Files (read) :** `apps/find-an-expert/` (SvelteKit, auth/consentement Appwrite).
- **Files (write) :** config `vite-plugin-pwa`/Workbox (manifest web, service worker, stratégies de cache), store Dexie pour le cache offline.
- **Invariants à préserver :** flux d'auth Appwrite et dispositif `consent-events` (`ConsentStatusCard`, `/api/v1/consents`) **inchangés** (réinterprétés comme registre d'opposition) ; pas de cache offline de données nominatives de personnes opposées ; [ADR 0020](../decisions/0020-svelte-eslint-strict) (ESLint Svelte strict).
- **Validation :** `pnpm ci:checks` ; build PWA ; service worker enregistré ; installation testée.
- **Done criteria :** app installable, service worker actif, cache offline Dexie fonctionnel.
- **PR title :** `feat(find-an-expert): PWA (vite-plugin-pwa + Workbox + Dexie)`

### Étape 6.2 — Intégration `atlas-api` (reco + résumé + recherche)

- **Goal :** Consommer `/recommendations`, `/summary` **et `/search`** d'`atlas-api` depuis la PWA, derrière auth.
- **Files (read) :** OpenAPI d'`atlas-api` (Phase 5), `find-an-expert` (couche data).
- **Files (write) :** client API typé (généré depuis l'OpenAPI), vues recommandations + résumé + **recherche**, gestion d'erreur (contrat refusé → message clair).
- **Invariants à préserver :** appels authentifiés uniquement ; affichage filtré par les alliances/projets déclarés par l'utilisateur (filtre d'affichage), sur le périmètre servi (hors opposition) ; pas d'appel non authentifié à `atlas-api`.
- **Validation :** `pnpm ci:checks` ; test e2e/composant : une recommandation + son résumé + une recherche s'affichent pour un utilisateur authentifié de fixture.
- **Done criteria :** reco + résumés + recherche affichés derrière auth, erreurs gérées.
- **PR title :** `feat(find-an-expert): consommation d'atlas-api (reco + résumé + recherche)`

### Étape 6.3 — Lighthouse CI

- **Goal :** Garde-fou qualité PWA (perf, a11y, best-practices, PWA installability) en CI.
- **Files (read) :** workflow CI existant, budget bundle déjà en place.
- **Files (write) :** config Lighthouse CI + seuils, job CI.
- **Invariants à préserver :** seuils réalistes (pas de faux-vert) ; cohérence avec le budget bundle existant.
- **Validation :** `pnpm ci:checks` ; run Lighthouse CI passant les seuils.
- **Done criteria :** Lighthouse CI branché, seuils définis et atteints.
- **PR title :** `ci(find-an-expert): Lighthouse CI`

### Étape 6.4 — Exposition via ingress + TLS, auth obligatoire

- **Goal :** Exposer la PWA en HTTPS via l'ingress (Phase 1), auth obligatoire pour tout accès au mart/index nominatif.
- **Files (read) :** `platform/ingress-nginx` + `cert-manager` (côté cluster), manifestes applicatifs `find-an-expert`.
- **Files (write) :** Ingress `find-an-expert` (namespace `citation-pwa`) avec TLS cert-manager, `Application` Argo CD, NetworkPolicy.
- **Invariants à préserver :** **aucun accès non authentifié** à un mart/index nominatif (lien ADR 0030) ; TLS obligatoire avant exposition d'un mart nominatif ([ADR cluster 0003](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0003-pas-de-chiffrement-ceph-tailscale.md) : TLS interne absent → bordure = point de chiffrement) ; default-deny respecté.
- **Validation :** `pnpm ci:checks` ; sur banc : la PWA répond en HTTPS via l'ingress, accès non authentifié refusé.
- **Done criteria :** PWA exposée en HTTPS, auth obligatoire vérifiée, réconciliée par Argo CD.
- **PR title :** `feat(find-an-expert): exposition ingress + TLS, auth obligatoire`

---

## Phase 7 — DevSecOps images (dépôt `atlas`)

**Objectif.** Signer les images conteneur (cosign / provenance SLSA), produire un **SBOM** et **scanner** (Trivy). Aujourd'hui inexistant : `release.yml` ne fait que la provenance npm OIDC.
**Dépendances.** Au moins une image existe (Phase 2). Transverse : applicable à toutes les images (code-location Dagster `citation-ingest`, `atlas-api`, `find-an-expert`).
**Parallélisable ?** 7.1 (signature) → 7.2 (vérification au déploiement). 7.3 (SBOM + Trivy) indépendant.
**Critère de sortie de phase.** Chaque image publiée sur le registry interne est signée (cosign), accompagnée d'une provenance SLSA et d'un SBOM, scannée par Trivy en CI (seuil de sévérité bloquant défini) ; le cluster peut (à terme) vérifier la signature. `pnpm ci:checks` vert.

### Étape 7.1 — Signature cosign + provenance SLSA des images

- **Goal :** Signer chaque image au build (cosign, keyless OIDC si possible) et attacher une attestation de provenance SLSA.
- **Files (read) :** `.github/workflows/release.yml` (provenance npm existante), Dockerfiles des services/code-locations.
- **Files (write) :** job CI build+sign+attest des images, push signé vers le registry interne.
- **Invariants à préserver :** hooks/CI non bypassés ; registry interne HTTP sans auth ([ADR cluster 0011](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0011-registry-http-sans-auth.md)) → documenter la limite (signature vérifiable même sans auth registry).
- **Validation :** `pnpm ci:checks` ; `cosign verify` sur une image publiée passe.
- **Done criteria :** images signées + attestation SLSA ; vérification cosign documentée.
- **PR title :** `ci: signature cosign + provenance SLSA des images`

### Étape 7.2 — Vérification de signature au déploiement

- **Goal :** N'admettre que des images signées. Le benchmark DevSecOps ne nomme que **cosign** et **Trivy** : la vérification peut passer par une **cosign policy** (admission via `policy-controller` Sigstore) ou la vérification Argo CD ; **Kyverno** est une **option locale** (hors benchmark) si une policy d'admission plus générale est souhaitée.
- **Files (read) :** étape 7.1 ; **artefact côté `cluster`** (policy d'admission) — coordination inter-dépôt.
- **Files (write) :** côté `atlas` : doc de la clé/issuer ; **côté `cluster`** : policy d'admission (PR séparée dans `../cluster`).
- **Invariants à préserver :** ne pas bloquer les images d'infra existantes non encore signées (rollout progressif) ; tester sur banc Vagrant d'abord.
- **Validation :** sur banc : déploiement d'une image non signée refusé, image signée admise.
- **Done criteria :** policy de vérification sur le banc ; rollout documenté.
- **PR title (cluster) :** `feat(platform): admission des images signées (cosign)`

### Étape 7.3 — SBOM + scan Trivy

- **Goal :** Générer un SBOM par image et scanner les vulnérabilités (Trivy) en CI, seuil de sévérité bloquant.
- **Files (read) :** Dockerfiles, CI.
- **Files (write) :** génération SBOM attachée à l'image (**Trivy** la produit nativement — c'est l'outil du benchmark ; `syft` reste une option locale si un SBOM CycloneDX/SPDX dédié est requis), job Trivy en CI, seuil bloquant documenté.
- **Invariants à préserver :** seuil réaliste (CRITICAL bloquant, HIGH alerte au minimum) ; pas de faux-vert ; SBOM attaché comme attestation.
- **Validation :** `pnpm ci:checks` ; Trivy en CI échoue sur une vuln CRITICAL injectée de test, passe sinon.
- **Done criteria :** SBOM par image + scan Trivy bloquant en CI.
- **PR title :** `ci: SBOM + scan Trivy des images`

---

## Palier 2 — hors V1, en ligne de mire

Explicitement **hors périmètre V1**, nommés pour ne pas être réinventés et pour garder les points d'extension ouverts :

- **Iceberg.** Migration `Parquet → Iceberg` **non destructive** quand un besoin de time-travel/upsert/évolution de schéma transactionnelle se mesure. Le contrat `manifest.json` (`schema_version`) est le point de bascule ; DuckDB/Dagster restent les moteurs.
- **Modèle supervisé de prédiction d'excellence collaborative (+ MLflow).** Remplacer le scoring déterministe à poids fixes par un **modèle appris**. Cible : à partir des métadonnées des articles **récents (< 5 ans)** — co-auteurs, hiérarchie domain/field/subfield/topic + keywords, et **FWCI** (_Field-Weighted Citation Impact_, métadonnée OpenAlex au niveau _work_) — prédire pour un chercheur (a) sa **prochaine thématique d'excellence** et (b) les **profils de chercheurs** formant une **collaboration d'excellence**, puis filtrer les chercheurs correspondants. **Label = co-publication future** (split **temporel** : features sur `[..T]`, observation sur `[T+1, T+n]`, anti-fuite). Modèle **léger CPU** (régression logistique / gradient boosting type LightGBM/scikit-learn, **aucun GPU**), entraîné dans un **asset Dagster**, tracé/versionné via **MLflow** (registry + artifact store sur le S3 Ceph). **Prérequis : ingérer le FWCI** (absent des types actuels — chantier d'ingestion à part, voir Risques). Le point d'extension `EnsembleWeights` reste l'interface (les poids passent de fixes à appris).
- **LLM génératif (Ollama CPU).** Résumés **pré-calculés en batch** avec Mistral-7B-Instruct (Apache-2.0), poids **mirrorés sur le registry interne**. Justification du report : aucun GPU au cluster → un 7B CPU = dizaines de secondes/résumé, rédhibitoire en synchrone. Les résumés extractifs (Phase 5.4) restent le défaut.
- **KServe / serving versionné.** Si un modèle calibré (MLflow) est introduit.
- **Drift.** Détection de dérive de données/score une fois un modèle entraîné en place (au-delà des asset checks Great Expectations).
- **Feast.** **Seulement si** un cas de train/serve skew apparaît (streaming) — aujourd'hui sur-dimensionné pour un batch mensuel mono-producteur.

---

## Risques & questions ouvertes

- **GPU absent.** Aucun GPU sur les 4 nœuds → tout LLM génératif est cantonné au batch (palier 2). La V1 ne dépend d'aucun GPU (embeddings ONNX `all-MiniLM-L6-v2` en CPU, scoring déterministe, résumés extractifs, recherche pgvector/FTS). **Risque levé pour la V1**, bloquant pour le génératif synchrone.
- **Volumétrie des `referenced_works`.** L'ingestion des références (Phase 2.2) est la grande inconnue de charge : ratio références/œuvre potentiellement élevé → durée de run, taille du brut, **coût des jointures dbt/DuckDB** pour la feature citations croisées. **Action :** mesurer dès la Phase 2.2 sur un sous-périmètre, documenter, prévoir reprise/partitionnement plus fin si nécessaire. Peut imposer de revoir le rate-limit ou de paralléliser prudemment (sans dépasser 1 req/s côté source).
- **Modèle d'excellence collaborative (palier 2) — questions de fond.** Le modèle supervisé visé (prédire la prochaine thématique d'excellence et les collaborations d'excellence, label = co-publication future) soulève des questions à trancher au palier 2 : (a) **fenêtre temporelle** du split (taille de `[..T]` et de `[T+1, T+n]`) et son effet sur le volume de labels positifs (les co-publications sont rares → **classes déséquilibrées**) ; (b) **définition opérationnelle de « l'excellence »** à partir du FWCI (seuil ? FWCI moyen du collectif ? percentile par champ ?) ; (c) **biais** du label « co-publication future » (ne capture que la collaboration **formalisée**, ignore les collaborations informelles ou empêchées ; effet Matthieu — les chercheurs déjà excellents co-publient davantage) ; (d) **métrique d'évaluation** (precision@k du filtrage de chercheurs plutôt qu'accuracy, vu le déséquilibre). À documenter dans un ADR dédié au palier 2 avant d'entraîner quoi que ce soit. La V1 (scoring déterministe) ne dépend d'aucune de ces réponses.
- **Charge opérationnelle des nouveaux composants stateful.** La V1 introduit **trois sous-systèmes stateful neufs** à exploiter sur un cluster non-HA : **Dagster** (webserver + daemon + run workers + event log Postgres), **CloudNativePG** (Postgres : event log Dagster **+** index pgvector) et **Marquez** (store de lineage). Coûts induits : sauvegardes/restaurations Postgres, montées de version dbt/Dagster/Marquez, supervision et alerting de trois nouveaux sous-systèmes, gestion de schéma de l'index. **C'est le prix assumé du positionnement plateforme** (cf. ADR 0029, _Prix à payer_) ; à séquencer et documenter dans les RUNBOOK côté `cluster`. La perte d'1 nœud (EC 2+1) rend l'event log Dagster et l'index Postgres eux aussi sensibles à la disponibilité du stockage.
- **SPOF cluster non-HA assumés.** Control-plane unique ([ADR cluster 0002](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0002-control-plane-unique-avec-endpoint.md)) = SPOF de l'API. EC 2+1 `min_size=3` ([ADR cluster 0004](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0004-erasure-coding-2plus1-datalake.md)) → **perte d'1 nœud sur 4 bloque les I/O du datalake**, donc le pipeline, la lecture du mart, **et** désormais l'event log Dagster / l'index Postgres adossés au stockage. **Mitigation V1 :** cache local RBD d'`atlas-api` (Phase 5.3) pour servir en lecture pendant une indisponibilité du RGW ; le pipeline batch attend le rétablissement (tolérable car mensuel). HA control-plane et redondance datalake = hors V1, risques assumés et tracés.
- **Pas de TLS interne / pas de chiffrement at-rest** ([ADR cluster 0003](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0003-pas-de-chiffrement-ceph-tailscale.md)). Acceptable tant que tout est interne ; **à corriger avant exposition externe d'un mart ou d'un index nominatif** → terminaison TLS de bordure (Phase 1.3) + auth obligatoire (Phases 5–6). Le chiffrement at-rest reste un risque ouvert pour des données nominatives (Postgres et S3) — à arbitrer avec le DPO (Phase 0).
- **Appwrite auto-hébergé vs SaaS.** `find-an-expert` dépend de `node-appwrite` (~25.2.0, [ADR 0010](../decisions/0010-node-appwrite-sdk-25)) pour **l'auth ET le consentement** — ce n'est **pas** « zéro DB ». Deux options : (a) **auto-héberger** Appwrite (Appwrite + MariaDB + Redis) sur le cluster — non trivial mais souverain, cohérent avec le principe libre/souverain ; (b) **SaaS** Appwrite — casse la souveraineté, dépendance externe, transfert de données personnelles (impact RGPD). **Décision attendue :** option (a) par défaut, à acter dans un ADR dédié si retenue — chantier d'infra à part entière, à séquencer avant la mise en prod de la Phase 6.
- **Arbitrage RGPD institutionnel non revenu.** Le code peut avancer sur fixtures, mais la **mise en prod avec données nominatives** reste suspendue à la base légale / au responsable de traitement (Phase 0.3). Risque de planning : si l'arbitrage tarde, les Phases 1–7 sont livrables en dev/banc mais non déployables sur données réelles. **Mitigation :** tout développer sur données synthétiques, garder le déploiement prod derrière le gate.
- **`knip` cassé sur `main`.** Dette pré-existante au pré-push : à résorber en racine au fil des PRs, **jamais** contourner. Peut impacter le rythme des premières PRs touchant les paquets `citation` et la création d'`atlas-api`.
