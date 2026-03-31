---
"@univ-lehavre/atlas-researcher-profiles": minor
---

feat(researcher-profiles): add raw_affiliation_strings verification

After filtering works by raw_author_name, extract unique affiliation strings grouped
by institution (display_name · country_code) and present them via groupMultiselect.
Selected affiliations are saved to REDCap (`alternative_author_affiliations`) and used
as a second filter on works before writing to `oa_references`.
