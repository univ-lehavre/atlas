---
"@univ-lehavre/atlas-auth": minor
---

Add `createMeHandler` factory closing the auth handler quartet
(login/logout/signup/me). Reads `locals.userId` ; returns 401 with
code `unauthenticated` when missing or not a non-empty string (the
existing amarre/ecrin contract) ; delegates to `service.getProfile`
when present and wraps the result in the shared `{ data, error }`
envelope.

The factory keeps the profile type opaque (`Promise<unknown>`) so each
app can return whatever shape its UI consumes — `{ id, email, labels }`
for amarre/ecrin today.

apps/amarre and apps/ecrin `/api/v1/me/+server.ts` are migrated and
drop from ~18 lines to 3. The amarre handler test
(`tests/routes/api/v1/me.test.ts`, added in #218 before the factory
existed) is removed — the factory tests in
`packages/auth/src/handlers.test.ts` own the contract for both apps.

ecrin gets a small fix as a side effect : its previous handler used
`console.log(error)` and always returned 500 instead of going through
`mapErrorToApiResponse`. With the factory in place, `ApplicationError`
subclasses now surface with their proper HTTP status code.

find-an-expert `/api/v1/users/me` is not migrated for the same reason
as login/logout/signup : its response is un-enveloped (`json(payload)`
directly). Aligning FAE will land in the follow-up envelope PR.
