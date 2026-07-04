---
title: "0092 — Scope-enum dérivé du workspace (exhaustif, non ambigu)"
---

## Contexte

L'[ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/) a imposé les
Conventional Commits avec des **scopes restreints à une liste FERMÉE, maintenue à la main**
(`scope-enum` de `commitlint.config.js`), mise à jour « quand un nouveau paquet est créé ».

Cette liste figée a **dérivé** — exactement la tension que l'ADR 0014 listait comme prix à payer :

- **~10 paquets sans scope** (`atlas-dashboard`, `logos`, `atlas-stats`, `atlas-ui`,
  `shared-config`, les code-locations Python, `test-utils-*`…) : impossible de scoper un commit
  qui les touche.
- **Scopes obsolètes / ambigus** : `ui` (catégorie `ui/*`, pas un paquet), `biblio-cli` ≠ le
  dossier `biblio`.
- **Un scope FOURRE-TOUT `dataops`** absorbant **tous** les changements Python (une majorité des
  commits) sous une seule étiquette — aucun mapping vers un paquet Python précis, donc aucune
  release possible le jour où ces paquets seront publiés.

La génération de changesets depuis les commits scopés ([ADR 0091](/atlas/decisions/0091-release-depot-et-changesets-automatiques/))
EXIGE que **scope → paquet** soit **exhaustif** (tout paquet a un scope) et **non ambigu**
(un scope = exactement un paquet).

## Décision

Le `scope-enum` de `commitlint.config.js` est **DÉRIVÉ du workspace** au chargement, plus une
liste figée : il lit la section `packages:` de `pnpm-workspace.yaml`, résout les dossiers
contenant un `package.json`, et prend leur **basename comme scope** (les basenames sont uniques →
**non ambigu par construction**). S'ajoutent les **scopes MÉTA** légitimes non-paquets
(`ci`, `deps`, `deps-dev`, `config`, `infra`, `plans`).

Conséquences directes :

- **Exhaustif** : tout paquet du workspace a automatiquement un scope valide. Ajouter un paquet
  → son scope existe sans toucher `commitlint.config.js` (fin de la dérive).
- **`dataops` DÉSAGRÉGÉ** : les code-locations Python (`citation-dagster`, `mediawatch-dagster`,
  déclarées explicitement dans les workspaces `pnpm`) ont chacune leur scope — prêtes pour une
  **publication future indépendante**. Le scope fourre-tout `dataops` est retiré.
- `ui` → `atlas-ui`, `biblio` (le dossier réel), etc. : plus de scope ambigu ou fantôme.

Le **cœur** de l'ADR 0014 reste : Conventional Commits obligatoires, scopes contraints, vérifiés
par commitlint en hook `commit-msg` ([ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)),
jamais bypassé. **Seul le MÉCANISME de restriction change** (dérivation vs liste figée).

## Alternatives écartées

- **Corriger la liste figée à la main** : rétablit l'état correct mais NE règle PAS la cause
  (la dérive reviendra au prochain paquet oublié). Un contrôle CI de synchronisation serait
  nécessaire — la dérivation le rend inutile.
- **Dériver via `pnpm -r ls`** (spawn pnpm à chaque commit) : trop lent dans le hook `commit-msg`.
  On lit le filesystem directement (parse minimal de `pnpm-workspace.yaml`, sans dépendance YAML).

## Statut

Accepted. **Supersede partiellement l'[ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/)**
(le mécanisme « liste fermée maintenue à la main » ; le reste d'ADR 0014 tient).

## Conséquences

**Bénéfices.** Zéro dérive de scopes ; `scope → paquet` fiable pour la génération de changesets
([ADR 0091](/atlas/decisions/0091-release-depot-et-changesets-automatiques/)) ; les paquets
Python sont scopables individuellement, prêts pour la publication.

**Prix à payer.** Le `commitlint.config.js` contient du code (lecture filesystem) plutôt qu'une
liste statique — un peu moins « lisible d'un coup d'œil », mais auto-correct. Un dossier de
paquet sans `package.json` (ex. projets dbt `citation-dbt`) n'a pas de scope : un changement dbt
se scope sur le paquet dagster consommateur, ou le dbt devient un paquet le jour venu.

**Garde-fous.** Les scopes méta restent une petite liste explicite dans `commitlint.config.js`
(revue en PR). Le `type-enum` et `subject-case: lower-case` d'ADR 0014 sont conservés tels quels.
