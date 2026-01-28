# CLAUDE.md - Instructions pour Claude Code

Ce fichier fournit le contexte necessaire pour travailler efficacement sur ce projet.

## Vue d'ensemble du projet

**Atlas** est un monorepo TypeScript pour la recherche, incluant des outils REDCap (Effect) et une application d'analyse d'expertise.

### Architecture

```
atlas/
├── packages/
│   ├── find-an-expert/     # App SvelteKit - analyse expertise chercheurs
│   ├── crf/                # Case Report Form (REDCap client, server, CLI)
│   ├── redcap-openapi/     # Analyse source REDCap et extraction OpenAPI
│   ├── net/                # Utilitaires et CLI diagnostic reseau
│   └── shared-config/      # Config TypeScript et ESLint partagee
└── docs/                   # Documentation VitePress
```

### Stack technique

| Domaine         | Technologies                              |
| --------------- | ----------------------------------------- |
| Runtime         | Node.js 24+, TypeScript 5.x               |
| Framework       | Effect, SvelteKit 2, Svelte 5             |
| Package manager | pnpm (workspaces)                         |
| Build           | Vite, tsup                                |
| Test            | Vitest                                    |
| Lint            | ESLint, Prettier (@univ-lehavre/shared-config) |

## Commandes essentielles

```bash
# Installation
pnpm install

# Developpement
pnpm dev                       # Tous les packages en watch
pnpm -F find-an-expert dev     # Find an Expert (SvelteKit)
pnpm -F @univ-lehavre/crf dev  # CRF

# Build
pnpm build                     # Tous les packages

# Tests
pnpm test                      # Tous les tests

# Lint
pnpm lint                      # ESLint
pnpm format                    # Prettier

# Verifications pre-commit
pnpm ready                     # lint + test + build
```

## Conventions de code

### TypeScript / Effect

- Utiliser Effect pour toute logique asynchrone/erreurs
- Typage strict (`strict: true`)
- Pas de `any`, preferer `unknown` si necessaire
- Documenter avec TSDoc

````typescript
/**
 * Exporte les records depuis REDCap.
 *
 * @param options - Options d'export
 * @returns Effect contenant les records ou une erreur REDCap
 *
 * @example
 * ```typescript
 * const records = yield* client.exportRecords({ fields: ['record_id'] });
 * ```
 */
export const exportRecords = (options: ExportOptions): Effect.Effect<Record[], RedcapError> => {
  // ...
};
````

### Commits

Format conventionnel :

```
type(scope): description

- feat: nouvelle fonctionnalite
- fix: correction de bug
- docs: documentation
- refactor: refactoring
- test: ajout/modification tests
- chore: maintenance
```

Exemples :

```
feat(crf): add exportRecords method
docs: update contributing guide
```

## Structure des packages

### packages/find-an-expert

Application SvelteKit pour decouvrir et analyser l'expertise des chercheurs via OpenAlex et GitHub.

| Stack     | Technologies                        |
| --------- | ----------------------------------- |
| Frontend  | SvelteKit 2, Svelte 5, Tailwind CSS |
| Backend   | Appwrite                            |
| APIs      | OpenAlex, GitHub                    |

```
packages/find-an-expert/
├── src/
│   ├── lib/
│   │   ├── components/     # Composants Svelte
│   │   ├── server/         # Services (auth, openalex, github, git-stats)
│   │   ├── stores/         # Runes Svelte ($state)
│   │   └── ui/             # Composants UI reutilisables
│   └── routes/
│       ├── api/v1/         # API REST (auth, health, repositories, institutions)
│       ├── dashboard/      # Tableau de bord (protege)
│       └── login/          # Authentification
├── static/                 # Assets (logos partenaires)
└── docs/ -> docs/guide/find-an-expert/
```

Scripts :

- `pnpm -F find-an-expert dev` - Developpement
- `pnpm -F find-an-expert build` - Build production
- `pnpm -F find-an-expert test` - Tests Vitest

