---
"@univ-lehavre/atlas-researcher-profiles": minor
---

add pdf generation, ocr fallback, and interactive cli for researcher profiles

- `match-references` generates an APA-like PDF (`final_references_pdf`) and uploads it to REDCap
- `match-references` saves extracted publication text as a PDF (`raw_references`) with an import timestamp
- OCR fallback via tesseract.js + @napi-rs/canvas for scanned or garbled PDFs (e.g. HAL private font encoding)
- `final_references` filtered to DOI-only works, deduplicated by DOI
- `--force` flag on `from-redcap` to re-process researchers already marked as up-to-date
- interactive CLI: command and options (threshold, force) are prompted when not passed on the command line
- unknown CLI arguments are validated with a clear error message
- researchers are deselected by default in the `match-references` multiselect
