# Audit des dépendances

> **Dernière mise à jour :** Janvier 2026

Cet audit recense l'ensemble des dépendances du monorepo Atlas, identifie les incohérences de versions et propose une roadmap de mise à jour.

## Vue d'ensemble

Le monorepo Atlas contient **14 packages** gérés avec pnpm workspaces.

### Packages

| Package | Type | Version |
|---------|------|---------|
| `atlas` (root) | Monorepo | - |
| `find-an-expert` | SvelteKit app | 0.5.1 |
| `@univ-lehavre/crf` | REDCap client/server/CLI | 1.3.0 |
| `@univ-lehavre/atlas-redcap-openapi` | OpenAPI extraction | 1.3.0 |
| `@univ-lehavre/atlas-net` | Network utilities | 0.7.0 |
| `@univ-lehavre/atlas-redcap-core` | Domain logic (Effect) | 1.1.0 |
| `@univ-lehavre/atlas-shared-config` | ESLint/TS/Prettier config | 0.3.0 |
| `@univ-lehavre/atlas-appwrite` | Appwrite utilities | 0.2.0 |
| `@univ-lehavre/atlas-errors` | Error classes | 0.2.0 |
| `@univ-lehavre/atlas-auth` | Auth service | 0.2.0 |
| `@univ-lehavre/atlas-validators` | Validation utilities | 0.2.0 |
| `@univ-lehavre/atlas-logos` | Logo assets | 1.1.0 |
| `amarre` | SvelteKit app | 2.0.0 |
| `ecrin` | SvelteKit app | 2.0.0 |
| `redcap-sandbox` | Testing sandbox | 1.0.1 |

---

## Audit par package

### Root (monorepo)

**Node requirement :** `>=24.0.0`
**Package manager :** `pnpm@10.28.1`

#### DevDependencies

| Package | Version |
|---------|---------|
| @changesets/changelog-github | ^0.5.2 |
| @changesets/cli | ^2.29.8 |
| @commitlint/cli | ^20.3.1 |
| @commitlint/config-conventional | ^20.3.1 |
| @modyfi/vite-plugin-yaml | ^1.1.1 |
| @size-limit/file | ^12.0.0 |
| @vitest/coverage-v8 | ^4.0.18 |
| jscpd | ^4.0.7 |
| knip | ^5.82.1 |
| lefthook | ^2.0.15 |
| license-checker | ^25.0.1 |
| size-limit | ^12.0.0 |
| taze | ^19.9.2 |
| tsx | ^4.21.0 |
| turbo | ^2.7.5 |
| typedoc | ^0.28.16 |
| typedoc-plugin-markdown | ^4.9.0 |
| vitepress | ^1.6.4 |
| vitepress-openapi | ^0.1.13 |
| vitest | ^4.0.18 |

---

### packages/find-an-expert

**Version :** 0.5.1
**Type :** Application SvelteKit (analyse expertise chercheurs)

#### Dependencies

| Package | Version |
|---------|---------|
| @iconify/svelte | ^5.2.1 |
| node-appwrite | ^21.1.0 |
| simple-git | ^3.30.0 |
| swagger-ui-dist | ^5.31.0 |
| zod | ^4.3.5 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @sveltejs/adapter-node | ^5.5.1 |
| @sveltejs/kit | ^2.49.5 |
| @sveltejs/vite-plugin-svelte | ^6.2.1 |
| @tailwindcss/vite | ^4.1.18 |
| @types/node | ^24.10.4 |
| @vitest/coverage-v8 | ^4.0.17 |
| eslint | ^9.39.1 |
| jsdom | ^27.4.0 |
| knip | ^5.81.0 |
| prettier | ^3.7.4 |
| prettier-plugin-svelte | ^3.4.0 |
| svelte | ^5.46.4 |
| svelte-check | ^4.3.4 |
| tailwindcss | ^4.1.18 |
| typescript | ^5.9.3 |
| vite | ^7.2.6 |
| vitest | ^4.0.15 |
| vitest-axe | ^0.1.0 |

---

### packages/crf

**Version :** 1.3.0
**Type :** Client REDCap, serveur HTTP (Hono), CLI

#### Dependencies

