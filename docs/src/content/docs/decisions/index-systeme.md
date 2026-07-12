---
title: Index des décisions système (frontière cluster ↔ atlas)
---

Les décisions structurantes du système se répartissent sur **deux dépôts**
([ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)) :
[`cluster`](https://github.com/univ-lehavre/cluster) (socle d'infrastructure) et
`atlas` (applicatif/métier). Chaque dépôt tient sa **propre série numérotée**, si
bien qu'un même numéro désigne deux décisions sans rapport (`0033` = _Orchestration
Ansible DataOps_ côté cluster, _Contrat d'interface_ côté atlas).

Cette page **indexe les décisions qui décrivent la frontière** entre les deux
dépôts, en les **préfixant** `CL-` (cluster) / `AT-` (atlas) pour lever
l'ambiguïté **sans renuméroter** quoi que ce soit. Ce n'est pas l'index exhaustif
des ADR (voir l'[index atlas](/atlas/decisions/) et l'index cluster) : seulement
le **noyau transverse**, pour lire la frontière d'un coup d'œil.

## Le noyau de la frontière

La frontière est **conçue, pas accidentelle** : le socle n'expose que des valeurs
d'exemple génériques, le métier vit dans `atlas`, et un **contrat machine-lisible**
est publié par `cluster` vers `atlas` (sens unique).

| Préfixe     | Décision                                                                                                                                            | Rôle dans la frontière                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **CL-0023** | [Plateforme d'exemple générique](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md)             | Pose la frontière : le métier vit dans `atlas`, le socle reste générique.          |
| **CL-0041** | [dbt / data quality vivent dans atlas](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0041-dbt-data-quality-vivent-dans-atlas.md) | Précise ce qui n'a **pas** sa place dans `cluster` (la transformation de données). |
| **CL-0042** | [Cas-limite des sandbox](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0042-perimetre-sandbox.md)                                | Tranche les sandbox _en faveur_ de la frontière.                                   |
| **CL-0043** | [Contrat d'interface cluster → atlas](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md)     | **La source de vérité** du contrat (fichiers `contract/*.example.yaml`).           |
| **AT-0033** | [Contrat d'interface (vue atlas)](/atlas/decisions/0033-contrat-interface-cluster/)                                                                 | **Miroir applicatif** de CL-0043 : ce que l'application attend et fournit.         |
| **AT-0077** | [Topologie deux dépôts, frontière outillée](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)                                             | La décision-chapeau : garder deux dépôts, outiller la frontière.                   |

## Le contrat opérationnel (déploiement, images, données)

Comment l'application se déploie sur le socle, et ce qu'elle lui livre.

| Préfixe     | Décision                                                                                                                                                           | Rôle dans la frontière                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AT-0029** | [Architecture du pipeline de collaborations](/atlas/decisions/0029-architecture-pipeline-collaborations/)                                                          | Pose le contrat de données (Parquet + manifest sur S3) consommé via le cluster.                                                                                                |
| **AT-0043** | [Publication des images sur GHCR](/atlas/decisions/0043-publication-images-ghcr/)                                                                                  | Comment `atlas` livre ses images au registry du socle.                                                                                                                         |
| **AT-0069** | [Scan, signature et provenance des images](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)                                                           | Durcit la chaîne d'approvisionnement des images livrées.                                                                                                                       |
| **AT-0075** | [Déploiement prod par digest](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)                                                                  | `atlas` expose des **placeholders**, `cluster` injecte le digest immuable.                                                                                                     |
| **CL-0093** | [Cache de flux sur CNPG](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md)                                                 | Le socle fournit la base `cache` ; l'adaptateur vit côté atlas ([AT-0085](/atlas/decisions/0085-cache-flux-postgres-package-partage/)).                                        |
| **CL-0109** | [Persistance déclarative (`persistence.mode`)](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md)         | Le socle **déclare** le curseur `persistence.mode` (full/bounded/ephemeral) et le transporte vers atlas (var `CITATION_INGEST_PERSISTENCE_MODE`, câblage cluster→pod à venir). |
| **CL-0112** | [CI/CD in-cluster (Gitea Actions + build in-pod)](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0112-cicd-in-cluster-gitea-actions-buildkit.md) | Le socle **construit** l'image atlas au push (build in-pod) et la réconcilie ; remplace le build événementiel (CL-0105).                                                       |
| **AT-0102** | [Réaction au curseur `persistence.mode`](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/)                                                         | atlas **réagit** au curseur : socle sobre (bornes d'ingestion citation, byte-identity en `full`) + horizon en issues. Miroir applicatif de CL-0109.                            |

## Garde-fou

Tout changement d'un **point de contact** se reflète dans
[AT-0033](/atlas/decisions/0033-contrat-interface-cluster/) **dans la même PR** que
le changement de code, et l'alignement avec la source `cluster` (CL-0043) est tenu
par discipline. Les numéros restent **homonymes** entre dépôts ; les préfixes
`CL-`/`AT-` de cette page sont une **convention de lecture**, pas une renumérotation.
