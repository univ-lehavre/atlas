# Dependencies audit

> **Last updated:** 28 January 2026

## Next steps

| Priority | Action                                                                           |     Status     |
| :------: | -------------------------------------------------------------------------------- | :------------: |
|    🔴    | Migrate `tsup` → `tsc` for utility packages (appwrite, auth, errors, validators) |     To do      |
|    🟡    | Add tests for `appwrite` and `auth` packages (coverage < 80%)                    |     To do      |
|    🟡    | Evaluate migration to Bun as an alternative runtime                              | To investigate |
|    🟢    | Automate dependency audits via CI (Renovate or Dependabot)                       |    Planned     |
|    🟢    | Document node-appwrite 21.x breaking changes                                     |    ✅ Done     |

---

## Standardized versions

Target versions for all monorepo packages:

### Main stack

| Dependency | Version  | Latest |
| ---------- | -------- | :----: |
| Node.js    | >=24.0.0 |   ✅   |
| pnpm       | 10.28.2  |   ✅   |
| TypeScript | ^5.9.3   |   ✅   |
| ESLint     | ^9.39.2  |   ✅   |
| Prettier   | ^3.8.1   |   ✅   |
| Vitest     | ^4.0.18  |   ✅   |

### SvelteKit

| Dependency                   | Version | Latest |
| ---------------------------- | ------- | :----: |
| @sveltejs/kit                | ^2.50.1 |   ✅   |
| @sveltejs/adapter-node       | ^5.5.2  |   ✅   |
| @sveltejs/vite-plugin-svelte | ^6.2.4  |   ✅   |
| svelte                       | ^5.48.5 |   ✅   |
| svelte-check                 | ^4.3.5  |   ✅   |
| vite                         | ^7.3.1  |   ✅   |

### Appwrite

| Dependency        | Version | Latest |
| ----------------- | ------- | :----: |
| node-appwrite     | ^21.1.0 |   ✅   |
| appwrite (client) | ^21.5.0 |   ✅   |

### Effect

| Dependency            | Version  | Latest |
| --------------------- | -------- | :----: |
| effect                | ^3.19.15 |   ✅   |
| @effect/cli           | ^0.73.1  |   ✅   |
| @effect/platform      | ^0.94.2  |   ✅   |
| @effect/platform-node | ^0.104.1 |   ✅   |

### Hono (CRF)

| Dependency        | Version | Latest |
| ----------------- | ------- | :----: |
| hono              | ^4.11.7 |   ✅   |
| hono-openapi      | ^1.2.0  |   ✅   |
| @hono/node-server | ^1.19.9 |   ✅   |

---

## Useful commands

```bash
# Show outdated dependencies
pnpm taze -r

# Update all dependencies (writes to package.json)
pnpm taze -r -w

# Install after update
pnpm install

# Verify everything works
pnpm lint && pnpm test && pnpm build
```

---

## Overview

The Atlas monorepo contains **14 packages** managed with pnpm workspaces.

### Packages

| Package                              | Type                      | Version |
| ------------------------------------ | ------------------------- | ------- |
| `atlas` (root)                       | Monorepo                  | -       |
| `find-an-expert`                     | SvelteKit app             | 0.5.1   |
| `amarre`                             | SvelteKit app             | 2.0.0   |
| `ecrin`                              | SvelteKit app             | 2.0.0   |
| `@univ-lehavre/crf`                  | REDCap client/server/CLI  | 1.3.0   |
| `@univ-lehavre/atlas-redcap-openapi` | OpenAPI extraction        | 1.3.0   |
| `@univ-lehavre/atlas-redcap-core`    | Domain logic (Effect)     | 1.1.0   |
| `@univ-lehavre/atlas-net`            | Network utilities         | 0.7.0   |
| `@univ-lehavre/atlas-shared-config`  | ESLint/TS/Prettier config | 0.3.0   |
| `@univ-lehavre/atlas-appwrite`       | Appwrite utilities        | 0.2.0   |
| `@univ-lehavre/atlas-auth`           | Auth service              | 0.2.0   |
| `@univ-lehavre/atlas-errors`         | Error classes             | 0.2.0   |
| `@univ-lehavre/atlas-validators`     | Validation utilities      | 0.2.0   |
| `@univ-lehavre/atlas-logos`          | Logo assets               | 1.1.0   |
| `redcap-sandbox`                     | Testing sandbox           | 1.0.1   |

---

## Details by package

### SvelteKit applications

#### find-an-expert (v0.5.1)

Expertise analysis application for researchers.

**Dependencies:**

- @iconify/svelte, node-appwrite, simple-git, swagger-ui-dist, zod

#### amarre (v2.0.0)

SvelteKit application with graphs (Sigma.js).

**Dependencies:**

- node-appwrite, luxon, zod, @sigma/_, graphology-_

#### ecrin (v2.0.0)

SvelteKit application with graphs (Sigma.js).

**Dependencies:**

- node-appwrite, appwrite, luxon, lodash, @sigma/_, graphology-_, sigma

---

### REDCap packages

#### @univ-lehavre/crf (v1.3.0)

REDCap client, HTTP server (Hono), CLI.

**Dependencies:**

- effect, @effect/\*, hono, hono-openapi, @clack/prompts, picocolors

#### @univ-lehavre/atlas-redcap-openapi (v1.3.0)

REDCap source analysis and OpenAPI extraction.

**Dependencies:**

- @clack/prompts, picocolors, yaml

#### @univ-lehavre/atlas-redcap-core (v1.1.0)

Pure REDCap domain logic (Effect).

**Dependencies:**

- effect

---

### Utility packages

#### @univ-lehavre/atlas-net (v0.7.0)

Network utilities and diagnostic CLI.

**Dependencies:**

- effect, @effect/\*, @clack/prompts, picocolors

#### @univ-lehavre/atlas-shared-config (v0.3.0)

Shared ESLint, TypeScript and Prettier configuration.

**Dependencies:**

- typescript-eslint, eslint-plugin-\*, globals

#### @univ-lehavre/atlas-appwrite (v0.2.0)

Shared Appwrite utilities.

**Dependencies:**

- node-appwrite

#### @univ-lehavre/atlas-auth (v0.2.0)

Shared authentication service.

**Dependencies:**

- node-appwrite

#### @univ-lehavre/atlas-errors (v0.2.0)

Shared error classes.

#### @univ-lehavre/atlas-validators (v0.2.0)

Validation utilities.

---

## History

| Date            | Action                                     |
| --------------- | ------------------------------------------ |
| 28 January 2026 | Full update via `taze -r -w`               |
| 28 January 2026 | Align node-appwrite 21.1.0 + API migration |
| 28 January 2026 | Initial audit                              |