Conventions Svelte 5 :

- Utiliser les runes (`$state`, `$derived`, `$effect`, `$props`)
- Pas de stores Svelte 4
- Ne jamais utiliser `fetch('/api/...')` cote serveur, utiliser les services `$lib/server/*`

### packages/crf (Case Report Form)

Package unifie contenant le client REDCap, le serveur HTTP et les CLI.
Architecture OpenAPI-first avec types generes depuis `specs/redcap.yaml`.

```
packages/crf/
├── specs/
│   └── redcap.yaml              # OpenAPI 3.1.0 spec REDCap
├── src/
│   ├── redcap/                  # Client Effect pour REDCap
│   │   ├── generated/types.ts   # Types generes (openapi-typescript)
│   │   ├── brands.ts            # Branded types (RecordId, etc.)
│   │   ├── client.ts            # Client principal
│   │   ├── errors.ts            # Erreurs typees
│   │   └── index.ts             # Exports
│   ├── server/                  # Microservice HTTP (Hono)
│   │   ├── routes/              # health, project, records, users
│   │   ├── middleware/          # rate-limit, validation
│   │   └── index.ts             # App Hono + serve
│   ├── cli/                     # CLI tools
│   │   ├── redcap/              # crf-redcap (test connectivite)
│   │   └── server/              # crf-server (test serveur CRF)
│   └── bin/                     # Entry points CLI
├── test/
└── package.json
```

Scripts CRF :

- `pnpm -F @univ-lehavre/crf generate:types` - Regenerer les types depuis OpenAPI
- `pnpm -F @univ-lehavre/crf mock:redcap` - Lancer Prism (mock REDCap)
- `pnpm -F @univ-lehavre/crf start` - Lancer le serveur CRF
- `pnpm -F @univ-lehavre/crf test:api` - Tests Schemathesis contre l'API

### packages/redcap-openapi (REDCap Source Analysis)

Outils d'analyse du code source PHP REDCap pour extraire les specifications OpenAPI.
CLI unifie avec `@clack/prompts` pour une experience interactive.

```
packages/redcap-openapi/
├── src/
│   ├── extractor/          # Extraction OpenAPI depuis PHP
│   ├── comparator/         # Comparaison de specs
│   ├── server/             # Serveur docs (Swagger UI, Redoc)
│   ├── cli/                # CLI unifie
│   └── index.ts            # Exports publics
├── specs/versions/         # Specs generees par version
├── upstream/versions/      # Sources PHP (gitignored)
├── dev/                    # Environnement de developpement
│   ├── docker/             # Docker compose + config
│   ├── scripts/            # Scripts d'automatisation
│   └── tests/              # Tests de contrat
└── package.json
```

Scripts REDCap :

- `pnpm -F @univ-lehavre/atlas-redcap-openapi cli` - CLI interactif
- `pnpm -F @univ-lehavre/atlas-redcap-openapi extract` - Extraire spec OpenAPI
- `pnpm -F @univ-lehavre/atlas-redcap-openapi compare` - Comparer versions
- `pnpm -F @univ-lehavre/atlas-redcap-openapi docs` - Serveur documentation

### Ajouter une methode au client REDCap

```typescript
// packages/crf/src/redcap/client.ts
import { Effect } from 'effect';
import type { components } from './generated/types.js';
import { RedcapError } from './errors.js';

// Utiliser les types generes depuis la spec OpenAPI
type ProjectInfo = components['schemas']['ProjectInfo'];

export const getProjectInfo = (config: RedcapConfig): Effect.Effect<ProjectInfo, RedcapError> => {
  return Effect.gen(function* () {
    const response = yield* makeRequest(config, {
      content: 'project',
    });
    return response as ProjectInfo;
  });
};
```

## Ce qu'il ne faut PAS faire

- Ne pas commiter de secrets reels
- Ne pas utiliser `any` en TypeScript
