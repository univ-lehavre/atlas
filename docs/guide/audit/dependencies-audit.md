# Audit des dépendances

> **Dernière mise à jour :** 28 janvier 2026

## Versions standardisées

Versions cibles pour tous les packages du monorepo :

### Stack principale

| Dépendance | Version | Latest |
|------------|---------|:------:|
| Node.js | >=24.0.0 | ✅ |
| pnpm | 10.28.2 | ✅ |
| TypeScript | ^5.9.3 | ✅ |
| ESLint | ^9.39.2 | ✅ |
| Prettier | ^3.8.1 | ✅ |
| Vitest | ^4.0.18 | ✅ |

### SvelteKit

| Dépendance | Version | Latest |
|------------|---------|:------:|
| @sveltejs/kit | ^2.50.1 | ✅ |
| @sveltejs/adapter-node | ^5.5.2 | ✅ |
| @sveltejs/vite-plugin-svelte | ^6.2.4 | ✅ |
| svelte | ^5.48.5 | ✅ |
| svelte-check | ^4.3.5 | ✅ |
| vite | ^7.3.1 | ✅ |

### Appwrite

| Dépendance | Version | Latest |
|------------|---------|:------:|
| node-appwrite | ^21.1.0 | ✅ |
| appwrite (client) | ^21.5.0 | ✅ |

### Effect

| Dépendance | Version | Latest |
|------------|---------|:------:|
| effect | ^3.19.15 | ✅ |
| @effect/cli | ^0.73.1 | ✅ |
| @effect/platform | ^0.94.2 | ✅ |
| @effect/platform-node | ^0.104.1 | ✅ |

### Hono (CRF)

| Dépendance | Version | Latest |
|------------|---------|:------:|
| hono | ^4.11.7 | ✅ |
| hono-openapi | ^1.2.0 | ✅ |
| @hono/node-server | ^1.19.9 | ✅ |

---

## Commandes utiles

```bash
# Voir les dépendances obsolètes
pnpm taze -r

# Mettre à jour toutes les dépendances (écrit dans package.json)
pnpm taze -r -w

# Installer après mise à jour
pnpm install

# Vérifier que tout fonctionne
pnpm lint && pnpm test && pnpm build
```

---

## Vue d'ensemble

Le monorepo Atlas contient **14 packages** gérés avec pnpm workspaces.

### Packages

| Package | Type | Version |
|---------|------|---------|
| `atlas` (root) | Monorepo | - |
| `find-an-expert` | SvelteKit app | 0.5.1 |
| `amarre` | SvelteKit app | 2.0.0 |
| `ecrin` | SvelteKit app | 2.0.0 |
| `@univ-lehavre/crf` | REDCap client/server/CLI | 1.3.0 |
| `@univ-lehavre/atlas-redcap-openapi` | OpenAPI extraction | 1.3.0 |
| `@univ-lehavre/atlas-redcap-core` | Domain logic (Effect) | 1.1.0 |
| `@univ-lehavre/atlas-net` | Network utilities | 0.7.0 |
| `@univ-lehavre/atlas-shared-config` | ESLint/TS/Prettier config | 0.3.0 |
| `@univ-lehavre/atlas-appwrite` | Appwrite utilities | 0.2.0 |
| `@univ-lehavre/atlas-auth` | Auth service | 0.2.0 |
| `@univ-lehavre/atlas-errors` | Error classes | 0.2.0 |
| `@univ-lehavre/atlas-validators` | Validation utilities | 0.2.0 |
| `@univ-lehavre/atlas-logos` | Logo assets | 1.1.0 |
| `redcap-sandbox` | Testing sandbox | 1.0.1 |

---

## Détail par package

### Applications SvelteKit

#### find-an-expert (v0.5.1)

Application d'analyse d'expertise des chercheurs.

**Dependencies :**
- @iconify/svelte, node-appwrite, simple-git, swagger-ui-dist, zod

#### amarre (v2.0.0)

Application SvelteKit avec graphes (Sigma.js).

**Dependencies :**
- node-appwrite, luxon, zod, @sigma/*, graphology-*

#### ecrin (v2.0.0)

Application SvelteKit avec graphes (Sigma.js).

**Dependencies :**
- node-appwrite, appwrite, luxon, lodash, @sigma/*, graphology-*, sigma

---

### Packages REDCap

#### @univ-lehavre/crf (v1.3.0)

Client REDCap, serveur HTTP (Hono), CLI.

**Dependencies :**
- effect, @effect/*, hono, hono-openapi, @clack/prompts, picocolors

#### @univ-lehavre/atlas-redcap-openapi (v1.3.0)

Analyse source REDCap et extraction OpenAPI.

**Dependencies :**
- @clack/prompts, picocolors, yaml

#### @univ-lehavre/atlas-redcap-core (v1.1.0)

Logique domaine REDCap pure (Effect).

**Dependencies :**
- effect

---

### Packages utilitaires

#### @univ-lehavre/atlas-net (v0.7.0)

Utilitaires et CLI diagnostic réseau.

**Dependencies :**
- effect, @effect/*, @clack/prompts, picocolors

#### @univ-lehavre/atlas-shared-config (v0.3.0)

Configuration partagée ESLint, TypeScript, Prettier.

**Dependencies :**
- typescript-eslint, eslint-plugin-*, globals

#### @univ-lehavre/atlas-appwrite (v0.2.0)

Utilitaires Appwrite partagés.

**Dependencies :**
- node-appwrite

#### @univ-lehavre/atlas-auth (v0.2.0)

Service d'authentification partagé.

**Dependencies :**
- node-appwrite

#### @univ-lehavre/atlas-errors (v0.2.0)

Classes d'erreurs partagées.

#### @univ-lehavre/atlas-validators (v0.2.0)

Utilitaires de validation.

---

## Historique

| Date | Action |
|------|--------|
| 28 janvier 2026 | Mise à jour complète via `taze -r -w` |
| 28 janvier 2026 | Alignement node-appwrite 21.1.0 + migration API |
| 28 janvier 2026 | Audit initial |
