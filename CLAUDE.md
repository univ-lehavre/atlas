# CLAUDE.md - Instructions pour Claude Code

Ce fichier fournit le contexte necessaire pour travailler efficacement sur ce projet.

## Vue d'ensemble du projet

**Atlas** est un monorepo TypeScript pour interagir avec l'API REDCap, construit avec Effect.

### Architecture

```
atlas/
├── packages/
│   ├── ecrin/              # Dashboard SvelteKit (Zero Trust)
│   ├── crf/                # Clinical Research Forms (REDCap client, server, CLI)
│   │   ├── specs/          # OpenAPI spec (redcap.yaml)
│   │   ├── src/redcap/     # Client Effect pour REDCap
│   │   ├── src/server/     # Microservice HTTP REST (Hono)
│   │   └── src/cli/        # CLI tools (crf-redcap, crf-server)
│   ├── redcap/             # Analyse source REDCap et extraction OpenAPI
│   │   ├── src/            # Modules exportables (extractor, comparator, server)
│   │   ├── specs/          # Specs OpenAPI generees par version
│   │   └── upstream/       # Sources PHP REDCap (gitignored)
│   ├── net/                # Utilitaires et CLI diagnostic reseau (atlas-net)
│   └── typescript-config/  # Config TypeScript partagee
└── infra/                  # Infrastructure Kubernetes (k3d/k3s)
```

### Stack technique

| Domaine         | Technologies                            |
| --------------- | --------------------------------------- |
| Runtime         | Node.js 20+, TypeScript 5.x             |
| Framework       | Effect (functional programming)         |
| Frontend        | SvelteKit 2, Svelte 5 (runes)           |
| Package manager | pnpm (workspaces)                       |
| Build           | Vite, tsup                              |
| Test            | Vitest                                  |
| Lint            | ESLint, Prettier                        |
| Kubernetes      | k3d (dev), k3s (VM), Cilium, SPIRE, OPA |

## Commandes essentielles

```bash
# Installation
pnpm install

# Developpement
pnpm dev                    # Tous les packages en watch
pnpm -F @univ-lehavre/crf dev  # Un package specifique

# Build
pnpm build                  # Tous les packages
pnpm -F ecrin build         # Un package specifique

# Tests
pnpm test                   # Tous les tests
pnpm -F @univ-lehavre/crf test  # Un package

# CRF specifique
pnpm -F @univ-lehavre/crf generate:types  # Regenerer types depuis OpenAPI
pnpm -F @univ-lehavre/crf mock:redcap     # Lancer mock Prism
pnpm -F @univ-lehavre/crf start           # Lancer le serveur CRF

# Lint
pnpm lint                   # ESLint
pnpm format                 # Prettier

# Verifications pre-commit
pnpm ready                  # lint + test + build

# Infrastructure locale
./infra/scripts/setup.sh    # Demarrer k3d + stack Zero Trust
./infra/scripts/teardown.sh # Arreter et nettoyer
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

### Svelte 5

- Utiliser les runes (`$state`, `$derived`, `$effect`, `$props`)
- Pas de stores Svelte 4
- Composants dans `src/lib/components/`
- Logique serveur dans `src/lib/server/`

```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
  }

  let { title, count = 0 }: Props = $props();
  let doubled = $derived(count * 2);
</script>
```

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
fix(ecrin): handle auth header parsing
docs(infra): update k3d setup instructions
```

## Structure des packages

### packages/crf (Clinical Research Forms)

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

### packages/redcap (REDCap Source Analysis)

Outils d'analyse du code source PHP REDCap pour extraire les specifications OpenAPI.
CLI unifie avec `@clack/prompts` pour une experience interactive.

```
packages/redcap/
├── src/
│   ├── extractor/          # Extraction OpenAPI depuis PHP
│   │   ├── parsers.ts      # Parsers pour index.php, help.php, etc.
│   │   ├── generator.ts    # Generation spec OpenAPI 3.1.0
│   │   └── index.ts        # API publique
│   ├── comparator/         # Comparaison de specs
│   │   └── index.ts        # Detection breaking changes
│   ├── server/             # Serveur docs (Swagger UI, Redoc)
│   │   └── index.ts        # HTTP server
│   ├── cli/                # CLI unifie
│   │   └── index.ts        # Commandes: extract, compare, docs
│   └── index.ts            # Exports publics
├── specs/versions/         # Specs generees par version
├── upstream/versions/      # Sources PHP (gitignored)
├── docker/                 # Environnement Docker REDCap
└── package.json
```

Scripts REDCap :

- `pnpm -F @univ-lehavre/atlas-redcap cli` - CLI interactif
- `pnpm -F @univ-lehavre/atlas-redcap extract` - Extraire spec OpenAPI
- `pnpm -F @univ-lehavre/atlas-redcap compare` - Comparer versions
- `pnpm -F @univ-lehavre/atlas-redcap docs` - Serveur documentation

