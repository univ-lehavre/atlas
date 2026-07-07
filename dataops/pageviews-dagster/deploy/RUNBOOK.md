# Runbook — déploiement du pipeline pageviews (prévision des vues Wikipédia)

Le déploiement est **événementiel** : un **push de code `atlas`** suffit ; le cluster
**build l'image en interne** et **injecte le digest**, Argo CD réconcilie — jamais de
`docker buildx` manuel ni de `kubectl apply`. Le **« comment »** (chaîne webhook → Argo
Events → build in-pod → write-back digest) vit dans l'**ADR cluster
[0095](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)
§1.b**. Ce runbook décrit ce qu'`atlas` déclare, ce que le cluster fournit, et comment on
**prouve** le pipeline localement.

> **Mise en place — code mergé (#576), déploiement à venir (Phase 5).** Le package est
> sur `main` ; le **branchement sur une infra réelle** (S3, code-location Dagster) n'est
> pas encore fait. Ce runbook est aussi le **handoff vers l'agent cluster** : il suit
> exactement le patron `citation`/`mediawatch` — l'accueil côté cluster est un
> **copier-adapter** de `citation`, pas une conception nouvelle.

## Ce que `pageviews` déclare consommer (manifeste montant)

Source :
[`code-location.manifest.yaml`](../code-location.manifest.yaml). `cluster` LIT ce
manifeste, valide la capacité, puis instancie l'`Application` Argo CD (ADR cluster
[0094](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0094-frontiere-deploiement-applicatif.md)).

