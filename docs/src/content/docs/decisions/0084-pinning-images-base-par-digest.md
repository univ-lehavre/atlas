---
title: "0084 — Épinglage des images de base par digest (Pinned-Dependencies)"
---

## Contexte

Le premier passage d'**OpenSSF Scorecard** (câblé par
[ADR 0083](/atlas/decisions/0083-openssf-scorecard-cable/)) note le critère
**Pinned-Dependencies** à **3/10** : les actions GitHub sont **toutes épinglées
par SHA** (42/42 GitHub-owned, 16/16 tierces — un acquis du dépôt), mais
**aucune des 31 images de base** des `Dockerfile` ne l'est par **digest**. Chaque
`FROM node:24.18.0-alpine3.24`, `python:3.10-slim` ou `php:8.2-apache` résout un
**tag mobile** : le même `Dockerfile`, construit à deux dates, peut tirer **deux
images différentes** si l'éditeur amont republie le tag. C'est exactement la
dérive que l'épinglage par SHA des actions évite déjà côté CI, et que
l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)
(reproductibilité : « services par digest, jamais par tag mobile ») pose comme
principe — mais qui n'était **pas appliqué aux images de base**.

Un _digest_ (`@sha256:…`) est l'**empreinte de contenu** d'une image : il
identifie un artefact **immuable**, là où un tag est un pointeur **réinscriptible**.
Épingler par digest rend le build **reproductible** et **vérifiable**, et coupe un
vecteur d'attaque de chaîne d'approvisionnement (republication malveillante d'un
tag).

La contrepartie connue est la **péremption** : un digest figé ne reçoit plus les
correctifs de sécurité de l'image de base tant qu'il n'est pas **bumpé**. Sans
mécanisme de mise à jour, l'épinglage troque une dérive (tag mobile) contre une
autre (image figée vulnérable). Le dépôt résout déjà ce dilemme pour les actions
GitHub et les paquets : **Dependabot** bumpe les SHA/versions. Il faut la même
boucle pour les images.

## Décision

> **Les images de base des `Dockerfile` sont épinglées par digest `@sha256:…`, le
> tag lisible étant conservé en regard ; un écosystème `docker` est ajouté à
> Dependabot pour maintenir ces digests à jour.**

### 1. Épinglage par digest, tag conservé

Chaque `FROM` qui référence une image de registre porte désormais
`image:tag@sha256:…`. Le **tag reste** (lisibilité, documentation de la version
réelle), le **digest fait foi** (immuabilité). Pour les `Dockerfile` Node qui
paramètrent la version par build-arg, un `ARG` de digest est ajouté à côté des
`ARG NODE_VERSION`/`ALPINE_VERSION` existants :

```dockerfile
ARG NODE_VERSION=24.18.0
ARG ALPINE_VERSION=3.24
ARG NODE_DIGEST=sha256:…
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}@${NODE_DIGEST} AS base
```

Les étapes multi-stage internes (`FROM base`, `FROM deps`) référencent une
**étape locale**, pas un registre : elles ne portent **pas** de digest.

### 2. Boucle de fraîcheur Dependabot

Un bloc `package-ecosystem: "docker"` est ajouté à
[`.github/dependabot.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/dependabot.yml)
pour **chaque répertoire** contenant un `Dockerfile`. Dependabot ouvre une PR
quand un digest épinglé prend du retard sur son tag — l'image figée redevient un
état **suivi**, pas une dette silencieuse. Les PR passent la CI comme toute autre.

### Périmètre

Couvre les **31 images** des 10 `Dockerfile` (6 apps SvelteKit, le service `crf`,
les 2 code-locations DataOps, le bac à sable PHP). Hors périmètre : les
`pipCommand`/`downloadThenRun` également signalés par Scorecard — traités à part
(un `pip install` épinglé par hash et un script `curl | sh` relèvent d'un autre
arbitrage, voir la rubrique « non couvert » ci-dessous).

## Alternatives écartées

- **Rester sur les tags mobiles.** L'état noté 3/10 : build non reproductible,
  vecteur supply-chain ouvert. Rejeté — c'est le problème, et il contredit
  [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/).
- **Épingler par digest sans Dependabot.** Troque la dérive du tag mobile contre
  des images **figées et vulnérables** : on perd les correctifs amont en silence.
  Rejeté — l'épinglage n'est sûr **qu'avec** une boucle de mise à jour.
- **Retirer le tag, ne garder que le digest.** Un `FROM node@sha256:…` est
  illisible : on perd la version réelle de l'image. Rejeté — tag + digest donne
  l'immuabilité **et** la lisibilité.
- **Remonter le score à 10/10 (pip, downloadThenRun inclus).** Hors de ce
  périmètre ; un `pip install --require-hashes` et le `curl | sh` du bac à sable
  demandent un arbitrage propre. Tracé comme **non couvert**, pas masqué
  ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).

## Statut

Accepted (2026-06-29). Les 10 `Dockerfile` sont épinglés ; l'écosystème `docker`
est ajouté à Dependabot. Le critère Pinned-Dependencies remontera au prochain
recalcul Scorecard ; il ne **plafonnera pas à 10** tant que `pipCommand` et
`downloadThenRun` ne sont pas traités — écart **assumé et tracé**.

## Conséquences

**Bénéfices.** Les builds d'images deviennent **reproductibles** (même
`Dockerfile` → même image de base, à l'octet) et **vérifiables** ; un vecteur
supply-chain (republication de tag) est coupé. La pratique d'épinglage déjà
acquise sur les actions GitHub s'étend aux images, sous la même boucle Dependabot
— cohérence d'un bout à l'autre de la chaîne. Le critère Scorecard progresse
honnêtement.

**Prix à payer.** Un **`ARG` de digest** de plus par `Dockerfile` Node à tenir à
jour, et **10 entrées Dependabot** supplémentaires (une par répertoire) — bruit de
PR borné par `open-pull-requests-limit`. Un digest et un tag qui **divergent** (le
digest n'est pas celui du tag affiché) seraient trompeurs : le tag et le digest
doivent être bumpés **ensemble**, ce que Dependabot fait.

**Garde-fous.**

- **Tag et digest cohérents** : une PR qui change le tag sans le digest (ou
  l'inverse) est refusée en revue — ils désignent la **même** image.
- **Épinglage ⇒ boucle de fraîcheur** : tout nouvel `Dockerfile` épinglé entre
  **en même temps** dans Dependabot `docker` (même PR), pour ne pas réintroduire
  d'image figée non suivie.
- **Écarts tracés** : `pipCommand`/`downloadThenRun` restent un **finding ouvert**
  documenté, pas un trou silencieux
  ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).
- **Neutralité** : épingler une image générique (`node`, `python`, `php`)
  n'ancre le dépôt dans aucun domaine ni marque applicative
  ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