### packages/ecrin

Dashboard SvelteKit avec architecture Zero Trust.

```
packages/ecrin/
├── src/
│   ├── routes/            # Pages SvelteKit
│   │   ├── +page.svelte   # Accueil (public)
│   │   ├── dashboard/     # Tableau de bord (protege)
│   │   ├── records/       # Gestion records (protege)
│   │   └── users/         # Admin (protege, admin only)
│   ├── lib/
│   │   ├── components/    # Composants reutilisables
│   │   └── server/        # Logique serveur uniquement
│   │       ├── api.ts     # Client CRF service
│   │       ├── opa.ts     # Client OPA (autorisation)
│   │       └── audit.ts   # Logging audit
│   ├── hooks.server.ts    # Lecture headers Authelia
│   └── app.d.ts           # Types globaux
├── Dockerfile
└── package.json
```

## Infrastructure (infra/)

Architecture Zero Trust locale avec k3d.

### Composants

| Composant    | Role                                 |
| ------------ | ------------------------------------ |
| k3d          | Cluster k3s dans Docker              |
| Cilium       | CNI + Ingress + Network Policies     |
| SPIRE        | mTLS automatique (workload identity) |
| OPA          | Autorisation RBAC/ABAC (Rego)        |
| Authelia     | Authentification (magic links)       |
| Loki/Grafana | Observabilite                        |

### Fichiers cles

```
infra/
├── k3d/cluster.yaml           # Config cluster
├── cilium/values.yaml         # Helm values Cilium
├── spire/                     # SPIRE server + agent
├── opa/configmap.yaml         # Policies Rego
├── manifests/
│   ├── authelia/              # Auth magic links
│   ├── network-policies/      # Zero Trust networking
│   ├── ecrin/deployment.yaml
│   └── crf-service/deployment.yaml
└── scripts/
    ├── setup.sh               # Demarrage complet
    └── teardown.sh            # Nettoyage
```

### URLs locales

| Service   | URL                   |
| --------- | --------------------- |
| Dashboard | http://localhost:8080 |
| MailHog   | http://localhost:8025 |
| Registry  | localhost:5111        |

## Patterns frequents

### Ajouter une nouvelle route protegee (ecrin)

```typescript
// src/routes/maroute/+page.server.ts
import { error } from '@sveltejs/kit';
import { checkAuthorization } from '$lib/server/opa';
import { logAuthzDecision } from '$lib/server/audit';

export const load = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  const allowed = await checkAuthorization({
    user: { email: locals.user.email, groups: locals.user.groups },
    action: 'read',
    resource: { type: 'maressource' },
  });

  logAuthzDecision(locals.user.email, 'read', '/maroute', allowed);

  if (!allowed) {
    throw error(403, 'Access denied');
  }

  return { user: locals.user };
};
```

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

### Modifier une policy OPA

Editer `infra/opa/configmap.yaml` :

```rego
# Nouvelle regle
allow if {
    "nouveau-role" in input.user.groups
    input.action == "read"
    input.resource.type == "nouveau-type"
}
```

Puis appliquer :

```bash
kubectl apply -f infra/opa/configmap.yaml
kubectl rollout restart deployment/opa -n ecrin
```

## Debugging

### Logs Kubernetes

```bash
# Tous les pods
kubectl get pods -n ecrin

# Logs d'un service
kubectl logs -f deployment/ecrin -n ecrin
kubectl logs -f deployment/authelia -n ecrin
kubectl logs -f deployment/opa -n ecrin

# Events
kubectl get events -n ecrin --sort-by='.lastTimestamp'
```

### Tester OPA localement

```bash
kubectl port-forward svc/opa 8181:8181 -n ecrin

curl -X POST http://localhost:8181/v1/data/ecrin/authz/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "user": {"email": "test@univ-lehavre.fr", "groups": ["researcher"]},
      "action": "read",
      "resource": {"type": "record"}
    }
  }'
```

### Rebuild et deployer une image

```bash
docker build -t localhost:5111/ecrin:dev -f packages/ecrin/Dockerfile .
docker push localhost:5111/ecrin:dev
kubectl rollout restart deployment/ecrin -n ecrin
```

## Ce qu'il ne faut PAS faire

- Ne pas commiter de secrets reels (les secrets dans `infra/` sont pour dev uniquement)
- Ne pas utiliser `any` en TypeScript
- Ne pas utiliser les stores Svelte 4 (utiliser les runes Svelte 5)
- Ne pas exposer le serveur CRF directement (toujours via `ecrin`)
- Ne pas bypasser OPA pour les autorisations
