# Contributing to Atlas

Merci de contribuer au projet Atlas ! Ce document explique les conventions et processus de contribution.

## Table des matieres

- [Pre-requis](#pre-requis)
- [Installation](#installation)
- [Workflow de developpement](#workflow-de-developpement)
- [Git Hooks](#git-hooks)
- [Scripts disponibles](#scripts-disponibles)
- [Conventions de commit](#conventions-de-commit)
- [Structure du projet](#structure-du-projet)

## Pre-requis

- Node.js >= 24.0.0 (voir `.nvmrc`)
- pnpm >= 10.x
- Git

```bash
# Installer la bonne version de Node
nvm use

# Installer pnpm si necessaire
corepack enable
```

## Installation

```bash
# Cloner le repository
git clone https://github.com/univ-lehavre/atlas.git
cd atlas

# Installer les dependances
pnpm install
```

Les hooks Git (lefthook) sont installes automatiquement via le script `prepare`.

## Workflow de developpement

### 1. Creer une branche

```bash
git checkout -b feat/ma-nouvelle-fonctionnalite
# ou
git checkout -b fix/correction-bug
```

### 2. Developper

```bash
# Mode watch (tous les packages)
pnpm dev

# Un package specifique
pnpm -F @univ-lehavre/crf dev
```

### 3. Verifier avant de commiter

```bash
# Verification rapide (format + lint)
pnpm check:quick

# Verification complete
pnpm check:full

# Auto-corriger les problemes de format et lint
pnpm fix
```

### 4. Commiter

Le hook `pre-commit` execute automatiquement :

- Prettier (format)
- ESLint (lint)
- TypeScript (typecheck)
- Vitest (test)
- Knip (code inutilise)
- jscpd (code duplique)

### 5. Pousser

Le hook `pre-push` verifie :

- Que vous n'etes pas sur `main` (push direct interdit)
- Que votre branche est synchronisee avec `origin/main`
- L'audit de securite
- Les licences des dependances
- L'integrite du lockfile

### 6. Creer une Pull Request

Poussez votre branche et creez une PR sur GitHub vers `main`.

## Git Hooks

### pre-commit

Executé avant chaque commit. Si un check echoue, le commit est refuse.

| Check     | Description              |
| --------- | ------------------------ |
| format    | Prettier auto-fix        |
| lint      | ESLint auto-fix          |
| typecheck | Verification TypeScript  |
| test      | Tests Vitest             |
| knip      | Detection code inutilise |
| cpd       | Detection code duplique  |

### pre-push

Executé avant chaque push.

| Check          | Description                            |
| -------------- | -------------------------------------- |
| check-branch   | Bloque le push direct sur `main`       |
| check-sync     | Avertit si la branche n'est pas a jour |
| check-audit    | Audit de securite npm                  |
| check-licenses | Verification des licences              |
| check-lockfile | Integrite du lockfile pnpm             |

### commit-msg

Verifie le format du message de commit (Conventional Commits).

### Bypasser temporairement les hooks

En cas d'urgence uniquement :

```bash
# Bypasser pre-commit
git commit --no-verify -m "wip: travail en cours"

# Bypasser pre-push
git push --no-verify
```

> **Attention** : N'abusez pas de `--no-verify`. Les hooks existent pour garantir la qualite du code.

## Scripts disponibles

### Developpement

| Script           | Description              |
| ---------------- | ------------------------ |
| `pnpm dev`       | Mode watch tous packages |
| `pnpm build`     | Build tous les packages  |
| `pnpm test`      | Lancer les tests         |
| `pnpm typecheck` | Verification TypeScript  |

### Qualite

| Script             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `pnpm fix`         | Auto-corriger format + lint                               |
| `pnpm check:quick` | Verification rapide (format + lint)                       |
| `pnpm check`       | Verification standard (format + lint + knip + cpd)        |
| `pnpm check:full`  | Verification complete (+ typecheck + test + audit + size) |

### Ready (verification pre-merge/release)

| Script               | Description                      | Quand l'utiliser        |
| -------------------- | -------------------------------- | ----------------------- |
| `pnpm ready:quick`   | format + lint + typecheck + test | Avant un commit rapide  |
| `pnpm ready`         | check:full + build               | Avant de pousser une PR |
| `pnpm ready:release` | ready + outdated:major           | Avant une release       |

### Audits

| Script                | Description                           |
| --------------------- | ------------------------------------- |
| `pnpm audit`          | Audit securite npm                    |
| `pnpm audit:all`      | Tous les audits (securite + licences) |
| `pnpm license:audit`  | Verification licences autorisees      |
| `pnpm knip`           | Detection code inutilise              |
| `pnpm cpd`            | Detection code duplique               |
| `pnpm size`           | Verification taille des bundles       |
| `pnpm outdated`       | Dependances obsoletes                 |
| `pnpm outdated:major` | Dependances avec majeure en retard    |

### Documentation

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `pnpm docs:dev`   | Documentation en mode dev    |
| `pnpm docs:build` | Build de la documentation    |
| `pnpm docs:api`   | Generation doc API (TypeDoc) |

### Release

| Script           | Description                |
| ---------------- | -------------------------- |
| `pnpm changeset` | Creer un changeset         |
| `pnpm bump`      | Mettre a jour les versions |
| `pnpm release`   | Publier les packages       |

## Conventions de commit

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
type(scope): description

[corps optionnel]

[footer optionnel]
```

### Types autorises

| Type       | Description                           |
| ---------- | ------------------------------------- |
| `feat`     | Nouvelle fonctionnalite               |
| `fix`      | Correction de bug                     |
| `docs`     | Documentation                         |
| `style`    | Formatage (pas de changement de code) |
| `refactor` | Refactoring                           |
| `perf`     | Amelioration performance              |
| `test`     | Ajout/modification de tests           |
| `build`    | Systeme de build                      |
| `ci`       | Configuration CI                      |
| `chore`    | Maintenance                           |
| `revert`   | Revert d'un commit                    |

### Scopes suggeres

| Scope    | Package/App   |
| -------- | ------------- |
| `crf`    | packages/crf  |
| `net`    | packages/net  |
| `ecrin`  | apps/ecrin    |
| `infra`  | infra/        |
| `docs`   | Documentation |
| `deps`   | Dependances   |
| `config` | Configuration |
| `ci`     | CI/CD         |

### Exemples

```bash
feat(crf): add exportRecords method
fix(ecrin): handle auth header parsing
docs: update contributing guide
chore(deps): update effect to v3.20
ci: add size-limit check
```

## Structure du projet

```
atlas/
├── apps/
│   └── ecrin/              # Dashboard SvelteKit
├── packages/
│   ├── crf/                # Client REDCap + server + CLI
│   ├── net/                # Utilitaires reseau
│   ├── eslint-config/      # Config ESLint partagee
│   └── typescript-config/  # Config TypeScript partagee
├── infra/                  # Infrastructure Kubernetes
└── docs/                   # Documentation VitePress
```

## Questions ?

- Ouvrez une [issue](https://github.com/univ-lehavre/atlas/issues) pour signaler un bug
- Consultez le [CLAUDE.md](./CLAUDE.md) pour plus de details techniques