| Package | Version |
|---------|---------|
| @clack/prompts | ^0.11.0 |
| @effect/cli | ^0.73.1 |
| @effect/platform | ^0.94.2 |
| @effect/platform-node | ^0.104.1 |
| @hono/node-server | ^1.19.9 |
| @hono/standard-validator | ^0.2.2 |
| effect | ^3.19.15 |
| hono | ^4.11.5 |
| hono-openapi | ^1.1.2 |
| hono-rate-limiter | ^0.5.3 |
| picocolors | ^1.1.1 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @scalar/hono-api-reference | ^0.9.35 |
| @stoplight/prism-cli | ^5.14.2 |
| @types/node | ^25.0.10 |
| eslint | ^9.39.2 |
| openapi-typescript | ^7.10.1 |
| prettier | ^3.8.0 |
| tsx | ^4.21.0 |
| typescript | ^5.9.3 |
| vitest | ^4.0.18 |

---

### packages/redcap-openapi

**Version :** 1.3.0
**Type :** Analyse source REDCap, extraction OpenAPI

#### Dependencies

| Package | Version |
|---------|---------|
| @clack/prompts | ^0.10.0 |
| picocolors | ^1.1.1 |
| yaml | ^2.8.2 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @types/node | ^25.0.10 |
| eslint | ^9.39.2 |
| prettier | ^3.8.1 |
| tsx | ^4.21.0 |
| typescript | ^5.9.3 |

---

### packages/net

**Version :** 0.7.0
**Type :** Utilitaires et CLI diagnostic réseau

#### Dependencies

| Package | Version |
|---------|---------|
| @clack/prompts | ^0.11.0 |
| @effect/cli | ^0.73.1 |
| @effect/platform | ^0.94.2 |
| @effect/platform-node | ^0.104.1 |
| effect | ^3.19.15 |
| picocolors | ^1.1.1 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @types/node | ^25.0.10 |
| eslint | ^9.39.2 |
| prettier | ^3.8.1 |
| typescript | ^5.9.3 |
| vitest | ^4.0.18 |

---

### packages/redcap-core

**Version :** 1.1.0
**Type :** Logique domaine REDCap pure (Effect)

#### Dependencies

| Package | Version |
|---------|---------|
| effect | ^3.19.15 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @types/node | ^24.10.4 |
| eslint | ^9.39.2 |
| prettier | ^3.7.4 |
| typescript | ^5.9.3 |
| vitest | ^4.0.18 |

---

### packages/shared-config

**Version :** 0.3.0
**Type :** Configuration partagée (ESLint, TypeScript, Prettier)

#### Dependencies (ESLint plugins)

| Package | Version |
|---------|---------|
| @eslint-community/eslint-plugin-eslint-comments | ^4.5.0 |
| @eslint/js | ^9.39.2 |
| @vitest/eslint-plugin | ^1.3.3 |
| eslint-config-prettier | ^10.1.8 |
| eslint-plugin-barrel-files | ^2.1.0 |
| eslint-plugin-functional | ^9.0.1 |
| eslint-plugin-import-x | ^4.15.0 |
| eslint-plugin-n | ^17.23.2 |
| eslint-plugin-no-secrets | ^1.1.2 |
| eslint-plugin-regexp | ^2.9.0 |
| eslint-plugin-security | ^3.0.1 |
| eslint-plugin-svelte | ^3.9.1 |
| eslint-plugin-turbo | ^2.7.5 |
| eslint-plugin-unicorn | ^59.0.1 |
| globals | ^16.2.0 |
| typescript-eslint | ^8.53.1 |

#### PeerDependencies

| Package | Version |
|---------|---------|
| eslint | ^9.0.0 |
| prettier | ^3.0.0 |
| typescript | ^5.0.0 |

---

### packages/appwrite

**Version :** 0.2.0
**Type :** Utilitaires Appwrite partagés

#### Dependencies

| Package | Version |
|---------|---------|
| node-appwrite | ^17.0.1 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @sveltejs/kit | ^2.20.8 |
| eslint | ^9.27.0 |
| prettier | ^3.5.3 |
| tsup | ^8.5.0 |
| typescript | ~5.8.3 |
| vitest | ^4.0.18 |

