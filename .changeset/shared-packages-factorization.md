---
"@univ-lehavre/atlas-errors": minor
"@univ-lehavre/atlas-appwrite": minor
"@univ-lehavre/atlas-validators": minor
"@univ-lehavre/atlas-auth": minor
"@univ-lehavre/ecrin": patch
"@univ-lehavre/amarre": patch
"@univ-lehavre/find-an-expert": patch
---

feat: create shared packages for auth, errors, validators, and appwrite

New shared packages to eliminate code duplication across SvelteKit apps:

- `@univ-lehavre/atlas-errors`: ApplicationError base class and typed HTTP errors
- `@univ-lehavre/atlas-appwrite`: Appwrite client utilities and UserRepository
- `@univ-lehavre/atlas-validators`: Email, hex, JSON validation (RFC 5322, ReDoS-safe)
- `@univ-lehavre/atlas-auth`: Authentication service with magic URL login

Migrated amarre, ecrin, and find-an-expert to use shared packages via re-exports,
maintaining backward compatibility for existing imports.
