# @univ-lehavre/atlas-auth

Service et handlers d'authentification partagés pour les applications SvelteKit du monorepo.

Le paquet encapsule l'authentification Appwrite par _magic link_ : inscription avec validation du domaine de l'email, login par couple `userId` + `secret`, création du cookie de session, logout, suppression de compte. Optionnellement, il sait résoudre l'identifiant utilisateur via une source externe (par exemple REDCap) avant la création du token.

## Installation

```bash
pnpm add @univ-lehavre/atlas-auth
```

## Deux niveaux d'API

Le paquet expose deux niveaux complémentaires :

1. **`createAuthService(config)`** — service auth bas niveau (`login`, `logout`, `signupWithEmail`, `deleteUser`). À utiliser quand on a besoin de composer soi-même les appels (parcours custom, page `+page.server.ts`, etc.).
2. **`createLoginHandler` / `createLogoutHandler` / `createSignupHandler`** — _handler factories_ SvelteKit qui produisent directement le `RequestHandler` pour les routes `/api/v1/auth/*`. Chaque handler devient une composition d'une ligne sur le service.

Les deux niveaux partagent la même configuration et les mêmes garanties (validation, codes d'erreur, enveloppe de réponse).

## Service auth (bas niveau)

```ts
import { createAuthService } from '@univ-lehavre/atlas-auth';

const auth = createAuthService({
  baas: {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT,
    apiKey: APPWRITE_KEY,
  },
  loginUrl: PUBLIC_LOGIN_URL,
  domainValidation: { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP },
  // Optionnel : résolution d'ID via REDCap
  resolveUserId: async (email) => fetchUserIdFromRedcap(email),
});

// auth.login, auth.logout, auth.signupWithEmail, auth.deleteUser
```

## Handlers SvelteKit (haut niveau)

### `createLoginHandler`

```ts
// apps/amarre/src/routes/api/v1/auth/login/+server.ts
import { createLoginHandler } from '@univ-lehavre/atlas-auth';
import { login } from '$lib/server/services/auth';

export const POST = createLoginHandler({ login });
```

Le handler attend un corps JSON `{ userId, secret }` (magic URL payload), valide via `validateMagicUrlLogin`, crée la session, pose le cookie `SESSION_COOKIE` et renvoie `{ data: { loggedIn: true }, error: null }`. Les erreurs sont mappées via `mapErrorToApiResponse` du paquet `@univ-lehavre/atlas-errors`.

### `createLogoutHandler`

```ts
import { createLogoutHandler } from '@univ-lehavre/atlas-auth';
import { logout } from '$lib/server/services/auth';

export const POST = createLogoutHandler({ logout });
```

Lit `locals.userId` (peuplé par le hook de session), passe au service, supprime le cookie. Un userId absent ou mal formé remonte un `session_error` 401 / `userid_validation_error` 400.

### `createSignupHandler`

```ts
import { createSignupHandler, validateSignupEmail } from '@univ-lehavre/atlas-auth';
import { signupWithEmail } from '$lib/server/services/auth';
import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';

export const POST = createSignupHandler({
  validateEmail: (email) =>
    validateSignupEmail(email, { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP }),
  signupWithEmail: (email, event) => signupWithEmail(email, { fetch: event.fetch }),
});
```

Trois stratégies pour absorber les divergences entre apps :

| Stratégie         | Type                                                               | Défaut                                       |
| ----------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| `extractEmail`    | `(request: Request) => Promise<unknown>`                           | JSON `{ email }` via `checkRequestBody`      |
| `validateEmail`   | `(email: unknown) => Promise<string>`                              | Aucun défaut (requis)                        |
| `signupWithEmail` | `(email: string, event: RequestEvent) => Promise<SignupTokenLike>` | Aucun défaut (requis)                        |
| `rateLimit`       | `{ limit: number; windowMs: number }`                              | `{ limit: 5, windowMs: 60_000 }` (Phase 6.5) |

Exemple avec un parseur `FormData` (cas ecrin, qui poste un formulaire HTML plutôt que du JSON) :

```ts
export const POST = createSignupHandler({
  extractEmail: async (request) => {
    const form = await request.formData();
    return String(form.get('email') || '').trim();
  },
  validateEmail: localValidateSignupEmail, // strategy isAlliance async, voir l'app ecrin
  signupWithEmail: (email, event) =>
    signupWithEmail(email, { fetch: event.fetch, cookies: event.cookies }),
});
```

La réponse 200 est `{ data: { signedUp: true, createdAt? }, error: null }`. Quand la limite est atteinte, la réponse est 429 `{ data: null, error: { code: 'rate_limited', message } }` avec les en-têtes `X-RateLimit-*` et `Retry-After`.

## Validators

Réutilisables hors du contexte des factories — utiles dans une `+page.server.ts` ou un handler custom.

| Validateur              | Rôle                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `validateMagicUrlLogin` | Vérifie `userId` + `secret` (présents, strings, hexadécimaux)     |
| `validateSignupEmail`   | Vérifie format email + appartenance au domaine autorisé (regex)   |
| `validateUserId`        | Vérifie `userId` (présent, string, hexadécimal)                   |
| `checkRequestBody`      | Vérifie `Content-Type: application/json` + champs requis présents |

Tous lèvent une sous-classe d'`ApplicationError` (`@univ-lehavre/atlas-errors`) avec le bon `httpStatus` — `mapErrorToApiResponse` les remonte fidèlement côté réponse.

## Rate limiter

Helper réutilisé par `createSignupHandler` mais exposé pour brancher d'autres endpoints publics (cf. `ecrin /graphs`, `find-an-expert /institutions/search`, etc.).

```ts
import { createRateLimiter, rateLimitHeaders } from '@univ-lehavre/atlas-auth';

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const result = limiter.check(event.getClientAddress());
if (!result.ok) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: rateLimitHeaders(result, limiter.limit),
  });
}
```

Fenêtre fixe par-IP, _in-memory_. Limites connues documentées dans la TODO racine du dépôt (multi-instance, fenêtre fixe vs glissante).

## Hooks SvelteKit

Le sous-chemin `./hooks` expose un helper pour lire l'utilisateur courant dans `hooks.server.ts` et le poser dans `locals` :

```ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthHook } from '@univ-lehavre/atlas-auth/hooks';

export const handle = sequence(
  createAuthHook({
    baas: {
      /* ... */
    },
  })
  // autres hooks...
);
```

## Exports

| Sous-chemin    | Contenu                                            |
| -------------- | -------------------------------------------------- |
| `.` (défaut)   | Service, handlers, validators, rate limiter, types |
| `./validators` | Validators uniquement (sans dépendance Appwrite)   |
| `./hooks`      | Hooks SvelteKit pour `hooks.server.ts`             |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-auth build       # tsup build
pnpm -F @univ-lehavre/atlas-auth dev         # tsup --watch
pnpm -F @univ-lehavre/atlas-auth test        # vitest run
pnpm -F @univ-lehavre/atlas-auth lint        # eslint src
pnpm -F @univ-lehavre/atlas-auth typecheck   # tsc --noEmit
```

## License

[MIT](../../LICENSE)
