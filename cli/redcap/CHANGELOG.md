# @univ-lehavre/atlas-redcap-cli

## 0.2.0

### Minor Changes

- [#17](https://github.com/univ-lehavre/atlas/pull/17) [`2952a6d`](https://github.com/univ-lehavre/atlas/commit/2952a6d9a30333d079aecb8bf609c05597852a2c) Thanks [@chasset](https://github.com/chasset)! - Add `@univ-lehavre/atlas-redcap-cli` package for REDCap connectivity testing
  - New CLI tool built with `@effect/cli` for testing REDCap service connectivity
  - `redcap test` command with multiple test options: `--all`, `--quick`, `--json`
  - Individual test flags: `--service`, `--health`, `--project`, `--instruments`, `--fields`, `--records`
  - Configurable service URL via `--url` option
  - JSON output mode for CI integration
  - Built-in help and shell completions
  - Removed embedded `test-redcap.ts` script from `redcap-service` in favor of the new CLI

- [#17](https://github.com/univ-lehavre/atlas/pull/17) [`898f3d3`](https://github.com/univ-lehavre/atlas/commit/898f3d315c0cc5e3a5e7fd6697c9f864eb2e7c1d) Thanks [@chasset](https://github.com/chasset)! - Migrate to @clack/prompts and picocolors for modern CLI UX
  - Replace manual ANSI color codes with picocolors
  - Replace readline-based menu with @clack/prompts select
  - Add spinners for async operations
  - Add arrow key navigation in menu
  - Add styled output boxes with note()
