# Tests AMARRE

L'app `amarre` (SvelteKit + Appwrite + REDCap) est couverte par une **pyramide à 5 niveaux**. Ce dossier héberge les niveaux **1, 3 et 4** ; les niveaux 2 et 5 vivent dans les sandbox.

Pour l'**opérationnel** (commandes, prérequis stack, debug d'un skip, patterns d'échec), voir [RUNBOOK.md](./RUNBOOK.md). Ce README couvre l'**architecture** et les conventions.

## Pyramide

| #   | Niveau                                           | Où                                                                                                     | Framework                                                             | Prérequis                                                           |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | UI amarre (composants + affichage conditionnel)  | [tests/ui/](./ui/)                                                                                     | Vitest + happy-dom + `@testing-library/svelte`                        | aucun                                                               |
| 1   | Unit / API / services serveur                    | [tests/lib/](./lib/), [tests/routes/](./routes/), [tests/hooks.server.test.ts](./hooks.server.test.ts) | Vitest (node env)                                                     | aucun                                                               |
| 2   | REDCap seul (contract amarre + OpenAPI strict)   | [sandbox/crf-sandbox/tests/contract-amarre/](../../../sandbox/crf-sandbox/tests/contract-amarre/)      | Vitest + `ajv` + [packages/crf-client](../../../packages/crf-client/) | REDCap docker (crf-sandbox)                                         |
| 3   | amarre + REDCap (services serveur, sans browser) | [tests/integration/crf/](./integration/crf/)                                                           | Vitest (node env, self-skip)                                          | REDCap + bootstrap-crf                                              |
| 4   | amarre + Appwrite (magic-link API-only)          | [tests/integration/auth/](./integration/auth/)                                                         | Vitest (node env, self-skip)                                          | Appwrite + Mailpit                                                  |
| 5   | Smoke E2E browser final                          | [sandbox/amarre-sandbox/tests/e2e/](../../../sandbox/amarre-sandbox/tests/e2e/)                        | `@playwright/test` (self-skip)                                        | stack complète (`pnpm -F @univ-lehavre/atlas-amarre-sandbox start`) |

## Structure

```
tests/
├── README.md                  ← architecture (vous êtes ici)
├── RUNBOOK.md                 ← opérationnel : commandes / debug / patterns
├── fixtures/                  ← payloads typés partagés (users, requests, forms)
│   ├── users.ts
│   ├── requests.ts
│   └── forms.ts
├── hooks.server.test.ts       ← niveau 1, tests des hooks SvelteKit
├── ui/                        ← niveau 1, environment=happy-dom
│   ├── setup.ts               ← extend expect + cleanup auto
│   ├── conditional-sections.test.ts
│   ├── TopNavbar.test.ts
│   └── forms.test.ts
├── lib/                       ← niveau 1 (mirror de src/lib/), environment=node
│   ├── errors/mapper.test.ts
│   ├── server/services/surveys.test.ts
│   ├── server/validators/auth.test.ts
│   └── validators/index.test.ts
├── routes/                    ← niveau 1 (mirror de src/routes/), environment=node
│   └── api/v1/{auth,surveys}/
└── integration/               ← niveaux 3 & 4 (self-skip selon stack)
    ├── crf/surveys.test.ts    ← niveau 3 (amarre × REDCap)
    ├── auth/signup.test.ts    ← niveau 4 (amarre × Appwrite × Mailpit)
    └── helpers/
        ├── redcap.ts          ← reachability + cleanup REDCap
        ├── appwrite.ts        ← reachability + cleanup Appwrite users
        └── mailpit.ts         ← polling magic-link emails, extract userId/secret
```

**Convention de placement** : chaque test unit doit _mirrorer_ le chemin de son module sous `src/`. `src/lib/server/validators/auth.ts` → `tests/lib/server/validators/auth.test.ts`. Les routes suivent leur arborescence `+server.ts`. Les tests d'intégration vivent sous `tests/integration/<domain>/` (`crf/` pour REDCap, `auth/` pour Appwrite).

## Vitest multi-project

[vitest.config.ts](../vitest.config.ts) déclare trois projects :

- `unit` (environment `node`, include `tests/**/*.test.ts` sauf `tests/ui/**` et `tests/integration/**`) — tests purs.
- `ui` (environment `happy-dom`, include `tests/ui/**/*.test.ts`, force la résolution Svelte `browser` pour éviter `lifecycle_function_unavailable`) — tests de composants.
- `integration` (environment `node`, include `tests/integration/**/*.test.ts`, `testTimeout: 30s`) — niveaux 3 et 4. Les suites docker-required appellent `isRedcapReachable()` / `isAppwriteReachable()` / `isMailpitReachable()` au module-load et passent par `describe.skipIf(!reachable)` — elles se skip seules quand le stack n'est pas up.

Les trois projects partagent la config Vite/SvelteKit racine via `mergeConfig`, donc `$lib`, `$env/*` et autres alias virtuels fonctionnent.

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

## Trous de couverture connus

- **Routes API** : `login`, `logout`, `me` n'ont pas de test dédié (couvertes implicitement par les niveaux 4 et 5).
- **Lib serveur** : `src/lib/server/baas/userRepository.ts` et `src/lib/server/services/profile.ts` n'ont pas de test unit.
- **Pages** : `routes/+page.server.ts` et `routes/login/+page.server.ts` ne sont pas testées en unit.

À combler à mesure que ces couches évoluent. Les seuils de couverture (`statements: 49, branches: 58, functions: 31, lines: 53`) ont été re-baselinés après l'extraction des composants vers `@univ-lehavre/atlas-ui` — à remonter au fur et à mesure.
