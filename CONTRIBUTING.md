# Contributing to Atlas

Thank you for contributing to the Atlas project! This document explains the conventions and contribution processes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Workflow](#development-workflow)
- [Git Hooks](#git-hooks)
- [Available Scripts](#available-scripts)
- [Commit Conventions](#commit-conventions)
- [Project Structure](#project-structure)

## Prerequisites

- Node.js >= 24.0.0 (see `.nvmrc`)
- pnpm >= 10.x
- Git

```bash
# Install the correct Node version
nvm use

# Install pnpm if necessary
corepack enable
```

## Installation

```bash
# Clone the repository
git clone https://github.com/univ-lehavre/atlas.git
cd atlas

# Install dependencies
pnpm install
```

Git hooks (lefthook) are automatically installed via the `prepare` script.

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feat/my-new-feature
# or
git checkout -b fix/bug-fix
```

### 2. Develop

```bash
# Watch mode (all packages)
pnpm dev

# A specific package
pnpm -F @univ-lehavre/crf dev
```

### 3. Check Before Committing

```bash
# Quick check (format + lint)
pnpm check:quick

# Full check
pnpm check:full

# Auto-fix format and lint issues
pnpm fix
```

### 4. Commit

The `pre-commit` hook automatically runs:

- Prettier (format)
- ESLint (lint)
- TypeScript (typecheck)
- Vitest (test)
- Knip (unused code)
- jscpd (duplicate code)

### 5. Push

The `pre-push` hook checks:

- That you are not on `main` (direct push is forbidden)
- That your branch is synchronized with `origin/main`
- Security audit
- Dependency licenses
- Lockfile integrity

### 6. Create a Pull Request

Push your branch and create a PR on GitHub targeting `main`.

## Git Hooks

### pre-commit

Executed before each commit. If a check fails, the commit is rejected.

| Check     | Description               |
| --------- | ------------------------- |
| format    | Prettier auto-fix         |
| lint      | ESLint auto-fix           |
| typecheck | TypeScript verification   |
| test      | Vitest tests              |
| knip      | Unused code detection     |
| cpd       | Duplicate code detection  |

### pre-push

Executed before each push.

| Check          | Description                              |
| -------------- | ---------------------------------------- |
| check-branch   | Blocks direct push to `main`             |
| check-sync     | Warns if branch is not up to date        |
| check-audit    | npm security audit                       |
| check-licenses | License verification                     |
| check-lockfile | pnpm lockfile integrity                  |

### commit-msg

Verifies commit message format (Conventional Commits).

### Temporarily Bypassing Hooks

Only in emergencies:

```bash
# Bypass pre-commit
git commit --no-verify -m "wip: work in progress"

# Bypass pre-push
git push --no-verify
```

> **Warning**: Do not abuse `--no-verify`. Hooks exist to ensure code quality.

## Available Scripts

### Development

| Script           | Description                |
| ---------------- | -------------------------- |
| `pnpm dev`       | Watch mode for all packages |
| `pnpm build`     | Build all packages         |
| `pnpm test`      | Run tests                  |
| `pnpm typecheck` | TypeScript verification    |

### Quality

| Script             | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm fix`         | Auto-fix format + lint                               |
| `pnpm check:quick` | Quick check (format + lint)                          |
| `pnpm check`       | Standard check (format + lint + knip + cpd)          |
| `pnpm check:full`  | Full check (+ typecheck + test + audit + size)       |

### Ready (Pre-merge/release Verification)

| Script               | Description                        | When to Use             |
| -------------------- | ---------------------------------- | ----------------------- |
| `pnpm ready:quick`   | format + lint + typecheck + test   | Before a quick commit   |
| `pnpm ready`         | check:full + build                 | Before pushing a PR     |
| `pnpm ready:release` | ready + outdated:major             | Before a release        |

### Audits

| Script                | Description                          |
| --------------------- | ------------------------------------ |
| `pnpm audit`          | npm security audit                   |
| `pnpm audit:all`      | All audits (security + licenses)     |
| `pnpm license:audit`  | Allowed licenses verification        |
| `pnpm knip`           | Unused code detection                |
| `pnpm cpd`            | Duplicate code detection             |
| `pnpm size`           | Bundle size verification             |
| `pnpm outdated`       | Outdated dependencies                |
| `pnpm outdated:major` | Dependencies with outdated major     |

### Documentation

| Script            | Description                    |
| ----------------- | ------------------------------ |
| `pnpm docs:dev`   | Documentation in dev mode      |
| `pnpm docs:build` | Build documentation            |
| `pnpm docs:api`   | Generate API docs (TypeDoc)    |

### Release

| Script           | Description            |
| ---------------- | ---------------------- |
| `pnpm changeset` | Create a changeset     |
| `pnpm bump`      | Update versions        |
| `pnpm release`   | Publish packages       |

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

### Allowed Types

| Type       | Description                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation                        |
| `style`    | Formatting (no code change)          |
| `refactor` | Refactoring                          |
| `perf`     | Performance improvement              |
| `test`     | Add/modify tests                     |
| `build`    | Build system                         |
| `ci`       | CI configuration                     |
| `chore`    | Maintenance                          |
| `revert`   | Revert a commit                      |

### Suggested Scopes

| Scope    | Package/App   |
| -------- | ------------- |
| `crf`    | packages/crf  |
| `net`    | packages/net  |
| `docs`   | Documentation |
| `deps`   | Dependencies  |
| `config` | Configuration |
| `ci`     | CI/CD         |

### Examples

```bash
feat(crf): add exportRecords method
docs: update contributing guide
chore(deps): update effect to v3.20
ci: add size-limit check
```

## Project Structure

```
atlas/
├── packages/
│   ├── crf/                # REDCap client + server + CLI
│   ├── net/                # Network utilities
│   ├── eslint-config/      # Shared ESLint config
│   └── typescript-config/  # Shared TypeScript config
└── docs/                   # VitePress documentation
```

## Questions?

- Open an [issue](https://github.com/univ-lehavre/atlas/issues) to report a bug
- Check [CLAUDE.md](./CLAUDE.md) for more technical details