| Point de contact       | Valeur déclarée                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `codeLocation`         | `pageviews`                                                                              |
| `contractVersion`      | `"1.0"`                                                                                  |
| `ready`                | `false` → à passer `true` une fois `validate.sh` OK (bench + prod) sur `main`            |
| Ressources pods de RUN | cpu `500m`, mem `2Gi`, disk `20Gi` (scratch bloc RBD, spill DuckDB — **pas** le datalake) |
| `buckets`              | **1** : `pageviews-datalake`, `200Gi`, `storageClass: rook-ceph-datalake`                |
| `database`             | **`[]` — pas de Postgres/pgvector** (aucun index vectoriel, écart clé vs `citation`)      |
| `codeLocations`        | `[]` (sources en pull HTTP propre ; le projet `pageviews-dbt` est embarqué dans l'image) |
| `migrations`           | `[]` (aucune base SQL applicative)                                                       |

## Ce que le cluster doit fournir (contrat ADR 0033/0043)

1. **Bucket S3 objet** `pageviews-datalake` : `ObjectBucketClaim` Rook en prod
   ([`overlays/prod/objectbucketclaim.yaml`](overlays/prod/objectbucketclaim.yaml)),
   Secret SeaweedFS au banc ([`overlays/bench/s3-access.yaml`](overlays/bench/s3-access.yaml)).
   Le code lit `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `BUCKET_HOST` /
   `BUCKET_PORT` / `BUCKET_NAME` — **mêmes variables que `citation`/`mediawatch`**,
   endpoint S3 **path-style**.
2. **Enregistrement de la code-location** dans le workspace Dagster (patron
   [`base/workspace-fragment.yaml`](base/workspace-fragment.yaml)).
3. **Egress HTTP** pour les sources (dumps `pageview_complete` Wikimedia, API Pageviews,
   SPARQL Wikidata, API OpenAlex) + optionnellement Marquez (`OPENLINEAGE_URL`) et MLflow
   (`MLFLOW_TRACKING_URI`) — les deux **dégradent en no-op** si absents (best-effort).

**À NE PAS provisionner** (écarts vs `citation`, ne pas copier par réflexe) : pas de
Postgres/pgvector, pas de Secret PG, pas de migration SQL, pas d'index vectoriel.

> **Piège ADR [0086](/atlas/decisions/0086-env-pods-de-run/).** Les variables d'env
> doivent être **réinjectées au niveau du RUN** (pods K8sRunLauncher), pas seulement sur
> le Deployment gRPC. C'est géré côté atlas dans `definitions.py` (tags
> `dagster-k8s/config` run-level) ; le cluster fournit les **Secrets/ConfigMaps S3** que
> ces tags référencent en `env_from`.

## Le flux de déploiement (design, ADR cluster 0095 §1.b)

Un **`git push` sur `atlas`** déclenche le webhook Gitea de **build** → un Sensor Argo
Events **dérive** la code-location du **chemin modifié** (`dataops/pageviews-dagster/`),
prend `revision = body.after`, build+pousse `registry:80/pageviews-dagster:<revision>`,
**lit le digest** et fait le **write-back** de `apps/pageviews.yaml` **par `@sha256`**
dans le repo `cluster/apps`. Argo CD réconcilie. **Déploiement par digest, jamais par
tag** (ADR cluster 0006 / [0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)
/ 0095 §2).

**Frontière atlas ↔ cluster (ADR cluster 0094).** `atlas` **déclare et fournit** (le
manifeste montant + l'overlay prod avec ses placeholders `__PAGEVIEWS_IMAGE_DIGEST__` /
`__PAGEVIEWS_IMAGE__`) ; `cluster` **valide, instancie et remplit** (lit le manifeste,
build l'image, injecte le digest, crée l'`Application`). `atlas` ne fabrique ni ne résout
jamais l'image de production.

| Environnement                              | Overlay          | S3           | Rôle                              |
| ------------------------------------------ | ---------------- | ------------ | --------------------------------- |
| **Banc `atlas`** (mono-nœud local-path)    | `overlays/bench` | SeaweedFS    | preuve applicative de référence   |
| **Prod**                                   | `overlays/prod`  | RGW Ceph + OBC | la cible                        |

> **Soupape S3 (ADR cluster 0036/0085).** Un changement touchant le chemin S3 / le
> backing / un storageClass doit être revalidé sur Ceph applicatif — local-path n'attrape
> pas une incompat propre à l'API RGW (signatures S3, multipart).

## Preuve locale (profil `bench`)

[`validate.sh`](validate.sh) valide les deux overlays Kustomize. Le déploiement réel **ne
passe pas par un script manuel** : l'image de prod est buildée et déployée par le cluster
au fil des pushs (chaîne événementielle ci-dessus). L'overlay prod n'expose que des
**placeholders** d'image que le cluster remplit par le digest immuable.

```bash
# Build de preuve du banc (overlay/bench : image de base, pas de placeholder à figer)
docker buildx build --platform linux/arm64 -f dataops/pageviews-dagster/Dockerfile \
  -t registry:80/pageviews-dagster:dev --push dataops/

# Valider les deux overlays
dataops/pageviews-dagster/deploy/validate.sh
```

**Preuve applicative attendue** (banc `atlas`, `overlays/bench`) : Application
`pageviews-dagster` Synced/Healthy ; lancer `ingestion_job` (→ `ref_universities` +
`raw_pageviews`) puis `transform_job` (dbt → `forecast_views` → manifest) → les asset
checks GE passent, le mart `marts/views_forecast` est peuplé (partition `dt=…/run=…`),
Marquez a le lineage, MLflow les runs de prévision. Rejouer `transform_job` → nouvelle
partition (idempotence). Même code qu'en prod, seul le backing S3 diffère (ADR 0085).

## Garde-fou « même PR » (ADR [0033](/atlas/decisions/0033-contrat-interface-cluster/))

Quand le point de contact S3 `pageviews-datalake` est **réellement instancié** côté
cluster, mettre à jour **dans la même vague de PR** : côté `cluster` la source de vérité
(ADR cluster 0043 + `contract/*.example.yaml` si un point de contact générique change),
et côté `atlas` l'ADR 0033 (miroir applicatif). Aujourd'hui **rien n'est instancié** →
rien à synchroniser encore ; le déclencheur est le déploiement réel.

## Checklist Phase 5 (côté cluster)

- [ ] Provisionner `pageviews-datalake` (OBC Rook prod / SeaweedFS banc).
- [ ] Enregistrer la code-location `pageviews` dans le workspace Dagster.
- [ ] Fournir Secrets/ConfigMaps S3 (`env_from`, mêmes noms que `citation`).
- [ ] Vérifier l'egress HTTP (sources Wikimedia/OpenAlex).
- [ ] `validate.sh` OK (bench + prod) → passer `ready: true` dans le manifeste (atlas).
- [ ] MAJ ADR cluster 0043 + `contract/*.yaml` **et** ADR atlas 0033 (même PR).
- [ ] Preuve banc e2e : push atlas → build → réconciliation Argo CD → run `pageviews` OK.

**Première bascule** : l'`Application` Argo CD est dans
[`application.example.yaml`](application.example.yaml) (surcharger `repoURL`/`targetRevision`).
