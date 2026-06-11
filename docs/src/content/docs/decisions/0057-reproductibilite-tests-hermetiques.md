---
title: "0057 — Reproductibilité : tests hermétiques, fixtures figées et preuve par exécution"
---

## Contexte

Le dépôt épingle déjà beaucoup pour la reproductibilité — _lockfiles_ (`pnpm-lock.yaml`,
`uv.lock`), versions de runtime (`.nvmrc`, `.python-version`), `sha256` dans le contrat de
données ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)),
partitions immuables ([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)) —
mais **sans que le principe soit énoncé nulle part**. Résultat : des angles morts sont
apparus à l'usage.

En développant l'ingestion DataOps (OpenAlex), les tests de bout en bout (_smoke tests_)
dépendaient de l'**extérieur** : ils tournaient contre le **vrai** `s3://openalex` (une donnée
**live** qui change), démarraient un MinIO en image `latest` (flottante, non figée), et
utilisaient des outils de la machine hôte (rclone, DuckDB) non verrouillés. Un test qui passe
aujourd'hui peut donc échouer demain **sans changement de code** — la pire forme de
non-reproductibilité.

Or l'étape suivante (pipeline dbt de transformation) **exige le déterminisme** : même brut →
même `curated` → même mart, jusqu'au `sha256` du `manifest.json`. Un pipeline validé contre des
données live avec des outils flottants ne garantit rien. Il faut énoncer la règle avant de
bâtir dessus.

Un **test hermétique** est un test dont le résultat ne dépend **que** de son code et de ses
entrées figées — **ni** du réseau, **ni** de l'horloge, **ni** de l'état de la machine, **ni**
d'un service externe vivant.

## Décision

> **Tout test est hermétique et reproductible : il ne dépend ni du réseau, ni d'un service
> externe live, ni de l'état de la machine. Les entrées sont des fixtures figées et commitées ;
> les outils et services de test sont épinglés à une version exacte.**

### Fixtures figées, jamais de données live

Un test ne lit **jamais** une source externe vivante (le vrai `s3://openalex`, une API en
production). Il consomme des **fixtures versionnées** sous [`fixtures/`](https://github.com/univ-lehavre/atlas/tree/main/fixtures)
(dossier déjà existant). Les fixtures sont soit **synthétiques** (fabriquées à la main, fidèles
au schéma réel), soit un **échantillon réel figé et capturé une fois** — jamais re-téléchargé à
l'exécution. Aucune donnée personnelle réelle n'y figure ([ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)).

### Versions épinglées de bout en bout

La chaîne d'outils est verrouillée par _lockfile_ (`pnpm-lock.yaml`, `uv.lock`) et par fichier
de version (`.nvmrc`, `.python-version`). Les **services de test conteneurisés** (MinIO,
Postgres de test…) sont référencés **par digest** (`image@sha256:…`), **jamais** par tag mobile
(`latest`, `1`, `stable`). Un tag mobile rend le test non reproductible par construction.

### Portabilité matérielle : x86_64 et arm64

Tout le code du dépôt doit tourner **à l'identique sur les deux architectures
processeur** : **x86_64** (la CI GitHub Actions, la prod _bare-metal_) et **arm64**
(le banc Lima sur Mac ARM, les machines de développement). C'est une facette de la
reproductibilité : un test qui passe sur une arche mais échoue sur l'autre n'est pas
reproductible. Concrètement : toute **dépendance binaire** (wheel Python compilé,
image de base) doit fournir des artefacts pour **les deux** arches ; le code ne
suppose jamais une arche (pas d'extension native mono-plateforme, pas d'instruction
spécifique). Une dépendance qui n'a de wheel que pour une arche est **rejetée** ou
remplacée.

### Déterminisme du pipeline de données

Une même entrée produit une même sortie, **à l'octet près**. C'est ce qui rend vérifiable le
`sha256` du `manifest.json` (un consommateur recalcule et compare) et possible la
**ré-dérivabilité** du mart (re-générer une partition à l'identique). Tout non-déterminisme
(ordre non trié, horodatage embarqué, identifiant aléatoire non seedé) est un défaut à corriger,
pas à tolérer.

### La preuve : une exécution réelle, reproductible et datée

Un comportement n'est **prouvé** qu'après une **exécution réelle** — jamais par une
simple revue de code ni un « ça devrait marcher ». La reproductibilité rend cette
preuve **rejouable à volonté** (mêmes fixtures, mêmes versions, même résultat), donc
crédible. On distingue **deux niveaux**, complémentaires :

- **Preuve de mécanique** — un _smoke test_ **hermétique** (fixtures figées, service
  conteneurisé épinglé par digest) qui exécute le vrai code et vérifie son effet. Il
  prouve que la logique fonctionne, hors cluster, en quelques secondes. C'est le
  niveau exigé **à chaque incrément**.
- **Preuve d'intégration** — une exécution **déployée de bout en bout** (sur le banc,
  via le harnais de validation de code-location externe du dépôt `cluster`) qui
  prouve que la brique fonctionne **dans son environnement réel**. C'est le niveau
  exigé **aux jalons**.

Une preuve d'intégration **a une date et peut périmer** : l'environnement (cluster,
images, dépendances) évolue, donc une preuve ancienne ne garantit plus rien. À
l'image du garde-fou « fraîcheur des preuves de banc » du dépôt
[cluster (ADR 0042)](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0042-fraicheur-preuves-banc.md),
une preuve déployée périmée doit être **rejouée** avant de s'en réclamer. Un écart
révélé au moment d'une preuve (de mécanique ou d'intégration) est consigné au
[registre de drifts](/atlas/audit/registre-drifts/) ([ADR 0056](/atlas/decisions/0056-registre-drifts/)).

