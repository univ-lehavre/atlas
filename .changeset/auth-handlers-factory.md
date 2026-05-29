---
"@univ-lehavre/atlas-auth": minor
---

Add `createLoginHandler` and `createLogoutHandler` factories exposing
the shared `+server.ts` shape used by `apps/amarre/` and `apps/ecrin/`
for `/api/v1/auth/login` and `/api/v1/auth/logout`. Each app's handler
becomes a one-line composition over `createAuthService`'s `login` /
`logout` methods:

```ts
import { createLoginHandler } from "@univ-lehavre/atlas-auth";
import { login } from "$lib/server/services/auth";
export const POST = createLoginHandler({ login });
```

The factories preserve the existing response envelope
(`{ data: { loggedIn: true } | { loggedOut: true }, error: null }`) and
the existing error mapping (`mapErrorToApiResponse` from
`@univ-lehavre/atlas-errors`). No behavior change for the apps that
migrate ; the apps' `+server.ts` files lose ~25 lines of repeated
boilerplate each.

`apps/find-an-expert/` is intentionally not migrated in this round
because its handler currently returns the un-enveloped
`{ loggedIn: true }`. Aligning find-an-expert with the shared envelope
will land in a follow-up PR.
