---
title: Plan — Mise en production de la DataOps OpenAlex
---

> Date du plan : 2026-06-23. Cible : déployer le pipeline OpenAlex
> (`dataops/citation-dagster` + `dataops/citation-dbt`) en **profil prod (Ceph)**,
> conforme au **contrat d'interface cluster → atlas** mis à jour le 2026-06-23
> ([contrat cluster `contract/`](https://github.com/univ-lehavre/cluster/tree/main/contract),
> [ADR cluster 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md))
> et à sa nouvelle exposition **L4 NodePort**
> ([ADR cluster 0092](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0092-exposition-hostport-l4.md),
> [ADR cluster 0091](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0091-portail-acces-ui.md)).
> Socle applicatif : [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (vue dérivée du contrat),
> [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) (brut S3),
> [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (DataOps Python),
> [ADR 0058](/atlas/decisions/0058-report-index-load/) (index_load),
> [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) (MLOps tracking/drift/CT).

## Objectif

Mettre en production le pipeline OpenAlex de bout en bout : **ingestion**
(`raw_snapshot`) → **transform dbt** (staging → curated → marts) → **embeddings**
(`researcher_embeddings`) → **qualité** (Great Expectations) + **drift** (Evidently)
→ **manifests** (sentinelles Parquet) → **index_load** (pgvector). Déploiement
**GitOps via Argo CD** (jamais `kubectl apply`). Prod sur **Ceph** (overlay
`overlays/prod`) ; la **preuve applicative** se fait sur le banc **`atlas`
mono-nœud local-path** (`overlays/bench`, SeaweedFS) — même code applicatif qu'en
prod, seul le backing S3 diffère (action humaine, ADR cluster [0085](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0085-preuves-applicatives-local-path.md)/[0044](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0044-topologie-deploiement-banc-atlas.md)).

## État constaté (post-pull 2026-06-23, HEAD `3da16d93`)

Le pipeline est **complet et largement conforme** au contrat. Audit des points de
contact :

| Point de contact (contrat) | État atlas | Verdict |
| --- | --- | --- |
| StorageClass bucket `rook-ceph-datalake` | `overlays/prod/objectbucketclaim.yaml:21` | ✅ |
| Noms DNS **courts** (`marquez.marquez`, `mlflow.mlflow`, `pg-rw.postgres`) — piège ndots:5 prod | code + manifestes | ✅ |
| Postgres via Secret dérivé `pgvector-pg-auth` (secretKeyRef, ns `dagster`) | `definitions.py:77-92` | ✅ |
| Injection env pods de run pour OPENLINEAGE/MLFLOW (piège ADR 0086) | `definitions.py:51-64,93-101` | ✅ |
| Déploie uniquement en ns `dagster` (dans toutes les allowlists NetworkPolicy) | `deploy/base/code-location.yaml` | ✅ |
| Aucune UI attendant Gateway/`*.cluster.lan` (obsolète en L4 NodePort) | — | ✅ |
| **Accès S3 des pods de RUN en prod** | `definitions.py:61,98` | ❌ **bloquant** |

### Le seul écart bloquant prod : accès S3 des pods de run

`definitions.py` (lignes 61 et 98) code en dur, dans le tag `dagster-k8s/config`,
`env_from: secret_ref: citation-s3-access` pour les pods de run du K8sRunLauncher.

- **Banc** : le Secret `citation-s3-access` existe et **regroupe** `AWS_*` **et**
  `BUCKET_*` (`overlays/bench/s3-access.yaml`) → un seul `secret_ref` suffit.
- **Prod** : l'`ObjectBucketClaim` génère un **Secret** ET un **ConfigMap** tous
  deux nommés `atlas-datalake` (`overlays/prod/objectbucketclaim.yaml:17`). Les
  pods de run (a) référencent un **nom de Secret inexistant** et (b) n'ont **pas**
  de `config_map_ref` → ils ne reçoivent jamais `BUCKET_HOST/PORT/NAME`. **Les
  runs échouent en prod** (le `Deployment` de la code-location, lui, est correct :
  `overlays/prod/patch-s3-envfrom.yaml:23-27` branche bien Secret + ConfigMap).

`deploy/validate.sh` ne l'attrape pas : le nom du Secret des pods de run vit dans
le **Python**, pas dans le rendu kustomize.

## Lots de travail

### Lot 1 — Correctif bloquant : accès S3 des pods de run (prod) · **prérequis au déploiement**

Approche retenue : **paramétrage par variables d'environnement** (banc/prod
divergent sans dupliquer la logique d'injection).

- [ ] Le `Deployment` de chaque overlay pose le **nom** des sources S3 des pods de
  run : `CITATION_S3_SECRET` (banc : `citation-s3-access` ; prod : `atlas-datalake`)
  et, en prod uniquement, `CITATION_S3_CONFIGMAP` (`atlas-datalake`).
- [ ] `definitions.py` lit ces noms à la construction des Definitions et bâtit le
  `env_from` des tags run : `secret_ref` (toujours) + `config_map_ref` **si**
  `CITATION_S3_CONFIGMAP` est défini. Défaut sain = `citation-s3-access` (banc /
  checkout neuf), pour ne pas casser les tests ni le mode dégradé.
- [ ] Étendre `deploy/validate.sh` : vérifier que le rendu prod expose bien, pour
  les pods de run, le **même** nom de Secret que l'OBC (`atlas-datalake`) **et** un
  `config_map_ref` (croise Python ↔ manifeste, comme le garde déjà fait pour
  `MLFLOW_TRACKING_URI` et `:dev`).
- [ ] Tests : `test_definitions.py` couvre les deux profils (banc → 1 `secret_ref`
  sans configmap ; prod → `secret_ref` + `config_map_ref` aux bons noms).

**Prérequis déployeur (côté cluster, hors code atlas)** :
- Le Secret dérivé `pgvector-pg-auth` (clés `username`/`password`) doit exister en
  ns `dagster` — c'est dans le contrat (`namespaces-secrets`), responsabilité du
  socle.
- **NetworkPolicy egress `dagster → mlflow:5000`** — _**RÉSOLU côté infra**
  (2026-06-23)_. Sous double default-deny, il fallait ouvrir l'egress côté `dagster`
  (l'ingress MLflow l'était déjà) ; sans lui, le logging MLflow (instrumentation
  #397, métriques de drift du CT) tombait en no-op silencieux en prod. La policy
  `allow-mlflow-egress` est livrée dans cluster main (PR #408) et **vérifiée sur
  dirqual** ([univ-lehavre/cluster#407](https://github.com/univ-lehavre/cluster/issues/407),
  [#404](https://github.com/univ-lehavre/cluster/issues/404)). La **preuve e2e** du flux
  drift+CT se fait désormais sur le banc **`atlas` local-path** (et non un banc Ceph
  multi-nœud irréalisable en ressources) — [ADR cluster 0085](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0085-preuves-applicatives-local-path.md)
  requalifie #404/#407 en preuve `atlas`. Plus de blocage pour les Lots 5/6/7.

### Lot 2 — Durcissement prod de la code-location (qualité) · [#400](https://github.com/univ-lehavre/atlas/issues/400)

- [ ] `resources` requests/limits sur le conteneur gRPC (aujourd'hui aucun → QoS
  BestEffort, premier tué sous pression mémoire).
- [ ] `livenessProbe` (en plus de la `readinessProbe` TCP existante).
- [ ] `PodDisruptionBudget` (`minAvailable: 1`) — aujourd'hui `replicas:1` sans PDB
  = SPOF lors d'un drain de nœud.
- [ ] Tag d'image **immuable réel** dans l'overlay prod (remplacer l'exemple
  `0.0.0`), aligné `images[].newTag` ↔ `DAGSTER_CURRENT_IMAGE` (garde `validate.sh`
  déjà en place pour l'absence de `:dev`).

### Lot 3 — Doc : exposition L4 NodePort · [#430](https://github.com/univ-lehavre/atlas/issues/430)

- [ ] Aligner `docs/src/content/docs/plans/2026-06-02-pipeline-collaborations.md`
  (L24, L128–131, L442–443, L513) : remplacer Gateway Cilium L7 + LB-IPAM +
  `*.cluster.lan` par **L4 NodePort** (`http://<IP-nœud>:<nodePort>`, zéro DNS/LB/
  Gateway). Endpoints **intra-cluster** consommés par atlas inchangés (noms courts).

### Lot 4 — Visibilité qualité depuis le portail · [#431](https://github.com/univ-lehavre/atlas/issues/431)

- [ ] `mlflow.log_artifact()` du **HTML Evidently** dans `assets/drift.py` (1–2
  lignes) → rapport visuel consultable dans l'UI MLflow (déjà exposée en NodePort).
- [ ] Idem Great Expectations : publier les data docs / résultats de validation
  comme artefact MLflow. Gain immédiat, zéro infra, zéro couplage cluster↔atlas.

### Lot 5 — Entraînement continu (CT) : armer le `@schedule` · [#399](https://github.com/univ-lehavre/atlas/issues/399)

Le CT **existe déjà en capacité** dans le code : `transform_daily`
(`definitions.py:192-199`), un `@schedule` Dagster qui rejoue `transform_job`
(dbt → embeddings → index), **STOPPED par défaut**. C'est exactement la posture
[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) : « le dépôt
**permet** la cadence ; **activer** le schedule et **fixer sa fréquence** relèvent
du **déployeur** — le code n'impose pas un rythme » (lignes 109-111).

**Décision d'instance pour cette prod : CT par `@schedule` seul (pas de `@sensor`),
cadence MENSUELLE** (alignée sur le rythme de publication des snapshots OpenAlex ;
réentraîner plus souvent retraiterait des données quasi identiques). La décision
drift → ajuster la cadence reste **humaine** (le verdict d'`evidently_embedding_drift`
informe, ne déclenche pas).

> ⚠️ **Doctrine ADR 0062 — ne PAS figer la cadence dans le code générique.** Le
> cron `0 2 * * *` de `definitions.py` est un **exemple** ; le passer en mensuel
> **en dur** imposerait un rythme à toute instance, ce que l'ADR interdit. La
> cadence mensuelle est une **valeur d'instance** : elle se pose à l'**armement**
> (UI Dagster, ou variable d'env d'instance lue par le `ScheduleDefinition` si on
> veut la rendre configurable sans toucher au code commun — ex.
> `CITATION_CT_CRON`, défaut = l'exemple actuel). Le code commun reste « capacité,
> pas décision ».

- [ ] (Optionnel, qualité) Rendre le cron du `@schedule` **configurable par env
  d'instance** (`CITATION_CT_CRON`, défaut inchangé) plutôt qu'en littéral — pour
  que le déployeur fixe « mensuel » sans modifier le code générique. Sinon,
  override de cadence directement à l'armement côté UI Dagster.
- [ ] **Préalables à l'armement** (sinon CT automatique dangereux) :
  - idempotence du rejeu `transform_job` : chaque run écrit sous
    `dt=…/run=<run_id>/` (immuable) → un rejeu ne corrompt pas l'existant ✅ (acté
    ADR 0058/0059) — à **reconfirmer** par un double-run au banc.
  - watermark de l'ingestion **non atomique / séquentiel only** (`watermark.py`) :
    le CT ne porte QUE `transform_job` (pas `ingestion_job`), donc pas de course
    sur le watermark — **vérifier** qu'aucun chevauchement schedule ↔ ingestion
    manuelle ne réécrit le watermark concurremment.
    - politique de **concurrence** des runs schedulés (un run mensuel ne doit pas
    se superposer au précédent s'il déborde) — `max_concurrent_runs` / tag de
    concurrence Dagster à acter.
- [ ] Armer `transform_daily` dans l'UI Dagster **une fois** la prod fonctionnelle
  (Lot 8) et la cadence mensuelle posée — pas de re-training silencieux non voulu.

### Lot 6 — Instrumentation MLflow de `researcher_embeddings` · [#397](https://github.com/univ-lehavre/atlas/issues/397)

Aujourd'hui le seul « registre » du modèle est le `sha256` figé de
`scripts/fetch_model.py` ; l'asset `researcher_embeddings` émet déjà du lineage
mais **aucun run/param/métrique MLflow** ni enregistrement au model registry.
100 % **code applicatif** (frontière ADR 0033 : on ne déploie pas le serveur
MLflow, on lit `MLFLOW_TRACKING_URI` et on instrumente — comme le lineage).

- [ ] Dépendance `mlflow` épinglée dans `pyproject.toml` (déjà `mlflow-skinny`
  présent — **vérifier** s'il suffit pour le model registry, sinon `mlflow`
  complet) + `uv.lock` régénéré.
- [ ] Module pur `tracking.py` : `mlflow_config_from_env()` (patron `resources.py`,
  helper `_require`), experiment `citation-*` configurable. **No-op sans
  `MLFLOW_TRACKING_URI`** (early-return documenté, parité avec `lineage.emit`) →
  CI/tests restent hermétiques (ADR 0057).
- [ ] Dans `researcher_embeddings` (`assets/researcher_embeddings.py:163-232`) :
  run MLflow autour du calcul ; **params** = révision HF (`_HF_REVISION`), repo HF,
  `sha256` des fichiers (réutiliser les constantes de `fetch_model.py`, ne pas les
  redéfinir), `EMBEDDING_DIM`, `MAX_LENGTH`, `TEXT_TOPIC_SCORE_MIN`, partition
  `dt=…/run=…` ; **métriques** = `work_vectors`, `author_vectors` (déjà dans le
  `MaterializeResult`) + une mesure de complétude (ex. nb d'`author_id` au vecteur
  nul). URI/run reporté dans `MetadataValue` du `MaterializeResult`.
- [ ] Enregistrer `all-MiniLM-L6-v2` au **model registry** sous un nom `citation-*`,
  tags = révision HF figée + sha256 (la version registry pointe la révision exacte,
  pas `main`).
- [ ] **Invariants** : aucune PII dans params/métriques/tags (ADR 0030, vérifié par
  test) ; nommage `citation` jamais une marque (ADR 0022) ; aucune I/O réseau
  ajoutée au runtime de l'embedding (déterminisme/parité `embedding-profile.ts`).
- [ ] Tests hermétiques : (a) no-op sans `MLFLOW_TRACKING_URI` (zéro réseau) ;
  (b) params/métriques contre un client MLflow mocké ; (c) aucune PII loggée.
- [ ] README MLOps + docstring renvoyant à l'ADR 0062.

### Lot 7 — CT par signal : `@sensor` watermark → `transform_job` · [#399](https://github.com/univ-lehavre/atlas/issues/399)

Complète le `@schedule` du Lot 5 par un déclencheur **sémantique** : réentraîner
quand il y a *vraiment* de la donnée neuve, pas seulement au calendrier. Le
`@sensor` se branche sur l'**avancée du watermark** (`raw/_watermark.json`,
`watermark.py`) ou l'apparition d'une nouvelle partition brute → relie
ingestion → transform.

- [ ] `@sensor` ciblant `transform_job`, **désactivé par défaut**
  (`DefaultSensorStatus.STOPPED`) — capacité, pas décision (ADR 0062/0031). Évalue
  l'avancée du watermark sans I/O bloquante non maîtrisée.
- [ ] Enregistrement **conditionnel** (`if _dbt_assets:` uniquement, parité avec
  `transform_job` et le schedule) → la code-location reste chargeable en mode
  dégradé. Ajouter `sensors=` à `Definitions` dans cette seule branche.
- [ ] Chaque déclenchement = `run_id` distinct → partition `dt=…/run=…` neuve
  immuable (ADR 0054) ; documenter la dérivation de `dt` si elle devient dynamique
  (attention au placeholder `CURATED_DT = "0000-00"`).
- [ ] Tests hermétiques : (a) code-location chargeable avec le sensor quand
  `transform_job` existe ; (b) chargeable en mode dégradé sans sensor ; (c) sensor
  STOPPED par défaut ; (d) déclenche sur watermark neuf et pas autrement.
- [ ] **Coexistence schedule + sensor** : éviter le double-déclenchement (sensor sur
  donnée neuve + schedule mensuel sur la même fenêtre) → politique de concurrence
  / dédup de run-key à acter (lien Lot 5).
- [ ] README : nom du sensor, STOPPED par défaut, armement déployeur, renvoi 0062.

> Le sensor ne ferme `#399` **pleinement** qu'avec le schedule (Lot 5) : ensemble
> ils couvrent « `@schedule` **ou** `@sensor` ». Décision : armer d'abord le
> schedule mensuel (Lot 5), le sensor watermark suit (option fine).

### Lot 8 — Bascule production

> **Action HUMAINE** : preuve applicative sur le banc **`atlas` (local-path)**
> avant la prod sur Ceph (ADR cluster 0085/0044) — aucun agent ne la déclenche. La
> procédure pas à pas est le **runbook**
> [`deploy/RUNBOOK.md`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/deploy/RUNBOOK.md)
> et le script [`deploy/install.sh`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/deploy/install.sh)
> — build + tag immuable, **push Gitea** (déclencheur GitOps, pas GitHub),
> réconciliation Argo CD, preuve `atlas`, soupape Ceph si le diff touche le S3, rollback.

- [ ] `validate.sh` vert (build + kubeconform + invariants des deux overlays).
- [ ] Image taguée immuable, poussée sur le registry interne (`registry:80`) ; tag
  figé dans l'overlay prod (`newTag` + `DAGSTER_CURRENT_IMAGE` alignés).
- [ ] Manifestes (overlay `prod` + `Application` Argo CD) **poussés sur Gitea
  intra-banc** → webhook → Argo CD réconcilie — **jamais** `kubectl apply`.
- [ ] `Application` `citation-dagster` **Synced + Healthy** ; code-location visible
  dans l'UI Dagster.
- [ ] Run réel **sur le banc `atlas` (local-path, `overlays/bench`)** d'abord :
  `ingestion_job` puis `transform_job` ;
  vérifier dans les pods de run que `AWS_*`/`BUCKET_*`, `OPENLINEAGE_URL`,
  `MLFLOW_TRACKING_URI`, `POSTGRES_*` sont présents (pas de no-op silencieux), que
  Marquez reçoit le lineage et MLflow les runs/métriques.
- [ ] Double-run de `transform_job` au banc → confirmer l'idempotence (préalable CT,
  Lot 5).

## Ordre & dépendances

- **Lot 1** (correctif S3 run-pods) est **bloquant** : avant toute bascule.
- **Lots 2, 3, 4, 6, 7** sont indépendants et parallélisables (une PR chacun,
  additifs). Lot 6 (MLflow) et Lot 7 (sensor) sont du code applicatif pur, sans
  dépendance d'infra à l'écriture/aux tests (hermétiques).
- **Lot 8** (bascule prod) dépend de Lot 1, idéalement Lot 2.
- **Lot 5** (armement CT) dépend de Lot 8 (prod fonctionnelle + idempotence
  reconfirmée). La dépendance infra [cluster#407](https://github.com/univ-lehavre/cluster/issues/407)
  (egress MLflow) est **levée** (vérifiée dirqual 2026-06-23) ; la **preuve e2e** du
  flux drift+CT se fait sur le banc **`atlas` local-path** (ADR cluster 0085, plus de
  banc Ceph applicatif). Les Lots 6/7 ne sont donc plus bloqués.
- Doc (Lot 3) et portail (Lot 4, #431) ne bloquent pas le déploiement fonctionnel
  mais relèvent de la « définition de fini ».

**Frontière cluster.** Aucune issue cluster nouvelle à créer pour cette mise en
prod : #397 et #399 sont 100 % atlas (code applicatif, le serveur MLflow et
l'orchestrateur Dagster restent fournis par le socle, ADR 0033) ; le seul manque
d'infra réel — l'egress `dagster → mlflow` — est **déjà** tracé en cluster#407.

## Critères de fini

- Les pods de run accèdent au S3 datalake : pipeline prouvé sur le banc **`atlas`
  local-path** (SeaweedFS) ; l'accès **OBC Ceph** spécifique à la prod (Secret +
  ConfigMap `atlas-datalake`) relève de la **soupape Ceph** `cluster-dataops` (le S3
  change de backing — ADR 0036/0085) ou se valide à la première bascule prod.
- Lineage visible dans Marquez ; runs/métriques (drift inclus) visibles dans MLflow.
- `index_load` peuple la table `researchers` (pgvector) ; `ge_index_load` vert.
- `validate.sh` vert en CI ; aucun tag `:dev`/`latest` en prod.
- Doc atlas alignée sur L4 NodePort.
- CT (`transform_daily`) **armé** à la cadence mensuelle d'instance, idempotence du
  rejeu reconfirmée, sans cadence figée dans le code générique (doctrine ADR 0062).
- `researcher_embeddings` loggue runs/params/métriques dans MLflow et enregistre le
  modèle au registry (`citation-*`, révision HF + sha256) — visible dans l'UI MLflow
  (egress [cluster#407](https://github.com/univ-lehavre/cluster/issues/407) levé) ;
  no-op hermétique sans `MLFLOW_TRACKING_URI`.
- (Option) `@sensor` watermark câblé, STOPPED par défaut, sans double-déclenchement
  avec le schedule mensuel.
