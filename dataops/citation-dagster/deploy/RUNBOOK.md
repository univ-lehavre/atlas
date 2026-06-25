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

Prérequis socle prod (Ceph) : OBC `citation-datalake`, Secret `pgvector-pg-auth`
(ns `dagster`), egress `dagster→mlflow` ([cluster#407](https://github.com/univ-lehavre/cluster/issues/407)).

## En une commande (banc)

[`install.sh`](install.sh) enchaîne build image du banc → checks (`validate.sh` +
lint + tests) → push Gitea. Il **demande confirmation** avant le push (le push
déclenche Argo CD) ; `--no-push` s'arrête aux checks.

```bash
deploy/install.sh bench                 # build + checks + (confirmation) push → banc
deploy/install.sh bench dev --no-push   # prépare sans déployer
```

> **Prod : pas pilotée par ce script (ADR [0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)).**
> `atlas` ne fabrique ni ne résout l'image de production. L'overlay prod n'expose
> que des **placeholders** d'image (`__CITATION_IMAGE_DIGEST__` dans
> `kustomization.yaml`, `__CITATION_IMAGE__` dans `patch-s3-envfrom.yaml`) que le
> **seed cluster** remplit par le **digest immuable** de l'image qu'il a buildée et
> poussée. Build de l'image, injection du digest et réconciliation prod sont des
> gestes `cluster` (frontière ADR [0033](/atlas/decisions/0033-contrat-interface-cluster/)).

## Pas à pas — preuve sur banc (équivalent manuel)

```bash
# 1. Image du banc (overlay/bench : image de base, pas de placeholder à figer)
docker buildx build --platform linux/arm64 -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:dev --push dataops/

# 2. Valider les deux overlays, puis pousser sur Gitea (déclenche Argo CD)
dataops/citation-dagster/deploy/validate.sh
git push "$GITEA_PUSH_URL" HEAD:main   # cible EXPLICITE, lue du .env injecté (access.sh) ;
                                       # jamais le remote ambiant (garde-fou de cible, ADR 0073 §B)
```

> **Prod — l'image se résout côté cluster (ADR [0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)).**
> `atlas` ne touche pas la référence d'image de l'overlay prod : il maintient les
> deux placeholders (`images[].digest: __CITATION_IMAGE_DIGEST__` et
> `DAGSTER_CURRENT_IMAGE: __CITATION_IMAGE__`). Au déploiement, le **seed cluster**
> build+pousse l'image, lit son `sha256`, et **remplit les deux placeholders d'un
> seul coup** par le digest immuable `registry:80/citation-dagster@sha256:…`
> (`_DIGEST_` d'abord, pour ne pas amputer le préfixe). `validate.sh` passe sur
> l'overlay tel quel : Kustomize traite les placeholders comme du texte.

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
   prod ne change que les valeurs d'instance (endpoints, creds, OBC) et le **digest
   d'image**, injecté par le seed cluster dans les placeholders (ADR 0075).
7. **(Option) Armer le CT** : poser `CITATION_CT_CRON` (mensuel `0 2 1 * *`) sur le
   Deployment, puis basculer `transform_daily` sur **Running** dans l'UI Dagster.

**Rollback.** Banc : remettre l'état précédent de l'overlay, `git push` — Argo CD
reconverge (`selfHeal`). Prod : réinjecter le **digest précédent** dans les
placeholders est un geste **cluster** (le seed redéploie l'image immuable visée,
ADR 0075) ; `atlas` ne grave aucun digest. Ne jamais éditer le live à la main.

Première bascule : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
