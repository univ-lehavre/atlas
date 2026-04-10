# @univ-lehavre/atlas-redcap-stats-cli

## 0.2.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-redcap-logs@0.3.1

## 0.2.1

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`aced246`](https://github.com/univ-lehavre/atlas/commit/aced24617bdc0839a40d8a52e69d6222e96b609a) Thanks [@chasset](https://github.com/chasset)! - Move REDCap tooling packages into the unified `cli/*` layout.
  - relocate `atlas-redcap-openapi` from `tools/dev/redcap-openapi` to `cli/redcap-openapi`
  - relocate `atlas-redcap-stats-cli` from `tools/cli-redcap-stats` to `cli/redcap-stats`
  - update workspace and tooling references (pnpm lockfile, TypeDoc, Knip, package metadata)

- Updated dependencies [[`02f3bdc`](https://github.com/univ-lehavre/atlas/commit/02f3bdcf6777f5ebd4fd730020f3d4e87cbc247e)]:
  - @univ-lehavre/atlas-redcap-logs@0.3.0

## 0.2.0

### Minor Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-stats-cli` — Initial release.** New CLI package to inspect REDCap project token and API health.

  **`atlas-redcap-logs`** — Switch cache to current working directory, write human-readable JSON cache files, improve action-category detection (French labels), simplify user categories to "loggé"/"enquêté", estimate surveyed users from survey/record identifiers, add calendar-month aggregations.

### Patch Changes

- Updated dependencies [[`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1), [`99cec7f`](https://github.com/univ-lehavre/atlas/commit/99cec7f077aedbb10fc217a87ed7d4055d9cbf7d)]:
  - @univ-lehavre/atlas-redcap-logs@0.2.0
