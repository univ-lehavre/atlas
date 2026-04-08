---
'@univ-lehavre/atlas-redcap-openapi': patch
'@univ-lehavre/atlas-redcap-stats-cli': patch
---

Move REDCap tooling packages into the unified `cli/*` layout.

- relocate `atlas-redcap-openapi` from `tools/dev/redcap-openapi` to `cli/redcap-openapi`
- relocate `atlas-redcap-stats-cli` from `tools/cli-redcap-stats` to `cli/redcap-stats`
- update workspace and tooling references (pnpm lockfile, TypeDoc, Knip, package metadata)
