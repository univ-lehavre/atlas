# @univ-lehavre/atlas-researcher-profiles

## 1.2.0

### Minor Changes

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`e2af218`](https://github.com/univ-lehavre/atlas/commit/e2af2185b9fbdb5527e7f903f100e7e113748826) Thanks [@chasset](https://github.com/chasset)! - feat(researcher-profiles): fluidifier l'interface CLI
  - `--batch` / `--yes` : auto-accepte les sélections de fullnames sans prompt interactif
  - Séparateurs visuels entre chercheurs avec compteur [1/N]
  - Temps écoulé affiché par chercheur
  - Spinner pendant l'extraction de texte (30-60s sans feedback auparavant)
  - Threshold affiché au début de match-references et dans chaque résumé
  - Quota OpenAlex affiché après le 1er chercheur (pas uniquement en fin de session)
  - Cancel gracieux : Ctrl+C sur le multiselect fullnames skip le chercheur au lieu de quitter le CLI
  - Notes françaises remplacées par de l'anglais pour cohérence

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`626254a`](https://github.com/univ-lehavre/atlas/commit/626254ac79c12e2ceb014f2d062599ef0dcea105) Thanks [@chasset](https://github.com/chasset)! - feat(researcher-profiles): pipeline unifié par chercheur
  - Nouveau mode par défaut : traite chaque chercheur de bout en bout (résolution OpenAlex + match publications) avant de passer au suivant, en s'appuyant sur les dates REDCap pour ignorer les étapes déjà à jour
  - `cli/match-row.ts` : extraction de la logique de matching par chercheur (réutilisée par la commande standalone `match-references`)
  - `cli/run.ts` : orchestrateur unifié remplaçant la cascade `from-redcap` → `match-references`
  - Les commandes standalone `from-redcap` et `match-references` sont conservées

  fix(validate-openalex): compatibilité avec `display_name: string | null` dans openalex-types

### Patch Changes

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1) Thanks [@chasset](https://github.com/chasset)! - fix(researcher-profiles): audit — type safety, bugs critiques et robustesse
  - `openalex-types`: `doi` et `Authorship.author.display_name` typés `string | null` (reflète la réalité de l'API)
  - `pdf-generator`: null guard sur `display_name` avant `.split()` (NPE potentiel)
  - `process-row`: filtre fullnames — ajout du guard `size === 0 → skipped` dans le chemin fresh-authors (bug : tous les works étaient inclus si aucun nom sélectionné)
  - `process-row`: échec de sauvegarde des fullnames → retourne `"error"` au lieu de continuer silencieusement
  - `file-extractor`: limite OCR à `MAX_OCR_PAGES = 50` pour éviter un traitement illimité sur des PDFs volumineux
  - `match-references`: suppression des casts `as` et des `eslint-disable no-unnecessary-condition` devenus obsolètes

- Updated dependencies [[`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1)]:
  - @univ-lehavre/atlas-openalex-types@3.1.1
  - @univ-lehavre/atlas-fetch-openalex@0.4.1

## 1.1.0

### Minor Changes

- [#77](https://github.com/univ-lehavre/atlas/pull/77) [`4d2f809`](https://github.com/univ-lehavre/atlas/commit/4d2f8092e18b5e9a3285f56845c09aec2e3d296c) Thanks [@chasset](https://github.com/chasset)! - add pdf generation, ocr fallback, and interactive cli for researcher profiles
  - `match-references` generates an APA-like PDF (`final_references_pdf`) and uploads it to REDCap
  - `match-references` saves extracted publication text as a PDF (`raw_references`) with an import timestamp
  - OCR fallback via tesseract.js + @napi-rs/canvas for scanned or garbled PDFs (e.g. HAL private font encoding)
  - `final_references` filtered to DOI-only works, deduplicated by DOI
  - `--force` flag on `from-redcap` to re-process researchers already marked as up-to-date
  - interactive CLI: command and options (threshold, force) are prompted when not passed on the command line
  - unknown CLI arguments are validated with a clear error message
  - researchers are deselected by default in the `match-references` multiselect
