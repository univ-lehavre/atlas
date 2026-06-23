# Runbook — bascule en production

Checklist de mise en prod du pipeline OpenAlex (profil Ceph). **Action humaine**,
GitOps : on **pousse sur Gitea**, Argo CD réconcilie — jamais de `kubectl apply`.

Prérequis socle (fournis par le contrat `cluster/contract/`) : OBC `atlas-datalake`,
Secret `pgvector-pg-auth` (ns `dagster`), egress `dagster→mlflow`
([cluster#407](https://github.com/univ-lehavre/cluster/issues/407)).

```bash
# 1. Image, taguée immuable (jamais :dev/latest)
TAG="$(git rev-parse --short HEAD)"
docker buildx build --platform linux/arm64 -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:"$TAG" --push dataops/

# 2. Figer ce tag dans overlays/prod : newTag ET DAGSTER_CURRENT_IMAGE = $TAG

# 3. Valider, puis pousser sur Gitea (déclenche Argo CD)
dataops/citation-dagster/deploy/validate.sh
git push   # remote Gitea déjà configuré par cluster/bench/lima/access.sh
```

4. **Vérifier** : Application `citation-dagster` Synced/Healthy (UI Argo CD) ; la
   code-location `citation` apparaît dans l'UI Dagster.
5. **Valider au banc Lima** : lancer `ingestion_job` puis `transform_job` ; les
   asset checks GE passent, la table `researchers` (pgvector) est peuplée, Marquez a
   le lineage et MLflow les runs. Rejouer `transform_job` → nouvelle partition
   `dt=…/run=…` (idempotence OK).
6. **(Option) Armer le CT** : poser `CITATION_CT_CRON` (mensuel `0 2 1 * *`) sur le
   Deployment, puis basculer `transform_daily` sur **Running** dans l'UI Dagster.

**Rollback** : remettre le tag précédent dans `overlays/prod`, `git push` — Argo CD
reconverge (`selfHeal`). Ne jamais éditer le live à la main.

Première bascule : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
Détail des décisions : [ADR cluster 0044](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0044-topologie-deploiement-banc-atlas.md)
(Gitea/GitOps), [ADR 0062](https://univ-lehavre.github.io/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) (CT).
