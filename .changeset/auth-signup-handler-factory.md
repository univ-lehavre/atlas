---
"@univ-lehavre/atlas-auth": minor
---

Add `createSignupHandler` factory completing the auth handler trio
started in the login/logout PR. Wraps the shared rate-limited signup
flow (Phase 6.5 DevSecOps) and exposes three strategy points covering
the cross-app divergences :

- `extractEmail` — defaults to JSON body via `checkRequestBody` ; ecrin
  passes a `FormData`-based override.
- `validateEmail` — amarre uses `validateSignupEmail` from this package
  with its `ALLOWED_DOMAINS_REGEXP`, ecrin uses its local
  `isAlliance`-backed validator.
- `signupWithEmail` — receives the validated email plus the full
  SvelteKit event so each app can build its service context
  (`{ fetch }`, `{ fetch, cookies }`, etc.).

The default rate limit is 5 req/min/IP, overridable via the
`rateLimit` option. Responses always carry `X-RateLimit-*` headers ;
429 adds `Retry-After`. The success payload is the existing envelope
`{ data: { signedUp: true, createdAt? }, error: null }` — `createdAt`
is now exposed everywhere (was missing on ecrin previously ;
additive, non-breaking).

amarre and ecrin signup handlers are migrated and drop from ~25-30
lines to ~10. The redundant amarre tests at
`tests/routes/api/v1/auth/{login,logout,signup}.test.ts` (introduced
in #218 before the factory existed) are removed — the factory tests
in `packages/auth/src/handlers.test.ts` now own that contract for both
apps.

find-an-expert signup is **not** migrated for the same reason as
login/logout : its response is un-enveloped (`{ signedUp: true, ... }`).
Aligning FAE will land in the follow-up envelope PR.
