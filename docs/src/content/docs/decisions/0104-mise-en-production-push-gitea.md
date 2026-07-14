---
title: "0104 — Mise en production par push Gitea : le geste humain, les workflows de livraison et la branche deploy"
---

## Contexte

Les code-locations dataops sont **livrables** (Dockerfile deux cibles, scripts de
build, `Application` Argo CD, migrations — [ADR 0103](/atlas/decisions/0103-code-location-profils-chercheurs-reseau/)
et sa plomberie), et le cluster fournit une **usine CI/CD in-cluster prouvée**
([ADR cluster 0112](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0112-cicd-in-cluster-gitea-actions-buildkit.md) :
push → Gitea Actions → BuildKit rootless → registre → Argo CD). Mais **aucun
pipeline n'est formalisé entre le merge et le pod** :

- l'usine n'a été prouvée que sur un **jouet** (scénario 35 cluster) — le
  workflow et le manifeste étaient poussés par le script de test ;
- les placeholders d'image d'atlas (`__<CL>_IMAGE_DIGEST__` / `__<CL>_IMAGE__`)
  n'ont **plus de remplisseur** depuis que le seed cluster a été retiré
  ([ADR cluster 0111](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0111-atlas-instancie-application-argocd.md)) ;
- atlas ne porte **aucun workflow Gitea** (`.gitea/workflows/` n'existe pas),
  alors que la forge lit les workflows **du dépôt poussé** ;
- deux forges coexistent sans doctrine : GitHub (revue, CI de qualité) et le
  Gitea intra-cluster (livraison, [ADR 0044](/atlas/decisions/)) — qui pousse
  quoi, quand, vers laquelle ?

## Décision

> **La mise en production est UN GESTE HUMAIN : pousser `main` (revu, mergé)
> vers la forge Gitea d'une instance. Tout l'aval est autonome : les workflows
> de livraison — fournis PAR atlas (`.gitea/workflows/`) — buildent les
> code-locations changées dans l'usine du cluster et matérialisent leurs
> digests sur la branche `deploy`, que suivent les `Application` Argo CD
> instanciées par atlas.**

### 1. Le geste : un push par instance

Un script dédié (`deploy.sh`, généralisant le geste de push d'`install.sh`)
pousse `main` vers la cible Gitea d'une instance, après confirmation explicite
et sous la garde de cible `GITEA_PUSH_URL` ([ADR 0073](/atlas/decisions/) §B :
la cible se lit du `.env` d'instance, jamais devinée). La **cadence est par
instance** : l'humain choisit quand une instance reçoit `main`. L'« événementiel »
de l'évolution du contrat ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/))
commence **en aval** de ce push — le push lui-même reste le geste
(« aucun agent ne déclenche le déploiement réel »).

**Alternative écartée** — le miroir automatique GitHub→Gitea (merge = mise en
production) : vraie livraison continue, mais plus aucun découplage
merge/déploiement par instance. Possible plus tard comme **propriété
d'instance** (topologie), pas comme doctrine globale.

### 2. atlas fournit ses workflows de livraison

Les workflows Gitea Actions sont **versionnés dans atlas**
(`.gitea/workflows/`) — même statut que les manifestes kustomize : atlas
déclare, l'usine exécute. Ils sont :

- **filtrés** sur `branches: [main]` et par chemins
  (`dataops/<cl>-dagster/**`) : seules les code-locations changées sont
  rebuildées, et le push de `deploy` ne re-déclenche rien (pas de boucle) ;
- **de livraison seulement** : garde de fraîcheur de la pré-image
  (`check_deps_base_freshness`, échec bruyant si le lock a divergé de la base
  publiée), build de la cible `code` `FROM` la pré-image (zéro egress,
  [ADR cluster 0110](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0110-preimage-de-build-et-build-in-pod.md)),
  push au registre interne, write-back du digest. **Pas de re-jeu des tests** :
  la qualité (hooks locaux + CI GitHub) se joue avant le merge ; le push ne
  part que de `main` revu.

### 3. La branche `deploy` : ce que suit Argo CD

Le digest de chaque image buildée est **matérialisé par la CI sur la branche
`deploy`** du dépôt Gitea — une **projection mécanique** `main ⊕ digests`,
régénérée à chaque livraison (les digests des code-locations non rebuildées
sont reportés), jamais éditée à la main. Le contrat côté usine est acté par
l'ADR cluster 0113 (proposé en **paire** avec celui-ci). Conséquences côté
atlas :

- les patrons `application.example.yaml` passent à `targetRevision: deploy` ;
- `main` garde ses placeholders **intacts** — parité GitHub↔Gitea sur `main`,
  la revue ne voit jamais un digest, et les gardes `validate.sh` continuent de
  l'exiger.

### 4. Hors pipeline (les flux latéraux)

- **La pré-image** (`build-deps-base.sh`) : poste de contrôle, egress, rare —
  seul build à toucher Internet ([ADR cluster 0110](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0110-preimage-de-build-et-build-in-pod.md)).
- **L'activation** d'une code-location : instancier son `Application`
  ([ADR cluster 0111](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0111-atlas-instancie-application-argocd.md)) —
  une fois, après sa première livraison (avant, `deploy` n'a pas son digest).
- **L'armement des schedules** : `STOPPED` par défaut, geste du déployeur
  ([ADR 0062](/atlas/decisions/)) — le pipeline de livraison ne lance jamais
  un run de données.

## Conséquences

- La chaîne est définie de bout en bout : merge (qualité) → `deploy.sh`
  (geste) → usine (build + write-back sur `deploy`) → Argo CD (migrations
  PreSync + rollout par digest) → reconciler Dagster → armement humain.
- À construire (plan `2026-07-14-mise-en-production-push-gitea`) : les
  workflows de livraison, `deploy.sh`, la bascule `targetRevision: deploy` des
  quatre `application.example.yaml`, et la preuve réelle sur une instance.
- L'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) est mis à
  jour **dans la même PR** : son paragraphe « cluster valide, instancie et
  remplit » était périmé depuis l'ADR cluster 0111 — il décrit désormais le
  flux réel.

## Alternatives écartées

- **Miroir automatique GitHub→Gitea** : cf. §1 (perte du découplage par
  instance).
- **Mutation de `main` Gitea par la CI, Argo CD Image Updater, retour du
  seed** : instruites et écartées côté usine — cf. ADR cluster 0113
  (divergence de `main`, brique en plus et digest hors git, re-couplage de
  cluster à l'applicatif).

## Statut

Accepted (2026-07-14). Forme une **paire** avec l'ADR cluster 0113 (la branche
`deploy` côté usine). S'appuie sur les ADR cluster 0110/0111/0112 et les
[ADR 0073](/atlas/decisions/)/[ADR 0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/).
Conception : plan [2026-07-14](/atlas/plans/2026-07-14-mise-en-production-push-gitea/).
Amende la section « Évolution » de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(précisée, même PR). Ne supersede aucun ADR.
