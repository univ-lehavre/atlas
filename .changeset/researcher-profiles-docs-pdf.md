---
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Add `docs:pdf` npm script that compiles `ALGORITHMS.md` to PDF via pandoc/xelatex (with Unicode subscript substitution to handle glyphs Menlo lacks). The generated PDF is gitignored.
