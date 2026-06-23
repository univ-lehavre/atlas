---
title: "0066 — Cache Turbo des checks dataops : package.json minimal et entrée dans le workspace"
---

## Contexte

L'[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) a logé le code DataOps
(code-locations Dagster) dans `dataops/`, **hors du graphe pnpm** : pas de
`package.json`, pas de déclaration dans `pnpm-workspace.yaml`. Les checks Python
(`pnpm dataops:check` : ruff + pytest + validation des manifestes) y sont branchés par
des scripts pnpm qui **délèguent à `uv`**, agrégés et appelés au hook pre-push, en CI
et dans `ci:checks`.

Conséquence non anticipée : ces checks tournent **en dehors du cache Turbo**. À chaque
`git push` touchant `dataops/**`, le hook pre-push rejoue **l'intégralité** des checks
(~1 min 30 : ruff + pytest des deux code-locations `citation` **et** `mediawatch` +
`validate.sh`), même si **un seul** sous-projet a changé — voire si le contenu est
**identique** à un run déjà validé. Le code Node, lui, bénéficie du cache Turbo par
contenu ([ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)) :
un paquet inchangé tombe en `FULL TURBO` (rejoue « success » en millisecondes). Les
checks dataops n'avaient pas cet acquis.

La cause racine est exactement le point d'architecture posé par 0055 : **sans
`package.json` ni entrée workspace, Turbo ne voit pas ces tâches** et ne peut pas les
cacher.

## Décision

> **Chaque code-location dataops (`citation-dagster`, `mediawatch-dagster`) reçoit un
> `package.json` privé minimal et entre dans le workspace pnpm, dans le seul but
> d'être prise en charge par le cache Turbo. Trois tâches Turbo dédiées — `lint:py`,
> `test:py`, `manifests:py` — délèguent à `uv`/`bash` et sont mises en cache par
> contenu. Le code reste piloté par `uv`/`ruff`/`pytest` ; aucun outil Node ne le
> traite.**

### Un `package.json` privé, technique, qui ne fait que pointer vers `uv`

Le `package.json` de chaque code-location ne déclare **aucune dépendance npm** : il
porte un `name` (préfixe `atlas-`, [ADR 0022](/atlas/decisions/0022-naming-convention/)),
`private: true` ([ADR 0011](/atlas/decisions/0011-paquets-internes-private/)) et
**trois scripts** qui exécutent l'outillage Python existant :

```json
"scripts": {
  "lint:py": "uv run ruff check . && uv run ruff format --check .",
  "test:py": "uv run pytest",
  "manifests:py": "bash deploy/validate.sh"
}
```

Ce n'est **pas** un faux paquet Node : il ne s'installe rien, ne build rien, n'expose
aucun export JS. C'est une **façade de tâches** pour que Turbo calcule un hash d'entrée
et cache le résultat (code de sortie + logs).

### Tâches Turbo dédiées, noms distincts, sans `outputs`

`turbo.json` gagne `lint:py`, `test:py`, `manifests:py`. Noms **volontairement
distincts** des tâches Node (`lint`, `test`…) pour ne pas hériter de leurs `dependsOn:
["^build"]` ni de leurs `inputs` TypeScript. Chaque tâche déclare ses `inputs`
explicites (`src/**`, `tests/**`, `pyproject.toml`, `uv.lock`, `.python-version` ;
`deploy/**` pour les manifestes) et **aucun `outputs`** : Turbo cache alors le seul
résultat pass/fail, suffisant pour des checks. Les **fixtures** (`fixtures/**`, à la
racine du dépôt, lues par les tests hermétiques) entrent en `globalDependencies` :
un GOLDEN modifié réinvalide correctement les tests.

Les scripts pnpm racine (`lint:python`, `test:python`, `dataops:manifests`,
`dataops:check`) sont recâblés sur `turbo run … --filter='./dataops/*'` : noms publics
**inchangés** (hooks et CI ne bougent pas), granularité par sous-projet et par
dimension (modifier `mediawatch` ne rejoue pas `citation` ; modifier un test ne rejoue
pas le lint).

### Ce qui change pour les outils Node, et ce qu'on neutralise

Entrer dans le workspace expose `dataops/` aux outils Node. On le borne :

- **knip** découvrirait du Python comme des modules npm manquants → les deux
  workspaces sont placés dans `ignoreWorkspaces` de `knip.json`.
- **prettier** ignore déjà `dataops/` (`.prettierignore`, ruff tient le format Python).
- **`audit:structure`** et **`audit:dep-versions`** ne listent pas `dataops` dans leurs
  `ROOTS` : ils ne voient pas ces workspaces — inchangé, et acceptable (leurs règles
  sont Node-spécifiques, comme l'acte déjà 0055).
- Le **lockfile** est régénéré (deux workspaces sans dépendances npm → diff minimal).

## Statut

Accepted. **Amende** l'[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) sur
le seul point « **hors du graphe pnpm, aucun `package.json`** » : les code-locations
dataops reçoivent désormais un `package.json` privé et entrent dans le workspace. Tout
le reste de 0055 demeure : Python natif (uv/ruff/pytest), frontière par le contrat
Parquet, **exigences de qualité identiques et enforcées** (la couverture
`--cov-fail-under` reste dans les `pyproject.toml`, donc effective). S'inscrit dans la
ligne de l'[ADR 0061](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/)
(cache de contenu).

## Conséquences

**Bénéfices.** Les checks dataops bénéficient du cache Turbo : `FULL TURBO` au pre-push
quand rien n'a changé, et **cache partagé inter-runs en CI** (clé de contenu) — un
contenu déjà validé n'est pas re-testé. Granularité fine : skip par sous-projet et par
dimension. Le pre-push redevient quasi instantané sur les pushes qui ne touchent pas
(ou peu) `dataops/`.

**Prix à payer.** `dataops/` entre dans le graphe pnpm : deux `package.json`
techniques à maintenir, une exclusion knip explicite, un lockfile qui référence ces
workspaces. C'est un **assouplissement assumé** du principe « aucun package.json »
de 0055 — au bénéfice d'un acquis (le cache) que ce principe interdisait. Le
`package.json` pourrait laisser croire à un paquet Node : le `description` et le présent
ADR le démentent explicitement.

**Garde-fous.**

- **Parité fonctionnelle** : `pnpm dataops:check` exécute toujours ruff + pytest
  (couverture à seuil, config dans `pyproject.toml`) + `validate.sh` des deux
  code-locations. Vérifié par exécution (mêmes 117 + 88 tests, mêmes seuils).
- **Pas de faux paquet Node** : `private: true`, zéro dépendance npm, exclu de knip,
  ignoré d'`audit:structure`. Aucun outil Node ne traite le Python.
- **Cache correct** : les `inputs` Turbo capturent le code, les tests, le lockfile et
  les fixtures ; un changement réel invalide, un contenu identique tombe en cache
  (vérifié : invalidation granulaire mediawatch ≠ citation).
- L'amendement reste **borné** : il ne rouvre pas la question du langage (Python reste
  cantonné à `dataops/`, 0055) ni la frontière Parquet.
