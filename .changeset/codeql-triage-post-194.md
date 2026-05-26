---
"@univ-lehavre/atlas-crf-openapi": patch
"@univ-lehavre/atlas-citation-validate": patch
"@univ-lehavre/atlas-crf-core": patch
"@univ-lehavre/atlas-amarre": patch
"@univ-lehavre/atlas-ecrin": patch
"@univ-lehavre/atlas-crf-dashboard": patch
---

Triage complet des 39 alertes CodeQL ouvertes restantes après #194 : 13 fixes en code + 26 dismissals justifiés via gh API (état final attendu après re-scan : 0 alerte ouverte).

**Fixes code**

- `cli/crf-openapi/src/extractor/index.ts` : `execSync(`unzip … ${zipPath} …`)` → `execFileSync('unzip', [...])` (pas de shell, args en tableau). Ferme `js/shell-command-constructed-from-input` (erreur) + `js/shell-command-injection-from-environment`.
- `packages/citation-validate/src/store/{loader,saver}.test.ts` : remplace les paths tmp prévisibles (`join(tmpdir(), `…-${Date.now()}.json`)`) par `mkdtempSync(join(tmpdir(), 'atlas-…-'))`. Ferme 5 × `js/insecure-temporary-file`.
- `apps/amarre/scripts/manage-baselines.ts` : élimine la TOCTOU `existsSync` + `readFileSync` + `writeFileSync` au profit d'un `try { readFileSync } catch (ENOENT)`. Ferme `js/file-system-race`.
- `apps/crf-dashboard/src/routes/api/logs/+server.ts` : supprime la branche `(cache !== null && isCacheStale(cache))` déjà court-circuitée par le `|| cache === null` en amont. Ferme `js/comparison-between-incompatible-types`.
- Suppression dead code/imports inutilisés (4 × `js/unused-local-variable` note) :
  - `apps/ecrin/src/lib/transformers/build-name.ts` : helpers `getID`, `getECRcode` jamais exportés ni utilisés (+ import `ECR` orphelin).
  - `packages/citation-validate/src/events/updater-effect.test.ts` : helper `provideStores` défini mais les tests appellent `Effect.provideService` inline.
  - `packages/crf-core/src/validation/validation.test.ts` : imports `EMAIL_PATTERN`, `RECORD_ID_PATTERN`, `VERSION_PATTERN` (testés indirectement via leurs validators).

**Dismissals (gh API)**

- 9 × `js/polynomial-redos` dans `cli/crf-openapi/src/core/parsers/` (`won't fix`) : outil CLI offline parsant des sources REDCap upstream téléchargées manuellement ; input trusted, pas user-provided ; risque DoS limité à la machine de dev.
- 16 × `js/file-access-to-http` dans `sandbox/crf-sandbox/tests/`, `sandbox/amarre-sandbox/tests/e2e/` (`used in tests`) : code test/sandbox lisant un token de test depuis `.env.test` pour fetcher `localhost:8888` — pas de prod.
- 1 × `js/file-access-to-http` dans `packages/atlas-stats/src/github.ts` (`false positive`) : pattern d'auth GitHub API standard (URL hardcodée, seul l'`Authorization` header dérive d'un file).
