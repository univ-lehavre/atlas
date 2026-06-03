---
title: "0033 — Contrat d'interface entre l'application (`atlas`) et le cluster"
---

## Contexte

Le pipeline de collaborations ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/))
est développé dans le dépôt `atlas` (code, manifestes applicatifs, plan) mais
**s'exécute sur un cluster Kubernetes** dont l'infrastructure vit dans un dépôt
**séparé** (`cluster` : Ansible, addons `platform/<addon>/`, banc Vagrant). Le
plan d'exécution répartit explicitement le travail : la Phase 1 (socle :
ingress, TLS, Argo CD, observabilité, CloudNativePG, Dagster, Marquez) est
**côté cluster** ; les Phases 2–6 (ingestion, transformations, index, API, PWA)
sont **côté `atlas`**.

Les deux dépôts collaborent par un **contrat implicite** : `atlas` suppose que le
cluster fournit un bucket S3 nommé d'une certaine façon, un Postgres avec
`pgvector`, un registry pour ses images, un Argo CD qui réconcilie ses
manifestes ; le cluster suppose que `atlas` lui livre des images et des
`Application` Argo CD dans un format donné. **Tant que ce contrat reste
implicite, il peut diverger en silence** : un nom de bucket différent de part et
d'autre, une image taguée autrement que ce que le manifeste référence, une
version de `pgvector` ou de Dagster incompatible — autant de pannes qui
**compilent et déploient mais échouent à l'exécution**.

L'outil étant **générique et multi-tenant** ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)),
ce contrat ne lie pas seulement « mes deux dépôts » : il lie le **code générique**
à **n'importe quel cluster** qui l'exploite. Il doit donc être **explicite et
unique**, pour que tout déployeur sache ce que l'application attend de son
infrastructure, sans avoir à lire le code.

On retient une **coordination par contrat documenté** plutôt que par tests
d'intégration automatisés inter-dépôts : à ce stade (un opérateur, un
déploiement pilote), un test end-to-end en CI serait disproportionné (cluster
requis, lenteur, fragilité). Le contrat explicite suffit à empêcher la dérive ;
des vérifications statiques ou un smoke-test au banc pourront être ajoutés
**si** une douleur réelle se manifeste.

## Décision

> **Cette page est la source de vérité unique du contrat d'interface entre
> l'application `atlas` et le cluster qui l'exploite.** Les deux côtés s'y
> conforment ; tout changement d'un point de contact se reflète ici **dans la
> même PR** que le changement de code ou d'infrastructure.

Les valeurs concrètes (noms d'hôtes, plages d'IP, tailles) sont **propres à
chaque instance** et relèvent de sa **configuration**, pas du code générique
([ADR 0022](/atlas/decisions/0022-naming-convention/), [ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)) ;
le contrat fixe les **conventions et formats**, pas les valeurs d'une instance
donnée.

### Ce que le cluster fournit à l'application

| Point de contact          | Contrat                                                                                                                                                                                                                                                                                            | Fourni par (Phase 1)    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Stockage objet S3**     | Un bucket dont le nom suit la convention `citation` (jamais la marque, [ADR 0022](/atlas/decisions/0022-naming-convention/)), accessible en **path-style**, avec un **Secret** d'identifiants S3 (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / endpoint) généré par un **`ObjectBucketClaim`**. | Ceph RGW (déjà en prod) |
| **PostgreSQL + pgvector** | Un cluster PostgreSQL géré (**CloudNativePG**) avec l'extension **`pgvector`** activée, accessible par DSN depuis les namespaces consommateurs, dimension de vecteur **384** (modèle `all-MiniLM-L6-v2`).                                                                                          | Étape 1.6               |
| **Orchestrateur**         | **Dagster** déployé (webserver + daemon + run workers), event log dans Postgres ; l'application fournit la **code-location** (assets), pas l'orchestrateur.                                                                                                                                        | Étape 1.7               |
| **Lineage**               | Un collecteur **OpenLineage** (**Marquez**) joignable via `OPENLINEAGE_URL`.                                                                                                                                                                                                                       | Étape 1.8               |
| **Registry d'images**     | Un registry interne où l'application pousse ses images et que les manifestes/run workers référencent.                                                                                                                                                                                              | déjà en prod            |
| **GitOps**                | **Argo CD** réconciliant les `Application` de l'application, cadrées par un `AppProject` couvrant les namespaces `citation-*`.                                                                                                                                                                     | Étape 1.4               |
| **Exposition**            | Un **ingress** + **TLS de bordure** (cert-manager) pour exposer l'API et la PWA en HTTPS.                                                                                                                                                                                                          | Étapes 1.2–1.3          |
| **Observabilité**         | **Prometheus** scrappant les `ServiceMonitor` des services applicatifs ; Grafana + Loki.                                                                                                                                                                                                           | Étape 1.5               |

