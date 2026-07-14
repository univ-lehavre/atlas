---
title: Plan — Mise en production par push Gitea (chaîne de livraison bout-en-bout)
---

> **Date du plan : 2026-07-14.** Socle décisionnel : [ADR 0104](/atlas/decisions/0104-mise-en-production-push-gitea/) (le geste, les workflows, la branche `deploy` — côté atlas) et l'**ADR cluster 0113** (la branche `deploy` côté usine), proposés en **paire** ; [ADR cluster 0110](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0110-preimage-de-build-et-build-in-pod.md) (pré-image), [ADR cluster 0111](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0111-atlas-instancie-application-argocd.md) (atlas instancie), [ADR cluster 0112](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0112-cicd-in-cluster-gitea-actions-buildkit.md) (l'usine, prouvée sur un jouet — scénario 35), [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (contrat, frontière précisée dans la même PR), [ADR 0073](/atlas/decisions/) §B (garde de cible), [ADR 0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/) (déploiement par digest).
>
> **Ce document est un PLAN, pas une implémentation.** Les ADR 0104/0113 tranchent la doctrine ; ce plan la découpe en lots livrables (une PR par lot), côté atlas et côté cluster. Rien n'est déployé par un agent : les gestes de production restent humains (ADR 0033).

## 1. Thèse — trois acteurs, deux flux, un geste

**nestor installe une usine autonome (rare) ; atlas y dépose du code par un push (le geste) ; l'usine fait tout le reste (à chaque push).** La question « qui déploie, nestor ou atlas ? » était mal posée : ni l'un ni l'autre — l'usine in-cluster, que nestor installe et qu'atlas programme (workflows + manifestes).

```
[GitHub]  PR revue + mergée sur main                ← porte de QUALITÉ (hooks + CI GitHub)
    │
[poste]   deploy.sh → push main → Gitea (instance)  ← LE geste de MISE EN PRODUCTION (humain)
    │
[usine]   Gitea Actions (.gitea/workflows/, DANS atlas ; filtres branches=[main] + paths)
    ├─ garde de fraîcheur pré-image (check_deps_base_freshness — échec bruyant)
    ├─ buildctl → buildkitd rootless : cible `code` FROM deps-base@digest — zéro egress
    ├─ push registry:80/<cl>-dagster:<sha> → lit le digest
    └─ write-back : régénère `deploy` = main ⊕ digests (reportés + nouveaux) → push deploy
         │
[usine]   Argo CD (1 Application/code-location, targetRevision: deploy, instanciée par atlas)
    ├─ PreSync : ConfigMap+Job migration (fournis par atlas — prouvé en prod, citation)
    ├─ Sync    : Deployment gRPC @digest, OBC/secrets, PDB, fragment workspace
    └─ reconciler Dagster : agrège le fragment → l'orchestrateur voit la code-location
         │
[humain]  armement des schedules (STOPPED par défaut, ADR 0062) + validation du run
```

**Flux latéraux** : la pré-image (poste, egress, rare — `build-deps-base.sh`) ; l'activation d'une code-location (instancier son `Application` une fois, après sa première livraison).

## 2. Invariants (les gardes du système)

1. **`main` porte des placeholders, jamais un digest** — parité GitHub↔Gitea sur `main`, `validate.sh` l'exige déjà.
2. **`deploy` est une projection mécanique** (`main ⊕ digests`), régénérée par la CI, jamais éditée à la main ; les digests des code-locations non rebuildées sont **reportés**.
3. **La qualité se joue avant le merge** ; la chaîne in-cluster est un pipeline de **livraison** (pas de re-jeu des tests).
4. **Le push est un geste humain par instance** (garde `GITEA_PUSH_URL`, ADR 0073 §B) ; l'automatisme commence en aval.
5. **Le pipeline ne lance jamais un run de données** (schedules `STOPPED`, armement humain, ADR 0062).

## 3. Lots

### Lot 1 — atlas : les workflows de livraison

**But.** `.gitea/workflows/` versionnés dans atlas ; un push de `main` builde les code-locations changées et matérialise `deploy`.

**Fichiers.** `.gitea/workflows/livraison.yaml` (ou un par code-location si la lisibilité l'exige) : déclencheur `push` filtré `branches: [main]` + `paths: dataops/<cl>-dagster/**` ; steps par code-location changée — (a) résoudre le tag/digest de la pré-image (`scripts/check_deps_base_freshness.py --print-tag` + interrogation du registre ; échec bruyant si absente/périmée), (b) `buildctl build` cible `code` avec `DEPS_REF=…@sha256:…` (patron prouvé au scénario 35 cluster), (c) push `registry:80/<cl>-dagster:<sha court>`, (d) lire le digest produit ; step final — régénérer `deploy` (checkout `main`, reporter les digests présents sur l'ancien `deploy`, substituer les nouveaux, commit + push `deploy`).

**Invariants.** Aucun secret dans le workflow (le token vient du runner) ; le push de `deploy` ne re-déclenche rien ; une code-location non changée n'est pas rebuildée mais son digest est reporté.

**Done.** Revue du workflow ; preuve au banc : push d'un commit touchant UNE code-location → seule elle est rebuildée, `deploy` porte son nouveau digest ET les anciens des autres.

### Lot 2 — cluster : droits d'écriture du job CI + épreuve

**But.** Le job Actions peut pousser `deploy` sur le dépôt atlas de la forge.

**Portée.** Vérifier que le token Actions natif de Gitea autorise le push sur le dépôt courant ; sinon, livrable nestor : compte/token de livraison (secret d'instance, jamais versionné). Ajouter l'épreuve nestor « scénario 27 réel » (une code-location Dagster de bout en bout par la chaîne, remplaçant le jouet du 35) au catalogue.

**Done.** `deploy` poussé par un job CI au banc ; épreuve au catalogue.

### Lot 3 — atlas : bascule Argo CD + le geste

**But.** Les `Application` suivent `deploy` ; le geste de production est un script unique.

**Fichiers.** Les quatre `deploy/application.example.yaml` : `targetRevision: main` → `deploy` (+ commentaire : « `deploy` = projection mécanique, ADR 0104/0113 »). `deploy.sh` (racine `dataops/` ou par code-location : extraire le geste de push d'`install.sh` — garde `GITEA_PUSH_URL`, confirmation, `--yes` pour le scripté) ; `install.sh` (banc) reste le chemin « tout local » du banc léger.

**Done.** `validate.sh` inchangé vert (placeholders sur `main`) ; revue.

### Lot 4 — preuve réelle sur une instance (geste humain)

**But.** La chaîne complète sur node1, sur une code-location réelle.

**Déroulé (humain, ADR 0033).** Pré-image (`build-deps-base.sh`, poste) → `deploy.sh` (push `main`) → workflow → `deploy` → instancier l'`Application` (première fois) → Argo CD `Synced/Healthy` (migration PreSync passée) → pod gRPC `Running` sur l'image `@sha256` → armement d'un schedule → run réel validé (jalon du plan scholar-network §5 pour `scholar-network` ; l'équivalent citation vaut aussi).

**Done.** Un push → un pod qui tourne l'image du commit poussé, digest tracé par un commit sur `deploy`.

## 4. Adjacents (hors plan, tracés ailleurs)

- **`persistence.mode` → env des pods** (atlas #618 / cluster #627) : l'usine n'y touche pas ; les ancres restent en fail-safe `full`.
- **Terrain de stockage** : node1 (SeaweedFS/local-path) sert les overlays **bench** ; les overlays **prod** (OBC/RGW Ceph) attendent un terrain Ceph. Le choix d'overlay est une propriété d'instance (`storage.backend`), pas de criticité.
- **Miroir automatique GitHub→Gitea** : option future par instance (ADR 0104, alternative écartée aujourd'hui).

## 5. Critères de fin de plan

Un `deploy.sh` sur une instance livre **toutes les code-locations changées** sans autre geste : build in-pod, digests matérialisés sur `deploy`, Argo CD synchronisé, migrations appliquées, pods sur l'image du commit. `deploy` est **le seul** ref consommé par Argo CD ; `main` reste à placeholders. La preuve du lot 4 est verte sur node1.
