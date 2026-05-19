---
"@univ-lehavre/atlas-auth": minor
"@univ-lehavre/atlas-logos": minor
"@univ-lehavre/atlas-crf-client": patch
"@univ-lehavre/atlas-baas": patch
"@univ-lehavre/atlas-errors": patch
"@univ-lehavre/atlas-validators": patch
---

DevSecOps runtime hardening + shared factories.

`@univ-lehavre/atlas-auth` — minor

- New `createRateLimiter({ limit, windowMs })` and `rateLimitHeaders(result, limit)` helpers (in-memory fixed-window per-key rate limiter, exit-fast 429 with `X-RateLimit-*` and `Retry-After` headers). Used by consuming apps to gate public HTTP endpoints and signup against abuse.
- `createAuthService` now sets `httpOnly: true` explicitly on session cookies (Phase 6.4 of the DevSecOps plan). The default in SvelteKit was already `true` but it is now part of the contract.

`@univ-lehavre/atlas-logos` — minor

- New `atlas-logos-install` CLI bin (`packages/logos/bin/install.mjs`) that copies the logo assets to a target directory. Replaces the brittle `vite-plugin-static-copy` middleware path used by SvelteKit apps; consumers call it from their `prepare` script and SvelteKit serves the logos natively from `static/logos/`.

`@univ-lehavre/atlas-crf-client` — patch

- Normalise the trailing slash on the configured API URL (appended automatically when missing, preserved otherwise). Fixes a class of double-slash request failures.

`@univ-lehavre/atlas-baas`, `@univ-lehavre/atlas-errors`, `@univ-lehavre/atlas-validators` — patch

No source change in these packages themselves, but the consuming SvelteKit apps (amarre, ecrin, find-an-expert) have been refactored to use the existing shared factories — `createAdminClient` / `createSessionClient` / `BaasUserRepository` from `atlas-baas`, the error classes from `atlas-errors`, and `isEmail` / `isHexadecimal` / `ensureJsonContentType` / `parseJsonBody` from `atlas-validators`. The per-app duplicates (~500 lines) have been removed in favour of thin wrappers that inject app-level env-derived configuration. Recorded as patch bumps so the consolidation is traceable in the changelog and the released versions move forward in lockstep.