### Ce que l'application fournit au cluster

| Point de contact       | Contrat                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Namespaces**         | Les charges applicatives vivent dans `citation-ingest`, `citation-marts`, `citation-serving`, `citation-pwa` (convention [ADR 0022](/atlas/decisions/0022-naming-convention/) — jamais la marque).  |
| **Images**             | Poussées sur le registry interne, **taguées explicitement** (pas `latest` en production) ; les manifestes référencent le tag exact.                                                                 |
| **Manifestes**         | Des `Application` Argo CD + Deployment/CronJob/Service/Ingress conformes (validés `kubeconform`), réconciliables sans intervention manuelle.                                                        |
| **Métriques**          | Chaque service expose `/metrics` et déclare un `ServiceMonitor` ; aucune donnée personnelle dans les labels (cardinalité + RGPD, [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)). |
| **Contrat de données** | Le mart est un artefact **Parquet + `manifest.json`** sur le bucket S3 (immuable, checksummé, versionné) — l'infrastructure n'a pas à le connaître, mais elle garantit la **durabilité** du bucket. |

### Frontière de responsabilité

- **`atlas`** : tout ce qui est _applicatif_ (code, images, manifestes de ses
  propres services, assets Dagster, schéma de l'index).
- **`cluster`** : tout ce qui est _infrastructure_ (addons `platform/<addon>/`,
  Ansible, opérateurs, exposition, observabilité), **et le déploiement réel**,
  qui reste une action humaine validée sur le banc avant la prod.
- **Aucun manifeste d'infrastructure ne vit dans `atlas` ; aucun code applicatif
  ne vit dans `cluster`.**

## Statut

Accepted (2026-06-02). Complète [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
(architecture) et [ADR 0031](/atlas/decisions/0031-outil-generique-open-source/) (outil
générique) ; ne crée aucune contrainte technique nouvelle, il **rend explicite**
un contrat jusqu'ici implicite.

## Conséquences

**Bénéfices.** Les deux dépôts (et leurs agents) ont une **référence unique** des
points de contact : un nom de bucket, un format de manifeste, une version
d'extension ne peuvent plus diverger en silence sans qu'un côté contredise ce
document. Tout déployeur tiers sait, en une page, ce que l'application **attend**
de son cluster — sans lire le code. La frontière de responsabilité est nette, ce
qui évite que de l'infrastructure ne fuite dans `atlas` ou que du code applicatif
ne fuite dans `cluster`.

**Prix à payer.** Le contrat est tenu **par discipline**, pas par un test
automatisé : un changement non répercuté ici reste possible (le garde-fou est
humain, pas mécanique). Il faut le **maintenir à jour dans la PR** qui change un
point de contact — sinon il périme, comme toute documentation non vérifiée. Le
couplage par valeurs d'instance (noms d'hôtes, IP) reste à la charge de chaque
déployeur via sa configuration.

**Garde-fous.**

- **Tout changement d'un point de contact** (nom de bucket, namespaces, format de
  manifeste, version d'un composant fourni) **met à jour ce document dans la même
  PR** que le code ou l'infrastructure concernés.
- Le **nommage** suit [ADR 0022](/atlas/decisions/0022-naming-convention/) des deux côtés :
  `citation`, jamais la marque, dans tout identifiant partagé (bucket,
  namespaces, secrets).
- Les **valeurs propres à une instance** (hôtes, IP, tailles, base légale)
  vivent dans la **configuration de l'instance**, pas dans ce contrat ni dans le
  code générique ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)).
- Si une dérive silencieuse cause une panne malgré le contrat, on **promeut** la
  vérification au niveau supérieur (checks statiques inter-dépôts, puis
  smoke-test au banc) — pas avant qu'une douleur réelle ne le justifie.
- Le **déploiement réel** reste une action **humaine** validée sur le banc
  Vagrant ; aucun agent ne le déclenche automatiquement.
