# @univ-lehavre/atlas-redcap-logs

## 0.2.0

### Minor Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`99cec7f`](https://github.com/univ-lehavre/atlas/commit/99cec7f077aedbb10fc217a87ed7d4055d9cbf7d) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-dashboard` — Initial release.** SvelteKit dashboard for REDCap log statistics.

  **`atlas-redcap-logs`** — Add `Granularity` type and `computeCalendar(granularity, entries)` supporting day, week, month, and quarter aggregations.

  **`atlas-redcap-dashboard`** — Add `/api/stats?granularity=` endpoint, replace Y-scale selector with aggregation selector, patch out April 7–8 2026 log entries.

### Patch Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-stats-cli` — Initial release.** New CLI package to inspect REDCap project token and API health.

  **`atlas-redcap-logs`** — Switch cache to current working directory, write human-readable JSON cache files, improve action-category detection (French labels), simplify user categories to "loggé"/"enquêté", estimate surveyed users from survey/record identifiers, add calendar-month aggregations.
