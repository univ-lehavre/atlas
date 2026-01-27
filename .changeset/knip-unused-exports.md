---
"@univ-lehavre/atlas-amarre": patch
"@univ-lehavre/atlas-crf": patch
"@univ-lehavre/atlas-ecrin": patch
"@univ-lehavre/atlas-find-an-expert": patch
---

Remove unused exports and enable knip exports check

- Enable knip to detect unused exports (remove --exclude exports flag)
- Clean up 105 unused exports across packages
- Configure knip to ignore public API files in crf package
