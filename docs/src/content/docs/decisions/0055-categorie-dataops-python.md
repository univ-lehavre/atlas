---
title: "0055 — Catégorie dataops/ : code DataOps en Python natif (Dagster/dbt)"
---

## Contexte

L'[ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/) range le monorepo en
**8 catégories** (apps, assets, packages, services, cli, ui, config, sandbox),
toutes en TypeScript/Node. Les [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/)
(programmation fonctionnelle avec Effect) et
[ADR 0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/) (logique métier
dans `packages/`) en découlent. Le README affirme « TypeScript strict sur tout le
dépôt ».

Les [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) et
[0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) actent une plateforme
**DataOps** — application au traitement de données des pratiques d'automatisation et
de qualité du DevOps — bâtie sur **Dagster** (orchestrateur de pipelines de données)
et **dbt** (outil de transformation SQL versionnée). Or ces deux briques sont
**écrites en Python** et n'ont pas d'équivalent TypeScript de premier ordre :

- une **code-location** Dagster (l'unité qui expose des assets à l'orchestrateur)
  _est_ un module Python servi en **gRPC** (`dagster api grpc -m <module>`) ;
- `dbt-duckdb` est un paquet Python ;
- l'écosystème (qualité de données, lineage) est Python-centré.

Le plan initial présupposait de loger cette logique dans `packages/citation`
(TS/Effect, conformément à 0008). C'est **infaisable** sans réécrire Dagster et dbt.
Il faut donc accueillir du Python dans le dépôt — un écart de paradigme qui doit être
**délimité explicitement**, pas subi.

## Décision

> **Le code DataOps (assets Dagster, modèles dbt, sync de données) vit dans une
> nouvelle catégorie de premier niveau `dataops/`, écrite en Python natif. Le
> monorepo passe de 8 à 9 catégories.**

### Une 9e catégorie `dataops/`, hors du graphe pnpm mais pilotée par pnpm

`dataops/` accueille des sous-projets Python (à commencer par
`dataops/citation-dagster/`, la code-location du pipeline de citations). Cette
catégorie n'est **pas** un _workspace pnpm_ (espace de travail géré par le
gestionnaire de paquets Node) : elle n'est pas déclarée dans `pnpm-workspace.yaml`,
et **aucun `package.json`** n'est posé dans un dossier Python (ce serait un manifeste
npm trompeur pour du code sans JavaScript). En conséquence, les outils qui découvrent
les paquets via le workspace — pnpm, turbo, knip, `audit:structure` — l'**ignorent**
sans configuration.

**Mais pnpm reste le chef d'orchestre**, selon le modèle déjà éprouvé dans le dépôt
`cluster` : « pnpm orchestre, l'outil natif exécute ». Des scripts du `package.json`
racine — `lint:python` et `test:python` — **délèguent à `uv`** (`uv run ruff`,
`uv run pytest`). Le point d'entrée reste unique (`pnpm …`), sans faire du Python un
faux paquet Node. C'est le meilleur des deux mondes : une seule porte d'entrée (pnpm),
zéro dérogation Node à écrire (pas de règle `audit:structure` Python, pas d'exception
knip pour un faux paquet).

### Outillage Python : uv + ruff + pytest

