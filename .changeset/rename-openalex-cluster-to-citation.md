---
"@univ-lehavre/atlas-citation": major
"@univ-lehavre/atlas-citation-cli": major
"@univ-lehavre/atlas-citation-fetch": major
"@univ-lehavre/atlas-citation-validate": major
"@univ-lehavre/atlas-researcher-profiles": major
"@univ-lehavre/atlas-find-an-expert": major
"@univ-lehavre/atlas-biblio-cli": patch
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Renommage du cluster OpenAlex en cluster `citation` pour retirer la marque OpenAlex des identifiants publics du monorepo (suite de la migration commencée avec `citation-types`).

**Packages renommés**

| Avant (npm)                                  | Après (npm)                                  |
| -------------------------------------------- | -------------------------------------------- |
| `@univ-lehavre/atlas-fetch-openalex`         | `@univ-lehavre/atlas-citation-fetch`         |
| `@univ-lehavre/atlas-openalex`               | `@univ-lehavre/atlas-citation`               |
| `@univ-lehavre/atlas-validate-openalex`      | `@univ-lehavre/atlas-citation-validate`      |
| `@univ-lehavre/atlas-openalex-cli`           | `@univ-lehavre/atlas-citation-cli`           |

Les anciens packages npm seront dépréciés vers les nouveaux noms.

**Bin renommé**

- `atlas-openalex` → `atlas-citation` (dans `@univ-lehavre/atlas-citation-cli`)

**Identifiants publics renommés**

- Types : `OpenAlexConfig` → `CitationConfig`, `OpenalexResponse` → `CitationResponse`, `OpenalexSearchAuthorAffiliationResult` → `CitationSearchAuthorAffiliationResult`
- Erreurs : `OpenAlexSearchError` (exporté par `@univ-lehavre/atlas-researcher-profiles`) → `CitationSearchError`
- Champs : `openalex_api_url` → `citation_api_url`, `openalex_api_key` → `citation_api_key`
- Fichiers : `fetch-openalex.ts`, `fetch-openalex-entities.ts`, `types/openalex.ts` → `fetch-citation.ts`, `fetch-citation-entities.ts`, `types/citation.ts`
- Apps : `apps/find-an-expert/src/lib/server/openalex/` → `apps/find-an-expert/src/lib/server/citation/`

**Conservé (texte descriptif uniquement)**

- URLs d'API (`https://openalex.org/...`) — réelle adresse d'API tierce
- Messages d'erreur et JSDoc mentionnant "OpenAlex" — texte explicatif
- Variables d'environnement `OPENALEX_*` — convention imposée par le service tiers

**Migration côté consommateur**

```diff
- import { type OpenAlexConfig } from '@univ-lehavre/atlas-fetch-openalex';
+ import { type CitationConfig } from '@univ-lehavre/atlas-citation-fetch';
```

```diff
- import { type OpenalexSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-openalex';
+ import { type CitationSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-citation';
```

**Note sur `@univ-lehavre/atlas-find-an-expert`** : l'app n'est pas publiée sur npm, mais reçoit un bump major car ses imports et la structure de ses dossiers `lib/server/citation/` changent — utile pour le suivi changelog interne.
