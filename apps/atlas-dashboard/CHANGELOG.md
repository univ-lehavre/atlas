# @univ-lehavre/atlas-dashboard

## 0.1.1

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`5cbaec9`](https://github.com/univ-lehavre/atlas/commit/5cbaec96addc2ce5e4826feab6b4f2120737a2ec) Thanks [@chasset](https://github.com/chasset)! - Harden Atlas stats collection and consumption across dashboard, shared library, and CLI.
  - make cache parsing resilient and resolve cache file from workspace root
  - fix UTC period boundary computation to avoid timezone drift
  - harden dashboard refresh flow (dedupe, cooldown, safer force behavior)
  - align dashboard routes with non-forced refresh endpoint
  - clean CLI typing/lint issues in JSON mode

- Updated dependencies [[`5cbaec9`](https://github.com/univ-lehavre/atlas/commit/5cbaec96addc2ce5e4826feab6b4f2120737a2ec), [`46e73a0`](https://github.com/univ-lehavre/atlas/commit/46e73a08dc6d599a051a6f403f682beec1e89f96)]:
  - @univ-lehavre/atlas-stats@0.1.1