---

### packages/errors

**Version :** 0.2.0
**Type :** Classes d'erreurs partagées

#### DevDependencies

| Package | Version |
|---------|---------|
| eslint | ^9.27.0 |
| prettier | ^3.5.3 |
| tsup | ^8.5.0 |
| typescript | ~5.8.3 |
| vitest | ^4.0.18 |

---

### packages/auth

**Version :** 0.2.0
**Type :** Service d'authentification partagé

#### Dependencies

| Package | Version |
|---------|---------|
| node-appwrite | ^17.0.1 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @sveltejs/kit | ^2.20.8 |
| eslint | ^9.27.0 |
| prettier | ^3.5.3 |
| tsup | ^8.5.0 |
| typescript | ~5.8.3 |
| vitest | ^4.0.18 |

---

### packages/validators

**Version :** 0.2.0
**Type :** Utilitaires de validation

#### DevDependencies

| Package | Version |
|---------|---------|
| eslint | ^9.27.0 |
| prettier | ^3.5.3 |
| tsup | ^8.5.0 |
| typescript | ~5.8.3 |
| vitest | ^4.0.18 |

---

### packages/amarre

**Version :** 2.0.0
**Type :** Application SvelteKit

#### Dependencies

| Package | Version |
|---------|---------|
| @sigma/node-border | ^3.0.0 |
| @sigma/node-image | ^3.0.0 |
| appwrite | ^21.4.0 |
| graphology | ^0.26.0 |
| graphology-layout | ^0.6.1 |
| graphology-layout-force | ^0.2.4 |
| graphology-layout-forceatlas2 | ^0.10.1 |
| lodash | ^4.17.21 |
| luxon | ^3.7.2 |
| node-appwrite | ^20.3.0 |
| openapi-response-validator | ^12.1.3 |
| sigma | ^3.0.2 |
| uuid | ^13.0.0 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @asteasolutions/zod-to-openapi | ^8.2.0 |
| @sveltejs/adapter-node | ^5.4.0 |
| @sveltejs/kit | ^2.49.2 |
| @sveltejs/vite-plugin-svelte | ^6.2.1 |
| @types/luxon | ^3.7.1 |
| @types/node | ^24.10.4 |
| eslint | ^9.39.2 |
| knip | ^5.73.4 |
| prettier | ^3.7.4 |
| prettier-plugin-svelte | ^3.4.1 |
| svelte | ^5.46.0 |
| svelte-check | ^4.3.4 |
| tsx | ^4.21.0 |
| typescript | ^5.9.3 |
| vite | ^7.3.0 |
| vitest | ^4.0.15 |

---

### packages/ecrin

**Version :** 2.0.0
**Type :** Application SvelteKit

#### Dependencies

| Package | Version |
|---------|---------|
| @sigma/node-border | ^3.0.0 |
| @sigma/node-image | ^3.0.0 |
| appwrite | ^21.4.0 |
| graphology | ^0.26.0 |
| graphology-layout | ^0.6.1 |
| graphology-layout-force | ^0.2.4 |
| graphology-layout-forceatlas2 | ^0.10.1 |
| lodash | ^4.17.21 |
| luxon | ^3.7.2 |
| node-appwrite | ^20.3.0 |
| openapi-response-validator | ^12.1.3 |
| sigma | ^3.0.2 |
| uuid | ^13.0.0 |

#### DevDependencies

| Package | Version |
|---------|---------|
| @sveltejs/adapter-node | ^5.4.0 |
| @sveltejs/kit | ^2.48.5 |
| @sveltejs/vite-plugin-svelte | ^6.2.1 |
| @types/lodash | ^4.17.20 |
| @types/luxon | ^3.7.1 |
| @types/node | ^24.10.1 |
| eslint | ^9.39.2 |
| prettier | ^3.7.4 |
| prettier-plugin-svelte | ^3.4.1 |
| svelte | ^5.46.4 |
| svelte-check | ^4.3.4 |
| typescript | ^5.9.3 |
| vite | ^7.3.0 |
| vitest | ^4.0.18 |

---

### packages/redcap-sandbox

**Version :** 1.0.1
**Type :** Sandbox de test REDCap

