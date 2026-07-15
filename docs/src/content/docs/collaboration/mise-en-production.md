---
title: Mettre en production
---

Cette page décrit **le geste** qui met du code atlas en production sur une instance :
un `push` vers la forge de l'instance. Elle s'adresse à qui exploite une instance —
pas à qui contribue au code (voir [Travailler ensemble](/atlas/collaboration/workflow/)).

Avant une première mise en service avec des données réelles, le
[gate RGPD](/atlas/collaboration/checklist-deploiement/) s'applique : il est
**indépendant** de cette page et prime sur elle.

## Le geste

```bash
dataops/deploy.sh          # confirmation interactive ; --yes pour le scripté
```

C'est **tout**. Le script pousse le `main` **revu** (`origin/main`, jamais votre HEAD
local) vers la forge Gitea de l'instance ; tout l'aval est autonome.

```
[vous]    dataops/deploy.sh → push main → forge Gitea de l'instance
   │
[usine]   Gitea Actions (.gitea/workflows/livraison.yaml, versionné dans atlas)
   ├─ build in-pod des code-locations changées (zéro egress)
   ├─ push registry:80/<cl>-dagster:<sha>
   └─ write-back : régénère la branche `deploy` = main ⊕ digests
        │
[usine]   Argo CD (Application par code-location, targetRevision: deploy)
   ├─ PreSync : migrations
   └─ Sync : pods sur l'image du commit poussé (@sha256)
        │
[vous]    armer les schedules (STOPPED par défaut) + valider le run
```

Le geste est **le même quelle que soit la cible** — Lima, cloud ou baremetal. Rien
dans `deploy.sh` ne dépend du terrain : il lit sa cible dans une seule variable.

## La cible : `GITEA_PUSH_URL`

`deploy.sh` **ne devine jamais** où il pousse. Il lit `GITEA_PUSH_URL` dans le fichier
`.env.cluster.local` à la racine d'atlas (gitignoré, jamais commité). Sans cette
variable, il refuse — bruyamment, plutôt que de livrer au mauvais endroit.

Ce fichier est **généré par le dépôt cluster**, qui connaît l'instance :

```bash
cd ../cluster && source nestor.sh
nestor stack select <votre-topologie>   # la cible : Lima, cloud ou baremetal
nestor access                           # génère atlas/.env.cluster.local
```

`nestor access` y écrit la cible de livraison (l'URL de la forge, avec un jeton
d'accès jetable), en plus des accès Postgres, OpenLineage et registre. C'est la
frontière entre les deux dépôts ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) :
**cluster fournit la cible, atlas la consomme**.

Vous pouvez aussi exporter `GITEA_PUSH_URL` à la main — c'est une intention explicite,
assumée ([ADR 0073](/atlas/decisions/) §B).

## Par terrain

Le geste ne change pas ; ce qui change, c'est **comment votre poste joint la forge** —
et c'est la topologie du cluster qui le dit.

| Terrain          | Comment la forge est jointe                                                   | À faire côté cluster                                      |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Lima** (local) | Réseau isolé → `nestor access` ouvre un port-forward et l'inscrit dans l'URL. | Rien : la dérivation est automatique.                     |
| **Baremetal**    | Accès direct à l'hôte de l'instance (`<hôte>:<port>`).                        | Déclarer `gitea.push_endpoint` dans la topologie.         |
| **Cloud**        | Idem baremetal (hôte publié, gateway ou NodePort).                            | Déclarer `gitea.push_endpoint` ; provisionnement à venir. |

> **Cloud** : le provisionnement de VM cloud n'est pas encore implémenté côté cluster —
> le terrain est un citoyen de premier ordre du modèle, mais monter l'instance reste
> manuel. Une fois l'instance montée et sa topologie déclarée, le geste est identique.

Si `nestor access` ne peut pas déterminer l'endpoint (cas cloud/baremetal sans champ
déclaré), il **n'écrit pas** la variable et vous le dit : déclarez alors
`gitea.push_endpoint: <hôte>:<port>` dans la topologie de l'instance.

## Ce que le geste ne fait pas

- **Il ne builde rien** sur votre poste. Les images sont construites **dans** le
  cluster, sans accès Internet. Une exception, rare : la **pré-image** de chaque
  code-location (l'étage lourd et figé des dépendances) se construit sur le poste, où
  le réseau est disponible — `dataops/<cl>-dagster/deploy/build-deps-base.sh`, à
  rejouer seulement quand `uv.lock` bouge.
- **Il ne lance aucun traitement.** Les schedules Dagster sont `STOPPED` par défaut :
  les armer reste un geste humain ([ADR 0062](/atlas/decisions/)).
- **Il ne joue pas les tests.** La qualité se joue **avant** le merge (hooks + CI
  GitHub) ; la chaîne in-cluster est une chaîne de **livraison**, pas de validation.
- **Il ne pousse jamais votre travail local.** Seul `origin/main` — revu et mergé —
  part en production.

## Suivre et vérifier

Après le push :

1. le run **livraison** sur la forge de l'instance (Gitea Actions) ;
2. la branche **`deploy`** : elle porte un commit `deploy: main <sha> ⊕ …` — c'est la
   projection mécanique `main ⊕ digests`, jamais éditée à la main ;
3. **Argo CD** : `Synced` / `Healthy`, migrations passées, pods sur l'image `@sha256`
   du commit poussé.

La chaîne complète est éprouvée par le scénario **36** du dépôt cluster, qui rejoue un
push réel et vérifie la branche `deploy` produite.

## Pourquoi ce découpage

La doctrine — le geste humain, les workflows versionnés dans atlas, la branche `deploy`
comme seule référence consommée par Argo CD — est actée par
l'[ADR 0104](/atlas/decisions/0104-mise-en-production-push-gitea/) (côté atlas) et son
pendant cluster (0113, l'usine ; 0114, la dérivation de la cible). Le
[plan de mise en production](/atlas/plans/2026-07-14-mise-en-production-push-gitea/)
en détaille les lots.
