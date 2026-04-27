---
"@univ-lehavre/atlas-openalex": minor
"@univ-lehavre/atlas-openalex-cli": minor
"@univ-lehavre/atlas-crf": patch
"@univ-lehavre/atlas-find-an-expert": patch
---

Extract CLI interaction from `packages/openalex` into new `cli/openalex` workspace.

`@univ-lehavre/atlas-openalex` is now a proper reusable library (adds `exports`/`main`/`types` fields, removes `@clack/prompts`, `yargs`, `picocolors` dependencies). The interactive researcher curation program moves to `@univ-lehavre/atlas-openalex-cli`.

`@univ-lehavre/atlas-crf`: extract `projectResponses` helper and refactor `createApp` to reduce duplication.

`@univ-lehavre/atlas-find-an-expert`: add consent and user service test coverage.
