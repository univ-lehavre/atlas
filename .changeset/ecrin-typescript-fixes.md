---
'ecrin': patch
---

fix(ecrin): resolve typescript errors blocking pre-commit

- Add `export {}` to app.d.ts for proper module treatment
- Rename Record interface to RedcapRecord to avoid shadowing global Record<K,V>
- Add prettier-plugin-svelte for .svelte file formatting
- Add app.d.ts to .prettierignore (prettier removes export {})
- Fix lefthook: run svelte-kit sync before lint for tsconfig resolution
