---
'@univ-lehavre/atlas-redcap-cli': minor
---

Migrate to @clack/prompts and picocolors for modern CLI UX

- Replace manual ANSI color codes with picocolors
- Replace readline-based menu with @clack/prompts select
- Add spinners for async operations
- Add arrow key navigation in menu
- Add styled output boxes with note()
