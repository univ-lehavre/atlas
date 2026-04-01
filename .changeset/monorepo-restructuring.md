---
"@univ-lehavre/atlas-crf": major
"@univ-lehavre/atlas-net": major
"@univ-lehavre/atlas-redcap-client": major
"@univ-lehavre/atlas-crf-cli": major
"@univ-lehavre/atlas-net-cli": major
"@univ-lehavre/atlas-researcher-profiles": patch
---

Restructure monorepo into clear architectural categories

**Breaking changes:**

- `@univ-lehavre/atlas-crf`: now a pure HTTP service (Hono). The `./redcap` subpath export and CLI binaries (`crf-redcap`, `crf-server`) have been removed. Use `@univ-lehavre/atlas-redcap-client` for the REDCap API client and `@univ-lehavre/atlas-crf-cli` for the CLIs.
- `@univ-lehavre/atlas-net`: now a pure network diagnostic library. The `./cli` subpath export and `atlas-net` binary have been removed. Use `@univ-lehavre/atlas-net-cli` for the CLI.

**New packages:**

- `@univ-lehavre/atlas-redcap-client`: Effect-based REDCap API client, extracted from `@univ-lehavre/atlas-crf`.
- `@univ-lehavre/atlas-crf-cli`: CLI tools for REDCap connectivity testing and CRF server management (`crf-redcap`, `crf-server`).
- `@univ-lehavre/atlas-net-cli`: Network diagnostic CLI (`atlas-net`).