### Garde-fou : la non-hermétisme est un défaut de revue

Un test qui touche le réseau, lit une source live, ou utilise une image flottante est un
**défaut**, signalé en revue au même titre qu'un bug. Les rares tests qui _exigent_ un
environnement externe (un vrai banc, un vrai service) sont **explicitement marqués**
(`@pytest.mark.integration`, suites _self-skipping_) et **exclus** du chemin de test
reproductible par défaut.

## Statut

Accepted (2026-06-11). Énonce un principe déjà partiellement à l'œuvre (lockfiles, `sha256`,
immutabilité) et le **généralise** à tous les tests. S'applique à l'étape 3 du pipeline DataOps
(transformations dbt déterministes) comme à tout le périmètre Node/TS et Python.

## Conséquences

**Bénéfices.** Les tests deviennent **fiables dans le temps** : un échec signale un vrai
problème, pas un changement de l'extérieur. La reproductibilité du pipeline de données rend le
contrat `sha256`/manifest et la ré-dérivabilité **vérifiables**. Le _onboarding_ est plus simple
(aucun secret ni accès réseau pour faire tourner les tests).

**Prix à payer.** Il faut **fabriquer et maintenir des fixtures** (synthétiques fidèles au
schéma réel — un coût quand la source évolue). Épingler les images par digest demande de les
**bumper consciemment** (au prix d'un test de non-régression au passage). Les tests d'intégration
réels existent toujours, mais hors du chemin par défaut.

**Garde-fous.**

- Aucune source **live** dans un test ; fixtures sous `fixtures/`.
- Images de test **par digest** (`@sha256:…`), jamais de tag mobile.
- Toolchain via lockfiles ; runtime via `.nvmrc`/`.python-version`.
- Les tests exigeant un environnement externe sont **marqués et exclus** du défaut.
- Le déterminisme du pipeline est **testé** (rejeu → même sortie ; `sha256` stable).
- Toute dépendance binaire fournit des wheels **x86_64 et arm64** ; le code ne
  suppose aucune arche (CI x86, banc arm).
- Un comportement n'est « fait » qu'une fois **prouvé par exécution** : preuve de
  mécanique (smoke hermétique) à chaque incrément, preuve d'intégration (déployée)
  aux jalons. Une preuve d'intégration **périmée** est rejouée avant d'être invoquée.
