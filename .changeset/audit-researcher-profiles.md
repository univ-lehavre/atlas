---
"@univ-lehavre/atlas-openalex-types": patch
"@univ-lehavre/atlas-researcher-profiles": patch
---

fix(researcher-profiles): audit — type safety, bugs critiques et robustesse

- `openalex-types`: `doi` et `Authorship.author.display_name` typés `string | null` (reflète la réalité de l'API)
- `pdf-generator`: null guard sur `display_name` avant `.split()` (NPE potentiel)
- `process-row`: filtre fullnames — ajout du guard `size === 0 → skipped` dans le chemin fresh-authors (bug : tous les works étaient inclus si aucun nom sélectionné)
- `process-row`: échec de sauvegarde des fullnames → retourne `"error"` au lieu de continuer silencieusement
- `file-extractor`: limite OCR à `MAX_OCR_PAGES = 50` pour éviter un traitement illimité sur des PDFs volumineux
- `match-references`: suppression des casts `as` et des `eslint-disable no-unnecessary-condition` devenus obsolètes
