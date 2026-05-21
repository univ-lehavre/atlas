---
"@univ-lehavre/atlas-amarre": patch
---

Level-4 of the amarre test pyramid : Vitest integration tests for the **signup → magic-link → session** flow, exercised against a real Appwrite + Mailpit stack.

- New `tests/integration/auth/signup.test.ts` (4 tests) :
  - `signupWithEmail()` returns a Token from Appwrite.
  - Signup is rejected for emails outside `ALLOWED_DOMAINS_REGEXP`.
  - The magic-link email actually lands in Mailpit (Appwrite worker-mails dispatch).
  - `login(userId, secret, cookies)` opens a real Appwrite session (verified via the admin SDK's `listSessions`).
- New `tests/integration/helpers/mailpit.ts` : reachability probe, polling, magic-link URL extraction (handles `&amp;`-escaped HTML bodies), purge.
- New `tests/integration/helpers/appwrite.ts` : admin reachability probe (catches placeholder configs early), session count, prefix-scoped user cleanup.

The suite self-skips via `describe.skipIf(!appwriteUp || !mailpitUp)`, so the default `pnpm test` stays docker-free. REDCap doesn't need to be up — `signupWithEmail` falls back to `ID.unique()` when `fetchUserId` errors.

To exercise the suite :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start
pnpm -F @univ-lehavre/atlas-amarre test:integration
```
