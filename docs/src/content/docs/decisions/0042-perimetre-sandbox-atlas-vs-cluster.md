---
title: "0042 — Périmètre des sandbox : dev/test local dans atlas, pas dans cluster"
---

## Contexte

Le dépôt expose un répertoire [`sandbox/`](/atlas/architecture/monorepo/) — trois
bancs d'essai (`crf-sandbox`, `amarre-sandbox`, `sillage-sandbox`) qui montent,
via `docker compose`, des **backing services locaux** (instance REDCap, Appwrite
self-hosted, Mailpit) pour développer et tester les applications sans dépendre de
la production.

La question s'est posée légitimement : ces bancs relèvent-ils du **code
applicatif** (donc d'`atlas`) ou de l'**infrastructure** (donc du dépôt
`cluster`) ? Deux signaux tirent en sens opposés :

- **Vers `cluster`.** Les sandbox ne dépendent d'**aucun paquet métier**
  d'`atlas` : leur seule dépendance workspace est `@univ-lehavre/atlas-shared-config`
  (presets eslint/prettier/vitest), et leurs scripts n'importent que la
  bibliothèque standard de Node et des SDK externes (`node-appwrite`,
  `@playwright/test`, `@faker-js/faker`). Elles tirent des **images publiques**
  (Appwrite, REDCap, Mongo, Redis, MySQL, Mailpit), jamais une image `atlas`.
  Vues sous cet angle, ce sont des piles d'infrastructure autonomes.
- **Vers `atlas`.** Leur couplage n'est pas au niveau du code, il est au niveau
  du **cycle de vie** : la CI e2e (`.github/workflows/e2e.yml`) se déclenche sur
  les `pull_request` touchant `sandbox/amarre-sandbox/**` et
  `sandbox/sillage-sandbox/**`, et ses smoke tests Playwright valident
  l'intégration **app ↔ backing services**. Un changement d'app entraîne souvent
  un ajustement des fixtures, du `seed` ou du `bootstrap` de sa sandbox. Une PR
  reste ainsi **une version cohérente de code + tests**.

Le [contrat d'interface avec le cluster (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/)
a déjà tranché la frontière générale : `atlas` porte tout l'**applicatif** (code,
images, manifestes de ses propres services), `cluster` porte toute
l'**infrastructure** et **le déploiement réel** ; « aucun code applicatif ne vit
dans `cluster` ». Restait à statuer explicitement sur le cas des sandbox, qu'il
ne nomme pas.

## Décision

> **Les sandbox sont un outil de dev/test local et restent dans `atlas`. Elles
> ne déménagent pas vers `cluster`.** La frontière de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
> est lue ainsi : `cluster` fournit les backing services **en production** ; les
> sandbox **maquettent ces mêmes services en local** pour le développement. Ce
> sont deux incarnations d'un même rôle, mais l'une est l'infrastructure de
> déploiement (cluster), l'autre l'outillage qui accompagne le code (atlas).

### Pourquoi `atlas` plutôt que `cluster`

- **Le couplage déterminant est le cycle de vie, pas les dépendances.** L'absence
  de dépendance au code métier ne fait pas des sandbox de l'infra : ce qui les
  lie à `atlas`, c'est que leurs tests valident les apps `atlas` et se
  déclenchent sur les PR `atlas`. Les séparer ferait diverger le code de ses
  propres tests d'intégration.
- **Mélanger sandbox et cluster brouillerait le contrat ADR 0033.** Mettre du
  docker-compose de dev local dans le dépôt d'infrastructure réintroduirait dans
  `cluster` ce que l'ADR 0033 en exclut (de l'outillage applicatif), au prix de
  la clarté de la frontière qu'on vient d'établir.
- **Les sandbox sont déjà rangées et auditées dans `atlas`.** Elles forment une
  catégorie à part entière du monorepo
  ([ADR 0002](/atlas/decisions/0002-monorepo-huit-categories/)), avec une
  **politique de dépendances** propre
  ([ADR 0021](/atlas/decisions/0021-sandbox-deps-policy/)) **enforcée** par
  `audit:structure` (aucun paquet non-sandbox ne peut dépendre d'une sandbox).
  L'isolation est acquise sur place.
- **Le coût d'un déménagement est élevé pour un bénéfice faible.** Il faudrait
  refondre la CI e2e (déclenchements cross-dépôt par `repository_dispatch`),
  synchroniser un second lockfile, gérer le `docker include:` entre dépôts et
  fragmenter la documentation — sans gain proportionné, puisque l'isolation
  recherchée existe déjà.

### Ce que la décision n'interdit pas

- La source **REDCap propriétaire** (`sandbox/crf-sandbox/upstream/…`, ~174 Mo,
  déjà **gitignorée** et tirée à la demande par `prepare-crf-source.sh`) reste un
  **artefact/secret** : son hébergement éventuel côté `cluster` ou dans un store
  de secrets est un sujet d'infrastructure distinct, hors de cet ADR. Le script
  qui la matérialise reste, lui, dans `atlas`.
- À très long terme, `crf-sandbox` — le plus « infra » des trois (validation de
  contrat OpenAPI contre une instance REDCap réelle, indépendant des apps) —
  pourrait être reconsidéré ; mais `amarre-sandbox` et `sillage-sandbox` en
  dépendent aujourd'hui via `docker include:`, donc le détacher coûterait plus
  qu'il ne rapporte. Un tel mouvement **rouvrirait cet ADR**.

## Statut

Accepted (2026-06-04).

## Conséquences

**Bénéfices.**

- La frontière `atlas` ↔ `cluster` de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
  gagne un cas explicite : on ne re-posera pas la question à chaque revue
  d'architecture.
- Le code applicatif et ses tests d'intégration restent **versionnés ensemble** :
  une PR reste cohérente, la CI e2e reste simple (déclenchements intra-dépôt).
- Aucun travail de migration, aucune refonte CI : on acte un état déjà propre.

**Prix à payer.**

- `atlas` conserve dans son arbre du docker-compose et des images publiques qui,
  pris isolément, ressemblent à de l'infrastructure — une **ambiguïté assumée**,
  justifiée par le couplage de cycle de vie.
- Si `crf-sandbox` mûrit en banc d'infra autonome, la frontière devra être
  rejouée (réouverture de cet ADR), avec le coût de migration alors différé.

**Garde-fous.**

- La **politique de dépendances des sandbox** ([ADR 0021](/atlas/decisions/0021-sandbox-deps-policy/))
  et son enforcement par `audit:structure` restent la barrière qui empêche les
  sandbox de fuiter dans le code applicatif (et inversement).
- Tout déplacement futur d'une sandbox vers `cluster` **passe par un nouvel ADR**
  qui supersede celui-ci sur le cas concerné, et par la mise à jour du
  [contrat d'interface (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/).
- Les **artefacts propriétaires** (source REDCap) restent gitignorés et tirés à
  la demande ; leur éventuel hébergement côté infrastructure ne fait pas migrer
  la sandbox elle-même.