Le Python de `dataops/` est outillé par **uv** (gestionnaire d'environnement et de
dépendances rapide, `uv.lock` versionné pour la reproductibilité), **ruff** (linter
et formateur) et **pytest** (tests). Ce choix s'aligne sur le dépôt `cluster`, qui
utilise déjà uv pour construire son image Dagster. Alternative écartée : `poetry`
(plus lent, moins aligné avec l'infrastructure).

### Langages autorisés dans le dépôt

Le dépôt n'autorise que **deux langages**, chacun cantonné à son périmètre :

- **TypeScript/Node** — le périmètre applicatif (apps, packages, services, cli, ui).
  Il porte la programmation fonctionnelle Effect ([ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/))
  et la règle « logique dans `packages/` » ([ADR 0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/)).
- **Python** — **uniquement** la catégorie `dataops/`, imposé par Dagster et dbt.

Ces ADR 0005/0008 **portent sur le seul périmètre Node/TypeScript** : `dataops/`
suit un paradigme distinct (Python idiomatique, modèle d'erreur Python, pas de
retour `Effect<A, E>`). Cet ADR **précise** ce périmètre, sans remplacer ni
contredire 0005/0008. **Tout autre langage est interdit** sans un nouvel ADR qui
l'autorise explicitement et en définit l'outillage qualité (ci-dessous) : on ne
veut pas d'un dépôt polyglotte non maîtrisé.

### Le contrat Parquet + manifest reste la frontière inter-langages

La cohabitation TS ↔ Python est propre parce qu'elle ne passe **jamais** par un appel
direct entre les deux mondes. Le producteur Python (dbt/Dagster) écrit un **fichier
Parquet + un `manifest.json`** sur le stockage objet ; le consommateur TypeScript
(le futur `atlas-api`, le validateur de contrat dans `packages/citation`) lit ce
contrat. La seule interface entre `dataops/` et le reste du dépôt est ce fichier sur
S3 — contrat inchangé depuis 0029/0054.

### Même exigence de qualité partout, enforcée

**Principe directeur : `dataops/` est soumis aux mêmes exigences de qualité que le
reste du dépôt** — lint, format, tests, et **couverture mesurée avec un seuil
bloquant** — simplement avec l'outillage de son langage. La frontière de langage ne
crée **aucune** zone de moindre rigueur.

La correspondance est explicite :

| Exigence           | Node/TypeScript | `dataops/` (Python)             |
| ------------------ | --------------- | ------------------------------- |
| Lint               | ESLint          | ruff (lint)                     |
| Format             | Prettier        | ruff (format)                   |
| Tests              | vitest          | pytest                          |
| Couverture à seuil | seuils vitest   | `pytest --cov --cov-fail-under` |

**Enforcement.** Comme `dataops/` est hors du graphe pnpm, turbo ne le découvre pas :
on branche sa vérification par les **scripts pnpm** `lint:python` (ruff) et
`test:python` (pytest + couverture à seuil), agrégés dans `dataops:check`. Ce dernier
est **ajouté à `ci:checks`, au hook pre-push et à un job CI dédié** (qui installe `uv`),
au même titre que les vérifications Node. Une régression de qualité dans `dataops/`
**bloque** donc la CI et le push, exactement comme ailleurs. `uv` devient un prérequis
de développement, au même rang que Node/pnpm.

Seul l'**audit de structure** (`audit:structure`) ne s'applique pas à `dataops/` : ses
règles (interdiction de `bin`, dépendances Node, conventions de nommage npm) sont
spécifiques au monde Node et n'ont pas de sens en Python. Ce n'est pas un relâchement
de qualité — c'est l'inapplicabilité d'un audit Node à du Python ; la discipline
structurelle de `dataops/` est portée par ruff et la revue.

## Statut

Accepted (2026-06-10). **Amende** l'[ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/)
(8 → 9 catégories). **Précise le périmètre** des ADR
[0005](/atlas/decisions/0005-effect-pour-la-pf/) et
[0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/) (Node/TypeScript) sans
les remplacer. Met en œuvre l'[ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)
(sync rclone du snapshot S3) dans ce nouveau terrain Python.

## Conséquences

**Bénéfices.** Dagster et dbt sont utilisés **nativement**, sans pont fragile vers
Node. La cohabitation TypeScript/Python est cadrée par une frontière nette (le contrat
Parquet). L'outillage Python (uv) est aligné sur le dépôt `cluster`, ce qui mutualise
les pratiques. Le périmètre des ADR Effect est clarifié au passage.

**Prix à payer.** Le dépôt porte désormais **deux chaînes d'outillage** (pnpm pour le
Node, uv pour le Python) et **deux jeux de vérifications qualité** à maintenir en
parallèle (les scripts `lint:python`/`test:python` en plus des tâches turbo). `uv`
devient un prérequis de développement. `dataops/` échappe au seul `audit:structure`
(audit propre au monde Node), mais **pas** aux exigences de lint/format/tests/couverture,
qui restent enforcées. Une **image Dagster maison arm64** doit être maintenue pour le
banc local (les images officielles Dagster sont amd64 seulement).

**Garde-fous.**

- La frontière de langage est le **contrat Parquet + manifest** : aucun import croisé
  TS ↔ Python, aucune dépendance directe.
- **Qualité enforcée, pas optionnelle** : les scripts pnpm `lint:python` (ruff) et
  `test:python` (pytest + couverture à seuil) — agrégés dans `dataops:check` — sont
  branchés à `ci:checks`, au hook pre-push et à un job CI ; une régression bloque la CI
  et le push, comme pour le code Node.
- `.prettierignore` exclut `dataops/` pour découpler le formatage Node ; le formatage
  Python est tenu par ruff (pas un relâchement, un transfert d'outil).
- **Aucun langage hors TS/Node et Python** sans un ADR dédié qui en définit l'outillage
  qualité équivalent.
- Nommage `citation` partout dans les identifiants internes (bucket, module, variable) ;
  « openalex » n'apparaît qu'en prose, pour désigner le bucket source externe.
- Toute nouvelle catégorie reste soumise à un ADR (règle de 0002 préservée).
