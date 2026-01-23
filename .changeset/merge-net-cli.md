---
"@univ-lehavre/atlas-net": minor
---

Merge CLI into net package

- Move CLI from `cli/net/` to `packages/net/src/cli/`
- Add `bin.atlas-net` entry point
- Export CLI module via `@univ-lehavre/atlas-net/cli`
- Remove separate `@univ-lehavre/atlas-net-cli` package
- Update eslint config with CLI-specific rules
