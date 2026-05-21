# Tests AMARRE

L'app `amarre` (SvelteKit + Appwrite + REDCap) est couverte par une pyramide à 5 niveaux. Ce dossier contient les niveaux **1** (unit + UI), les autres niveaux vivent dans les sandbox.

## Pyramide

| #   | Niveau                                           | Où                                                                                                            | Framework                                                             | Prérequis                     |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------- |
| 1   | UI amarre (composants + affichage conditionnel)  | `apps/amarre/tests/ui/`                                                                                       | Vitest + happy-dom + `@testing-library/svelte`                        | aucun                         |
| 1   | Unit / API / services serveur                    | `apps/amarre/tests/{lib,routes,server,integration,utils}/`                                                    | Vitest (node env)                                                     | aucun                         |
| 2   | REDCap seul (contract amarre + OpenAPI strict)   | [sandbox/crf-sandbox/tests/contract-amarre/](../../../sandbox/crf-sandbox/tests/contract-amarre/) _(à venir)_ | Vitest + `ajv` + [packages/crf-client](../../../packages/crf-client/) | REDCap docker                 |
| 3   | amarre + REDCap (services serveur, sans browser) | `apps/amarre/tests/integration/crf/`                                                                          | Vitest (node env, self-skip)                                          | REDCap + bootstrap-crf        |
| 4   | amarre + Appwrite (magic-link API-only)          | `apps/amarre/tests/integration/auth/`                                                                         | Vitest (node env, self-skip)                                          | Appwrite + Mailpit            |
| 5   | Smoke E2E browser final                          | [sandbox/amarre-sandbox/tests/e2e/](../../../sandbox/amarre-sandbox/tests/e2e/) _(à venir)_                   | `@playwright/test`                                                    | stack complète (`pnpm start`) |

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
├── integration/               ← niveaux 3 & 4 (self-skip selon stack)
│   ├── crf/surveys.test.ts    ← niveau 3 (amarre × REDCap)
│   ├── auth/signup.test.ts    ← niveau 4 (amarre × Appwrite × Mailpit)
│   ├── helpers/
│   │   ├── redcap.ts          ← reachability + cleanup REDCap
│   │   ├── appwrite.ts        ← reachability + cleanup Appwrite users
│   │   └── mailpit.ts         ← polling magic-link emails, extract userId/secret
│   └── drift-detection.test.ts ← utilitaire interne, sans réseau
├── utils/                     ←  "
└── hooks.server.test.ts       ←  "
```

## Vitest multi-project

[vitest.config.ts](../vitest.config.ts) déclare trois projects :

- `unit` (environment `node`, include `tests/**/*.test.ts` sauf `tests/ui/**` et `tests/integration/**`) — les tests existants, intacts.
- `ui` (environment `happy-dom`, include `tests/ui/**/*.test.ts`, force la résolution Svelte `browser` pour éviter `lifecycle_function_unavailable`) — les tests de composants.
- `integration` (environment `node`, include `tests/integration/**/*.test.ts`, `testTimeout: 30s`) — niveau 3 (amarre × REDCap). Les suites docker-required appellent `isRedcapReachable()` au load et passent par `describe.skipIf(!reachable)`, donc elles se skip seules quand le stack n'est pas up.

Les trois projects partagent la config Vite/SvelteKit racine via `mergeConfig`, donc `$lib`, `$env/*` et autres alias virtuels fonctionnent dans les tests.

## Commandes

```bash
pnpm test              # unit + ui + integration (les level-3 se skipent sans docker)
pnpm test:unit         # node project uniquement
pnpm test:ui           # happy-dom project uniquement
pnpm test:integration  # node project + REDCap docker
pnpm test:coverage     # rapport de couverture (seuils dans vitest.config.ts)
```

Pour exécuter le niveau 3, démarrer la stack au préalable :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start  # docker up + bootstrap baas + bootstrap-crf + seed
pnpm -F @univ-lehavre/atlas-amarre test:integration
```

Sans la stack, la suite level-3 se skipe proprement (les autres niveaux passent).

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
