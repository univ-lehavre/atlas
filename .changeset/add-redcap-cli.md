---
'@univ-lehavre/atlas-redcap-cli': minor
'@univ-lehavre/atlas-redcap-service': patch
---

Add `@univ-lehavre/atlas-redcap-cli` package for REDCap connectivity testing

- New CLI tool built with `@effect/cli` for testing REDCap service connectivity
- `redcap test` command with multiple test options: `--all`, `--quick`, `--json`
- Individual test flags: `--service`, `--health`, `--project`, `--instruments`, `--fields`, `--records`
- Configurable service URL via `--url` option
- JSON output mode for CI integration
- Built-in help and shell completions
- Removed embedded `test-redcap.ts` script from `redcap-service` in favor of the new CLI
