---
"@univ-lehavre/atlas-amarre": patch
---

Add level-1 UI tests for amarre (phase A of the 5-level test pyramid).

The pre-existing `tests/lib/`, `tests/routes/`, `tests/server/`, `tests/utils/`, `tests/integration/` trees are unchanged. A new `tests/ui/` tree covers the actual DOM behaviour of the components using `@testing-library/svelte` + `happy-dom`. `vitest.config.ts` is restructured into two projects (`unit` + `ui`) so each environment is isolated.

Coverage of conditional rendering:

- `+page` slicing : empty / 1 incomplete / 1 in-progress / mixed, plus parametric coverage of `validation_finale_complete` values.
- `Complete.svelte`, `Follow.svelte` : 0 / 1 / N tile cases, headings present.
- `TopNavbar.svelte` : the 4 combinations of `hasIncompleteRequests × hasRequestsInProgress`, plus the persistent tabs.
- `Signup.svelte` : submit disabled until valid email, success/error alerts driven by `form.data` / `form.wrongSignupEmail`, no alert when `form` is null/undefined.
- `CreateRequest.svelte` : submit disabled until consent ticked.
- Signup ↔ modal contract : `#SignUp` exposed with a `data-bs-dismiss` close button (Bootstrap JS open/close itself stays a level-5 concern).

New devDeps: `@testing-library/svelte`, `@testing-library/jest-dom`, `@testing-library/user-event`, `happy-dom`. New pnpm scripts: `test:unit`, `test:ui` (default `pnpm test` runs both, 108 tests, ~1s).

Coverage thresholds untouched at 42/52/36/43 — they will be raised in a follow-up once the new numbers settle.
