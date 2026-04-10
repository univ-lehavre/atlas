# @univ-lehavre/atlas-redcap-logs

## 0.3.1

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

## 0.3.0

### Minor Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`02f3bdc`](https://github.com/univ-lehavre/atlas/commit/02f3bdcf6777f5ebd4fd730020f3d4e87cbc247e) Thanks [@chasset](https://github.com/chasset)! - Add endpoint network diagnostics helpers to REDCap logs.
  - add `diagnoseEndpointNetwork` export to probe DNS/TCP/TLS connectivity for REDCap API endpoints
  - expose structured diagnostics (target, DNS result, TCP probe, TLS metadata/errors) for dashboard and CLI troubleshooting

## 0.2.0

### Minor Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`99cec7f`](https://github.com/univ-lehavre/atlas/commit/99cec7f077aedbb10fc217a87ed7d4055d9cbf7d) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-dashboard` — Initial release.** SvelteKit dashboard for REDCap log statistics.

  **`atlas-redcap-logs`** — Add `Granularity` type and `computeCalendar(granularity, entries)` supporting day, week, month, and quarter aggregations.

  **`atlas-redcap-dashboard`** — Add `/api/stats?granularity=` endpoint, replace Y-scale selector with aggregation selector, patch out April 7–8 2026 log entries.

### Patch Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-stats-cli` — Initial release.** New CLI package to inspect REDCap project token and API health.

  **`atlas-redcap-logs`** — Switch cache to current working directory, write human-readable JSON cache files, improve action-category detection (French labels), simplify user categories to "loggé"/"enquêté", estimate surveyed users from survey/record identifiers, add calendar-month aggregations.
