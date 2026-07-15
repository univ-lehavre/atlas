# Conventions du dépôt (pour l'agent)

Règles **non déductibles du code** que tout agent doit respecter. Le _pourquoi_
durable vit dans les ADR (`docs/src/content/docs/decisions/`) ; ce fichier ne fait
que les rappeler de façon opérationnelle.

## Commits

- **Conventional Commits**, sujet **en minuscules** (commitlint
  `subject-case: lower-case` — un sujet avec une majuscule est **rejeté** au
  `commit-msg`).
- **Type** parmi : `feat, fix, docs, style, refactor, perf, test, build, ci,
chore, revert`.
- **Scope** dans une **liste fermée** (`scope-enum`) : un workspace
  (`amarre`, `crf`, `dataops`, `citation`, `ui`…) ou un transverse (`ci`,
  `config`, `deps`, `docs`, `infra`). Un scope hors liste est **rejeté**. Pour la
  documentation et les ADR, le scope est **`docs`** (pas `adr`).
- **Sans `Co-Authored-By`, sans ligne d'email**, et **sans mention d'outil
  d'assistance** (pas de tag « Generated with… ») — y compris dans les corps de
  PR et d'issues.

## Hooks git — jamais bypassés

- `--no-verify`, `LEFTHOOK=0` et tout autre contournement de hook sont
  **interdits**, quel que soit le contexte. Si un hook échoue, **corriger la
  cause**, pas le contourner.
- **pre-commit** (lefthook) : `gitleaks`, `format` (Prettier — **bloquant** :
  un fichier non formaté fait échouer le commit ; lancer
  `pnpm exec prettier --write <fichiers>` avant), `lint` (sur les fichiers
  stagés), `typecheck`, `svelte:check`. `check-branch` refuse tout commit direct
  sur `main`.
- **pre-push** : `check-sync` (rebase sur `origin/main` requis), `check-audit`
  (`audit:security`), `check-licenses`, `check-structure` (`audit:structure`),
  `check-dep-versions`, `check-lockfile`. Reproduire localement avant de pousser.
- Jobs CI non couverts par les hooks à reproduire au besoin : `audit:docs`
  (cohérence doc, compteurs d'ADR — charte 0052 R8), CodeQL, Semgrep, ZAP.

## Branches et merge

- **Jamais** committer/pusher sur `main` (hook `check-branch`). Travailler sur
  une **branche dédiée partant de `main`**, puis **PR**.
- **Merge commit** imposé sur `main` (pas de squash,
  [ADR 0053](docs/src/content/docs/decisions/0053-strategie-merge-commit-main.md)) :
  comme aucun écrasement ne nettoie l'historique, **chaque commit** d'une PR doit
  être propre. commitlint est appliqué par le **hook local `commit-msg`** (ADR
  0014/0015), pas rejoué en CI sur la plage de la PR — soigner/regrouper ses
  commits avant le merge reste donc à la charge de l'auteur (mitigé par la revue
  de code et la branch protection).

## Décisions structurantes — via ADR

- Toute décision structurante = un **ADR** (format Nygard léger) dans
  `docs/src/content/docs/decisions/`, **jamais** en bullets dans un TODO.
- Numéro = suivant libre (vérifier le dernier présent, ne pas présumer).
- Un point de contact avec le dépôt `cluster` change → mettre à jour
  [ADR 0033](docs/src/content/docs/decisions/0033-contrat-interface-cluster.md)
  **dans la même PR** (garde-fou « même PR »).

## Documentation (Astro Starlight)

- Les pages de doc utilisent un **frontmatter YAML requis** :
  `---` / `title: "…"` / `---` — **pas** un titre H1. (Le dépôt `cluster`, lui,
  utilise un moteur différent sans frontmatter : ne pas transposer ses
  conventions ici.)
- **Charte rédactionnelle** ([ADR 0052](docs/src/content/docs/decisions/0052-charte-redactionnelle-documentation.md))
  opposable : R2 = définir tout terme spécialisé (acronyme, outil) à sa
  **première occurrence** ; R5 = justifier un choix technique (pourquoi, contre
  quelle alternative, à quel prix) ; R8 = compteurs (« N ADR ») exacts dans les
  pages catalogue. Vérifiable par `pnpm audit:docs`.
- Les findings d'audit actionnables ouvrent une **issue** (`enhancement` /
  `tech-debt`) ; les décisions, un ADR.

## Neutralité du dépôt (généraliste ouvert)

- Dépôt **généraliste ouvert** ([ADR 0035]) : neutralité de domaine dans les
  **identifiants** (pas de marque type `REDCap`, `OpenAlex`… dans un nom de
  bucket/namespace/secret — convention `citation`,
  [ADR 0022](docs/src/content/docs/decisions/0022-naming-convention/)). Nommer
  une brique réellement intégrée reste OK **en description**.
- **RGPD** : le code **permet**, il ne décide pas à la place du déployeur ;
  capacité technique, jamais garantie de conformité (responsable = établissement
  déployeur).

## Outillage

- **pnpm** pinné (`packageManager: pnpm@11.13.0`), **Node ≥ 24** (`.nvmrc` figé
  au patch). Monorepo Turbo, ≈52 workspaces en 8 catégories enforcées par
  `pnpm audit:structure`.
- **Scripts d'installation** : toute dépendance qui exécute un script d'install doit
  être tranchée dans la map **`allowBuilds`** de `pnpm-workspace.yaml` (pnpm ≥ 11 ;
  remplace `onlyBuiltDependencies`). Non listée = **refusée**, et l'install **échoue**
  (`strictDepBuilds`). Un `pnpm install` qui réclame une approbation n'est pas un bug :
  arbitrer (`true`/`false` + la raison), jamais désactiver la garde.
- **`dataops/`** est en **Python natif** (uv/ruff/pytest), **hors** du graphe
  pnpm ([ADR 0055](docs/src/content/docs/decisions/0055-categorie-dataops-python/)) —
  les outils Node (knip, audit:structure) l'ignorent.
- Validation rapide : `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm audit:docs`, `pnpm audit:structure`.