#### DevDependencies

| Package | Version |
|---------|---------|
| @types/node | ^25.0.10 |
| eslint | ^9.39.2 |
| prettier | ^3.8.1 |
| tsx | ^4.21.0 |
| typescript | ^5.9.3 |
| vitest | ^4.0.18 |

---

## Incohérences identifiées

### Critiques

| Dépendance | Versions trouvées | Packages concernés |
|------------|-------------------|-------------------|
| `node-appwrite` | 17.0.1, 20.3.0, 21.1.0 | appwrite, auth, amarre, ecrin, find-an-expert |

### Moyennes

| Dépendance | Versions trouvées | Packages concernés |
|------------|-------------------|-------------------|
| `@sveltejs/kit` | 2.20.8, 2.48.5, 2.49.2, 2.49.5 | appwrite, auth, ecrin, amarre, find-an-expert |
| `typescript` | ~5.8.3, ^5.9.3 | shared-config vs autres |
| `@clack/prompts` | 0.10.0, 0.11.0 | redcap-openapi vs crf/net |

### Faibles

| Dépendance | Versions trouvées | Packages concernés |
|------------|-------------------|-------------------|
| `eslint` | 9.27.0, 9.39.x | appwrite/auth/errors/validators vs autres |
| `prettier` | 3.5.3, 3.7.4, 3.8.x | divers |
| `@types/node` | 24.x, 25.x | divers |

---

## Roadmap de mise à jour

### Phase 1 : Alignement critique

**Objectif :** Aligner les dépendances critiques pour éviter les conflits de types et de comportement.

#### 1.1 node-appwrite

Aligner tous les packages sur la version **21.1.0** :

| Package | Version actuelle | Action |
|---------|------------------|--------|
| `packages/appwrite` | 17.0.1 | Mettre à jour vers 21.1.0 |
| `packages/auth` | 17.0.1 | Mettre à jour vers 21.1.0 |
| `packages/amarre` | 20.3.0 | Mettre à jour vers 21.1.0 |
| `packages/ecrin` | 20.3.0 | Mettre à jour vers 21.1.0 |

::: warning Breaking changes potentiels
Vérifier les [release notes](https://github.com/appwrite/sdk-for-node) pour les versions 18.x, 19.x, 20.x et 21.x.
:::

---

### Phase 2 : Framework SvelteKit/Svelte

**Objectif :** Harmoniser les versions du framework frontend.

| Dépendance | Version cible | Action |
|------------|---------------|--------|
| `@sveltejs/kit` | ^2.49.5 | Aligner tous les packages |
| `svelte` | ^5.46.4 | Aligner tous les packages |
| `vite` | ^7.3.0 | Aligner tous les packages |
| `@sveltejs/adapter-node` | ^5.5.1 | Aligner tous les packages |

---

### Phase 3 : Outillage (Tooling)

**Objectif :** Standardiser les outils de développement.

| Dépendance | Version cible | Packages à mettre à jour |
|------------|---------------|-------------------------|
| `typescript` | ^5.9.3 | shared-config, appwrite, auth, errors, validators |
| `eslint` | ^9.39.2 | appwrite, auth, errors, validators |
| `prettier` | ^3.8.1 | tous |
| `@types/node` | ^25.0.10 | tous |
| `@clack/prompts` | ^0.11.0 | redcap-openapi |

---

### Phase 4 : Mises à jour majeures (planification)

Pour chaque mise à jour majeure planifiée :

1. **Lire les release notes** et identifier les breaking changes
2. **Créer une branche dédiée** pour la migration
3. **Mettre à jour un package pilote** et valider
4. **Propager** aux autres packages
5. **Tester** exhaustivement (`pnpm ready`)

---

## Commandes utiles

```bash
# Voir les dépendances obsolètes
pnpm outdated

# Mettre à jour interactivement (taze est déjà installé)
pnpm taze

# Mettre à jour une dépendance spécifique dans tous les packages
pnpm update node-appwrite --recursive

# Vérifier après mise à jour
pnpm install
pnpm ready
```

---

## Historique

| Date | Action |
|------|--------|
| Janvier 2026 | Audit initial |
