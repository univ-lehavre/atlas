---
"atlas": patch
---

feat(config): add unified audit script and svelte:check

- Add `ci:audit` script combining all audit commands
- Add `svelte:check` script for SvelteKit type checking
- Integrate svelte:check in CI and lefthook pre-commit
- Add audit:versions and audit:size to CI audit job
- Move jscpd and typedoc configs into package.json
- Add audit documentation page
