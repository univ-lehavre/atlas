---
"@univ-lehavre/atlas-researcher-profiles": minor
---

add pdf generation and --force flag for researcher profiles

- `match-references` now generates an APA-like PDF of final references and uploads it to REDCap as a file field
- add `--force` flag to `from-redcap` to re-process researchers already marked as up-to-date
- interactive CLI: command and options (threshold, force) are prompted when not passed on the command line
- improve error output for REDCap write failures in `match-references`
