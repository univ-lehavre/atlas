# Tests AMARRE

L'app `amarre` (SvelteKit + Appwrite + REDCap) est couverte par une pyramide à 5 niveaux. Ce dossier contient les niveaux **1** (unit + UI), les autres niveaux vivent dans les sandbox.

## Pyramide

| #   | Niveau                                           | Où                                                                                                                    | Framework                                                             | Prérequis                       |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------- |
| 1   | UI amarre (composants + affichage conditionnel)  | `apps/amarre/tests/ui/`                                                                                               | Vitest + happy-dom + `@testing-library/svelte`                        | aucun                           |
| 1   | Unit / API / services serveur                    | `apps/amarre/tests/{lib,routes,server,integration,utils}/`                                                            | Vitest (node env)                                                     | aucun                           |
| 2   | REDCap seul (contract amarre + OpenAPI strict)   | [sandbox/crf-sandbox/tests/contract-amarre/](../../../sandbox/crf-sandbox/tests/contract-amarre/) _(à venir)_         | Vitest + `ajv` + [packages/crf-client](../../../packages/crf-client/) | REDCap docker                   |
| 3   | amarre + REDCap (services serveur, sans browser) | [sandbox/amarre-sandbox/tests/integration/crf/](../../../sandbox/amarre-sandbox/tests/integration/crf/) _(à venir)_   | Vitest                                                                | REDCap + bootstrap-crf          |
| 4   | amarre + Appwrite (magic-link API-only)          | [sandbox/amarre-sandbox/tests/integration/auth/](../../../sandbox/amarre-sandbox/tests/integration/auth/) _(à venir)_ | Vitest + Mailpit                                                      | Appwrite + Mailpit + amarre dev |
| 5   | Smoke E2E browser final                          | [sandbox/amarre-sandbox/tests/e2e/](../../../sandbox/amarre-sandbox/tests/e2e/) _(à venir)_                           | `@playwright/test`                                                    | stack complète (`pnpm start`)   |

Le plan global est dans `.claude/plans/j-aimerais-que-tu-audites-compiled-glade.md`. La phase A (présente PR) ne livre que le niveau 1.

## Structure

```
tests/
├── README.md                  ← vous êtes ici
├── fixtures/                  ← payloads typés partagés (users, requests, forms)
│   ├── users.ts
│   ├── requests.ts
│   └── forms.ts
├── ui/                        ← niveau 1, environment=happy-dom
│   ├── setup.ts               ← extend expect + cleanup auto
│   ├── conditional-sections.test.ts
│   ├── TopNavbar.test.ts
│   └── forms.test.ts
├── lib/                       ← niveau 1, environment=node
├── routes/                    ←  "
├── server/                    ←  "
├── integration/               ←  "  (drift detection — utilitaire interne)
├── utils/                     ←  "
└── hooks.server.test.ts       ←  "
```

## Vitest multi-project

[vitest.config.ts](../vitest.config.ts) déclare deux projects :

- `unit` (environment `node`, include `tests/**/*.test.ts` sauf `tests/ui/**`) — les tests existants, intacts.
- `ui` (environment `happy-dom`, include `tests/ui/**/*.test.ts`, force la résolution Svelte `browser` pour éviter `lifecycle_function_unavailable`) — les tests de composants.

Les deux projects partagent la config Vite/SvelteKit racine via `mergeConfig`, donc `$lib`, `$env/*` et autres alias virtuels fonctionnent dans les tests.

## Commandes

```bash
pnpm test            # unit + ui (98 tests, ~1s)
pnpm test:unit       # node project uniquement (78 tests)
pnpm test:ui         # happy-dom project uniquement (20 tests)
pnpm test:coverage   # rapport de couverture (seuils dans vitest.config.ts)
```

Aucune commande n'a besoin de docker pour le niveau 1. Pour les niveaux 2-5, voir les sandbox correspondantes.

## Écrire un test de composant (niveau 1)

```ts
// tests/ui/MyComponent.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import MyComponent from '$lib/ui/MyComponent.svelte';

describe('MyComponent.svelte', () => {
  it('renders the title prop', () => {
    render(MyComponent, { title: 'hello' });
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

Pièges connus :

- **Bootstrap modals** : `.modal.fade` porte `aria-hidden="true"`, Testing Library masque le contenu par défaut. Passer `{ hidden: true }` aux queries (`getByRole('button', { name: /…/, hidden: true })`).
- **Svelte 5 + Vitest** : si vous voyez `lifecycle_function_unavailable: mount(...) is not available on the server`, c'est que le project a chargé la build SSR. La conf `resolve.conditions = ['browser']` du project `ui` règle ça.

## Drift detection (legacy)

`tests/utils/drift-detector.ts` est un utilitaire interne pour détecter les changements de structure d'API. Il est branché sur `tests/integration/drift-detection.test.ts`. À ce jour il n'a pas de baselines actives sur disque (les anciens scripts `test:baseline-*` n'existent plus dans `package.json`). On le garde le temps de décider s'il fusionne avec le niveau 2 (contract OpenAPI) ou s'il sort.

## Phases à venir

- **B** : niveau 2 — `tests/contract-amarre/` côté crf-sandbox + helper `assertMatchesOpenAPI` (ajv + spec v16.1.9.yaml)
- **C** : niveau 3 — intégration amarre × REDCap via `packages/crf-client`
- **D** : niveau 4 — magic-link API-only (conversion de `sandbox/amarre-sandbox/scripts/test-e2e.ts` en suite Vitest)
- **E** : niveau 5 — smoke E2E avec `@playwright/test` (`sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts`)
- **F** : migration des tests admin Appwrite vers `packages/baas/tests/`
- **G** : nettoyage final, suppression des scripts `test-e2e*.ts` de la sandbox
