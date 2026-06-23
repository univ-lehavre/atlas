# Runbook — bascule en production

Mise en prod du pipeline OpenAlex. **Action humaine**, GitOps : on **pousse sur
Gitea**, Argo CD réconcilie — jamais de `kubectl apply`.

**Deux overlays, deux profils** (ADR cluster [0035](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0035-strategie-bancs-fidelite-vitesse.md)/[0036](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0036-backing-s3-unique-rgw.md)) :

| Profil | Overlay | S3 | Usage |
| --- | --- | --- | --- |
| `local-path` (banc léger, ~11 min) | `overlays/bench` | SeaweedFS | **itérer** un manifeste — pas une preuve |
| Ceph (banc Ceph ~30 min, **et prod**) | `overlays/prod` | RGW Ceph + OBC | **preuve d'intégration** puis prod |

La prod tourne sur Ceph ⇒ l'overlay de prod est `overlays/prod`. Il se valide
**sur le banc Ceph** (même overlay, même profil), **pas** sur le banc léger : un
changement passé en `local-path` doit être **revalidé en Ceph avant prod**
(ADR 0036). Prérequis socle Ceph : OBC `atlas-datalake`, Secret `pgvector-pg-auth`
(ns `dagster`), egress `dagster→mlflow` ([cluster#407](https://github.com/univ-lehavre/cluster/issues/407)).

```bash
# 1. Image, taguée immuable (jamais :dev/latest)
TAG="$(git rev-parse --short HEAD)"
docker buildx build --platform linux/arm64 -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:"$TAG" --push dataops/

# 2. Figer ce tag dans overlays/prod : newTag ET DAGSTER_CURRENT_IMAGE = $TAG

# 3. Valider les deux overlays, puis pousser sur Gitea (déclenche Argo CD)
dataops/citation-dagster/deploy/validate.sh
git push   # remote Gitea déjà configuré par cluster/bench/lima/access.sh
```

4. **Preuve sur le banc Ceph** (`run-phases.sh cluster-dataops`, profil Ceph) avec
   `overlays/prod` : Application `citation-dagster` Synced/Healthy ; lancer
   `ingestion_job` puis `transform_job` → les asset checks GE passent, la table
   `researchers` (pgvector) est peuplée, Marquez a le lineage, MLflow les runs.
   Rejouer `transform_job` → nouvelle partition `dt=…/run=…` (idempotence OK).
5. **Prod** : même overlay `overlays/prod` réconcilié par Argo CD sur le cluster de
   prod (Ceph). La preuve banc Ceph faite, la prod ne change que les valeurs
   d'instance (endpoints, creds).
6. **(Option) Armer le CT** : poser `CITATION_CT_CRON` (mensuel `0 2 1 * *`) sur le
   Deployment, puis basculer `transform_daily` sur **Running** dans l'UI Dagster.

**Itération rapide** (hors bascule) : profil léger `run-phases.sh atlas` +
`overlays/bench` (SeaweedFS) — pour tester un manifeste sans Ceph, ne vaut pas
preuve.

**Rollback** : remettre le tag précédent dans `overlays/prod`, `git push` — Argo CD
reconverge (`selfHeal`). Ne jamais éditer le live à la main.

Première bascule : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
