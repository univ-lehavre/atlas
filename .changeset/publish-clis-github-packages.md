---
"@univ-lehavre/atlas-stats-cli": patch
"@univ-lehavre/atlas-citation-cli": patch
"@univ-lehavre/atlas-crf-cli": patch
"@univ-lehavre/atlas-crf-openapi": patch
"@univ-lehavre/atlas-crf-stats-cli": patch
"@univ-lehavre/atlas-logos-cli": patch
"@univ-lehavre/atlas-net-cli": patch
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Première publication de ces 8 CLIs sur les registres npm (npmjs.org +
GitHub Packages). Le code est inchangé ; ce bump `patch` déclenche
simplement leur release initiale via le pipeline Changesets existant
(cf. [ADR 0017](docs/decisions/0017-releases-npm-oidc-deux-registres.md)).
`atlas-biblio-cli` était déjà publié et n'est pas concerné.
