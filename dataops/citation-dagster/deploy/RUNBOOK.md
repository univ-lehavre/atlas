# Runbook — déploiement du pipeline OpenAlex

Le déploiement (prod et, à terme, banc) est **événementiel** : un **push de code
`atlas`** suffit ; le cluster **build l'image en interne** et **injecte le digest**,
Argo CD réconcilie — jamais de `docker buildx` manuel ni de `kubectl apply`. Le
**« comment »** (chaîne webhook → Argo Events → build in-pod → write-back digest)
n'est pas dupliqué ici : il vit dans l'**ADR cluster
[0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
§1.b**. Ce runbook décrit ce qu'`atlas` déclare et comment on **prouve** le pipeline
localement.

> **Mise en place — la preuve banc de bout en bout (run from-scratch) est en
> cours.** L'architecture ci-dessous décrit le **design** de la chaîne ; l'exécution
> événementielle complète n'est pas encore prouvée par un run banc.

## Le flux de déploiement (design, ADR cluster 0095 §1.b)

Un **`git push` sur `atlas/atlas`** déclenche le **webhook Gitea #2** (celui du
**build** de code, distinct du webhook #1 de déploiement `cluster/apps` déjà câblé
vers Argo CD). Ce push est capté par un **EventSource Argo Events** (bus **NATS**),
puis un **Sensor** `code-location-build` **dérive** la code-location du **chemin
modifié** (`dataops/<X>-dagster/`) et prend `revision = body.after` ; il soumet le
**WorkflowTemplate** `image-builder` (BuildKit rootless, sur un worker) qui **build
et pousse** `registry:80/citation-dagster:<revision>`, **lit le digest** produit, et
fait le **write-back** de `apps/citation.yaml` **par `@sha256`** dans le repo Gitea
`cluster/apps`. Le **webhook #1** (push `cluster/apps` → Argo CD) réconcilie alors la
racine **App-of-Apps** et le pod gRPC de la code-location se met à jour. Un filet
anti-perte d'événement (**CronWorkflow**) compare périodiquement le `HEAD` d'`atlas`
au tag déployé. Détail et justification : **ADR cluster
[0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
§1.b**.

**Déploiement par digest, jamais par tag.** Le `revision` (SHA court) est le tag
**lisible** (traçabilité commit→image) ; le `@sha256` est l'**ancre d'immuabilité**
(ADR cluster
[0006](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0006-matrice-de-versions-et-politique-de-bump.md)/[0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)/[0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
§2).

**Frontière atlas ↔ cluster (ADR cluster
[0094](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0094-frontiere-deploiement-applicatif.md)).**
`atlas` **déclare et fournit** : le manifeste montant
[`code-location.manifest.yaml`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/code-location.manifest.yaml)
et l'overlay prod avec ses **placeholders** d'image
(`__CITATION_IMAGE_DIGEST__`, `__CITATION_IMAGE__`). `cluster` **valide, instancie
et remplit** : il lit ce manifeste, build l'image, **injecte le digest** dans les
placeholders et crée l'`Application` Argo CD. `atlas` ne fabrique ni ne résout jamais
l'image de production.

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

## Outil de preuve locale (profil `bench`)

[`install.sh`](install.sh) **n'est pas le canal de déploiement** : c'est un **outil
de preuve applicative locale / dev** sur banc mono-nœud local-path (ADR cluster
[0085](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0085-preuves-applicatives-local-path.md)).
Il enchaîne un build d'image de preuve → checks (`validate.sh` + lint + tests) →
push Gitea du banc, pour **exercer le pipeline** localement — pas pour livrer en prod.
Il **demande confirmation** avant le push ; `--no-push` s'arrête aux checks.

```bash
deploy/install.sh bench                 # build de preuve + checks + (confirmation) push banc
deploy/install.sh bench dev --no-push   # prépare et vérifie, sans rien pousser
```

> **Le déploiement réel ne passe pas par ce script.** L'image de production est
> **buildée et déployée par le cluster** au fil des pushs de code `atlas` (chaîne
> événementielle ci-dessus, ADR cluster
> [0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
> §1.b). `atlas` ne fabrique ni ne résout l'image de production : l'overlay prod
> n'expose que des **placeholders** d'image (`__CITATION_IMAGE_DIGEST__` dans
> `kustomization.yaml`, `__CITATION_IMAGE__` dans `patch-s3-envfrom.yaml`) que le
> **cluster** remplit par le **digest immuable** de l'image qu'il a buildée et poussée
> (frontière ADR cluster
> [0094](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0094-frontiere-deploiement-applicatif.md)).

## Pas à pas — preuve locale (équivalent manuel de `install.sh bench`)

Ces gestes **ne déploient pas la prod** : ils reconstituent à la main la **preuve
locale** que `install.sh bench` automatise (build de preuve + checks + push banc).
Le déploiement réel est **événementiel** (voir plus haut).

```bash
# 1. Build de preuve du banc (overlay/bench : image de base, pas de placeholder à figer)
docker buildx build --platform linux/arm64 -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:dev --push dataops/

# 2. Valider les deux overlays, puis pousser sur Gitea du banc
dataops/citation-dagster/deploy/validate.sh
git push "$GITEA_PUSH_URL" HEAD:main   # cible EXPLICITE, lue du .env injecté (access.sh) ;
                                       # jamais le remote ambiant (garde-fou de cible, ADR 0073 §B)
```

> **Prod — l'image se build et se résout côté cluster (chaîne événementielle, ADR
> cluster
> [0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
> §1.b).** `atlas` ne touche pas la référence d'image de l'overlay prod : il maintient
> les deux placeholders (`images[].digest: __CITATION_IMAGE_DIGEST__` et
> `DAGSTER_CURRENT_IMAGE: __CITATION_IMAGE__`). Sur un push de code `atlas`, le
> **cluster** build+pousse l'image, **lit son `sha256`** et **remplit les deux
> placeholders d'un seul coup** par le digest immuable
> `registry:80/citation-dagster@sha256:…` (`_DIGEST_` d'abord, pour ne pas amputer le
> préfixe). `validate.sh` passe sur l'overlay tel quel : Kustomize traite les
> placeholders comme du texte.

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
   d'image** — buildé et injecté par le **cluster** dans les placeholders au fil des
   pushs de code `atlas` (chaîne événementielle, ADR cluster 0095 §1.b ; digest, ADR
   0075).
7. **(Option) Armer le CT** : poser `CITATION_CT_CRON` (mensuel `0 2 1 * *`) sur le
   Deployment, puis basculer `transform_daily` sur **Running** dans l'UI Dagster.

**Rollback.** Banc : remettre l'état précédent de l'overlay, `git push` — Argo CD
reconverge (`selfHeal`). Prod : revenir au **digest précédent** est un geste
**cluster** (réconcilier `apps/citation.yaml` sur le `@sha256` de l'image immuable
visée, ADR 0095 §1.b/0075) ; `atlas` ne grave aucun digest. Ne jamais éditer le live
à la main.

Première bascule : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
