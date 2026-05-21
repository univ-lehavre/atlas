---
"@univ-lehavre/atlas-amarre": minor
---

Extract the 15 Svelte UI components from `apps/amarre/src/lib/ui/` to a new shared design-system package `@univ-lehavre/atlas-ui` (live at `ui/atlas-ui/`), previewed via Storybook 10.

For amarre, imports change shape :

```ts
// before
import Signup from "$lib/ui/Signup.svelte";

// after
import Signup from "@univ-lehavre/atlas-ui/Signup.svelte";
// or
import { Signup } from "@univ-lehavre/atlas-ui";
```

Plus :

- **Bootstrap is now an npm dependency** (`bootstrap@5.3.8` + `bootstrap-icons@1.13.1`) owned by `ui/atlas-ui`. Amarre's `+layout.svelte` imports `@univ-lehavre/atlas-ui/client` which pulls the CSS + JS bundle. The CDN `<link>` / `<script>` tags previously in `apps/amarre/src/app.html` are gone. Bumping Bootstrap = bumping one dep in one package.
- **Two amarre-coupled components were generalized** (Collaborate, Request) : they now take a plain `RequestRecord` interface (re-exported from atlas-ui) instead of the zod-inferred `SurveyRequestItem`. The server-side type/validator in amarre is unchanged — the structural compatibility lets amarre's richer type be assigned where atlas-ui expects the minimal one.

The level-1 UI tests in `apps/amarre/tests/ui/` still pass against the moved components (imports updated to `@univ-lehavre/atlas-ui/X.svelte`). A follow-up PR will move those tests + their fixtures into `ui/atlas-ui/tests/` so stories and tests share a single source of truth.

Run the gallery :

```bash
pnpm -F @univ-lehavre/atlas-ui storybook
# → http://localhost:6006
```
