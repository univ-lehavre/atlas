# Runbook — bascule en production

Mise en prod du pipeline OpenAlex. **Action humaine**, GitOps : on **pousse sur
Gitea**, Argo CD réconcilie — jamais de `kubectl apply`.

**Preuve sur banc local-path ; prod sur Ceph** (ADR cluster [0085](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0085-preuves-applicatives-local-path.md),
amende [0035](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0035-strategie-bancs-fidelite-vitesse.md)/[0045](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0045-chemins-installation-banc-couches.md)).
Le code parle au stockage par un **chemin S3 paramétré unique** (`seaweedfs` ↔ `rgw`,
storageClass dérivé du cluster, [ADR 0036](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0036-backing-s3-unique-rgw.md)) :
prouver le pipeline sur local-path exerce **le même code** qu'en prod ; seul le
*backing* change. Monter la chaîne applicative sur Ceph **ne tient pas** en ressources
sur un banc mono-nœud (ADR 0085).

| Environnement | Chemin d'install | Overlay | S3 | Rôle |
| --- | --- | --- | --- | --- |
| **Banc `atlas`** (mono-nœud local-path) | `run-phases.sh atlas` | `overlays/bench` | SeaweedFS | **preuve applicative de référence** (ingestion → transform → index → MLflow) |
| **Prod** | (cluster de prod) | `overlays/prod` | RGW Ceph + OBC | la cible |

> **Soupape S3 (ADR 0036/0085).** Un changement touchant le **chemin S3 / le backing /
> un storageClass** doit être revalidé sur Ceph applicatif (`run-phases.sh cluster-dataops`,
> **sur demande**) — local-path n'attrape pas une incompat propre à l'API RGW (signatures
> S3, multipart). Hors de ce cas, la preuve `atlas` (local-path) suffit.

Prérequis socle prod (Ceph) : OBC `atlas-datalake`, Secret `pgvector-pg-auth`
(ns `dagster`), egress `dagster→mlflow` ([cluster#407](https://github.com/univ-lehavre/cluster/issues/407)).

## En une commande

[`install.sh`](install.sh) enchaîne build → tag → checks (`validate.sh` + lint +
tests) → push Gitea, par profil. Il **demande confirmation** avant le push (le push
déclenche Argo CD) ; `--no-push` s'arrête aux checks.

```bash
deploy/install.sh prod              # build SHA + checks + (confirmation) push → prod
deploy/install.sh bench             # profil léger SeaweedFS (itération)
deploy/install.sh prod v1.2.0 --no-push   # prépare sans déployer
```

## Pas à pas (équivalent manuel)

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

4. **Preuve applicative sur le banc `atlas`** (`run-phases.sh atlas`, mono-nœud
   local-path) avec `overlays/bench` : Application `citation-dagster` Synced/Healthy ;
   lancer `ingestion_job` puis `transform_job` → les asset checks GE passent, la table
   `researchers` (pgvector) est peuplée, Marquez a le lineage, MLflow les runs.
   Rejouer `transform_job` → nouvelle partition `dt=…/run=…` (idempotence OK). C'est la
   preuve de référence (ADR 0085) : même code applicatif qu'en prod, seul le backing S3
   diffère.
5. **(Si le diff touche le chemin S3 / backing / un storageClass)** revalider sur Ceph
   applicatif `run-phases.sh cluster-dataops` avec `overlays/prod` — soupape ADR 0036/0085.
6. **Prod** : `overlays/prod` (Ceph) réconcilié par Argo CD sur le cluster de prod ; la
   prod ne change que les valeurs d'instance (endpoints, creds, OBC).
7. **(Option) Armer le CT** : poser `CITATION_CT_CRON` (mensuel `0 2 1 * *`) sur le
   Deployment, puis basculer `transform_daily` sur **Running** dans l'UI Dagster.

**Rollback** : remettre le tag précédent dans `overlays/prod`, `git push` — Argo CD
reconverge (`selfHeal`). Ne jamais éditer le live à la main.

Première bascule : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
