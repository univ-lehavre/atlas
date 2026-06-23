# Runbook — bascule en production de la code-location `citation-dagster`

Procédure de **mise en production** du pipeline OpenAlex (profil Ceph). C'est une
**action humaine**, validée au **banc Lima** avant la prod
([ADR cluster 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md),
[0044](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0044-topologie-deploiement-banc-atlas.md)) :
**aucun agent ne la déclenche**, et **jamais de `kubectl apply` manuel** — le
déploiement passe par **GitOps** (Argo CD réconcilie depuis Gitea,
[ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).

> Les **valeurs propres à l'instance** (URL du dépôt Gitea, identifiants, tag
> d'image réel, cron du CT) ne sont **jamais** committées : elles vivent en config
> locale ([ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md)).
> Les patrons `*.example` du dossier en sont la forme générique.

## Prérequis (côté socle `cluster`, fournis par le contrat)

À vérifier **avant** la bascule (cf. `cluster/contract/`) :

- [ ] Bucket S3 via `ObjectBucketClaim` `atlas-datalake` (StorageClass
      `rook-ceph-datalake`) — provisionné par Rook, génère le Secret + ConfigMap
      homonymes dans le ns `dagster`.
- [ ] Secret dérivé **`pgvector-pg-auth`** (clés `username`/`password`) présent en
      ns `dagster` (recopie du rôle CNPG `pgvector`) — requis par `index_load`.
- [ ] Base `pgvector` (extension `vector`) joignable (`pg-rw.postgres:5432`), schéma
      d'index appliqué (cf. [`migrations/`](migrations/)).
- [ ] Egress réseau `dagster → mlflow:5000` ouvert (`allow-mlflow-egress`,
      [cluster#407](https://github.com/univ-lehavre/cluster/issues/407)) — sinon le
      logging drift/CT/MLflow est un no-op silencieux.
- [ ] `AppProject` `atlas` autorisant le ns `dagster` (déjà au contrat).

## Étapes

### 1. Construire et pousser l'image (tag IMMUABLE)

Contexte de build = `dataops/` (embarque la code-location **et** `citation-dbt/`).
**Jamais `:dev` ni `latest` en prod** (garde `validate.sh`) — taguer par
SHA/version immuable.

```bash
TAG="$(git rev-parse --short HEAD)"   # ou une version sémantique de release
docker buildx build --platform linux/arm64 \
  -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:"$TAG" --push dataops/
```

### 2. Figer le tag dans l'overlay prod

Dans [`overlays/prod/kustomization.yaml`](overlays/prod/kustomization.yaml),
remplacer le `newTag` d'exemple (`0.0.0`) par `$TAG`, **et** aligner
`DAGSTER_CURRENT_IMAGE` dans [`overlays/prod/patch-s3-envfrom.yaml`](overlays/prod/patch-s3-envfrom.yaml)
(kustomize `images:` ne réécrit pas cette valeur d'env — sinon le serveur gRPC
tourne sur le bon tag mais les pods de run sur l'ancien).

### 3. Valider les manifestes

```bash
dataops/citation-dagster/deploy/validate.sh   # ou: pnpm dataops:manifests
```

Doit être **vert** sur `bench` **et** `prod` : build kustomize, schémas
`kubeconform`, et invariants de contrat (MLFLOW_TRACKING_URI présent, **aucun tag
`:dev`**, ConfigMap OBC branché, `CITATION_S3_SECRET` aligné sur l'OBC, resources +
PDB présents).

### 4. Pousser les manifestes sur **Gitea** (le déclencheur GitOps)

Argo CD réconcilie depuis le **dépôt Gitea intra-banc** (`http://gitea-http.gitea.svc/<org>/atlas.git`),
**pas** GitHub ([ADR cluster 0044](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0044-topologie-deploiement-banc-atlas.md)).
Le push (token dérivé du Secret `gitea-admin`) déclenche le **webhook** → Argo CD
synchronise.

```bash
# URL et creds = valeurs d'instance (cf. cluster/contract/atlas.env.cluster.example,
# généré dans ../atlas/.env.cluster.local par cluster/bench/lima/access.sh).
git push "$GITEA_PUSH_URL" HEAD:main
```

Si la première bascule : appliquer (ou laisser Argo CD découvrir)
[`application.example.yaml`](application.example.yaml) — surcharger `repoURL` /
`targetRevision` par les valeurs d'instance ; `path` pointe `overlays/prod`.

### 5. Vérifier la réconciliation Argo CD

- [ ] L'`Application` `citation-dagster` est **Synced** + **Healthy** (UI Argo CD,
      en L4 NodePort — [ADR cluster 0092](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0092-exposition-hostport-l4.md)).
- [ ] Le Deployment `citation-dagster` (ns `dagster`) tourne sur le **bon tag** ;
      readiness/liveness vertes.
- [ ] La code-location `citation` apparaît dans l'**UI Dagster** (workspace).

### 6. Run de validation au banc Lima (AVANT prod)

- [ ] Lancer `ingestion_job` → vérifier dans les **pods de run** que `AWS_*`/`BUCKET_*`,
      `OPENLINEAGE_URL`, `MLFLOW_TRACKING_URI` sont présents (pas de no-op) ; le brut
      OpenAlex arrive sous `raw/`.
- [ ] Lancer `transform_job` → dbt → embeddings → manifests → `index_load` ; les
      asset checks GE **bloquants** passent ; la table `researchers` (pgvector) est
      peuplée (`ge_index_load` vert).
- [ ] Marquez reçoit le **lineage** ; MLflow reçoit les **runs/métriques** (drift +
      tracking du modèle, experiment `citation_researcher_embeddings` ; rapports
      qualité sous `citation_quality`).
- [ ] **Idempotence** : rejouer `transform_job` → nouvelle partition `dt=…/run=<run_id>/`,
      l'existant n'est pas corrompu (préalable à l'armement du CT).

### 7. (Post-prod, déployeur) Armer l'entraînement continu

Optionnel et **à la main de l'opérateur** (le code permet, ne décide pas —
[ADR 0062](https://univ-lehavre.github.io/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)) :

- [ ] Poser la **cadence d'instance** `CITATION_CT_CRON` (p. ex. **mensuel**
      `0 2 1 * *`, aligné sur le rythme des snapshots OpenAlex) sur le Deployment de
      la code-location.
- [ ] Dans l'UI Dagster, basculer `transform_daily` (et/ou le `@sensor`
      `transform_on_watermark_advance`) sur **Running**.

## Rollback

GitOps : **corriger le code, pas l'état**
([ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).
Revenir au tag d'image précédent dans l'overlay prod et **re-pousser sur Gitea** →
Argo CD reconverge (`selfHeal`). Ne jamais `kubectl edit`/`rollout undo` à la main
(Argo CD le réécraserait). Le watermark d'ingestion (`raw/_watermark.json`)
n'avance qu'après un sync réussi : un échec ne le corrompt pas.
