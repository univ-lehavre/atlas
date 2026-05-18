---
"@univ-lehavre/atlas-citation-types": major
"@univ-lehavre/atlas-citation-fetch": major
"@univ-lehavre/atlas-citation-validate": major
"@univ-lehavre/atlas-researcher-profiles": major
"@univ-lehavre/atlas-biblio-cli": patch
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Renommage du package `@univ-lehavre/atlas-openalex-types` en `@univ-lehavre/atlas-citation-types` pour retirer toute référence à une marque tierce dans les identifiants publics.

**Breaking changes — `@univ-lehavre/atlas-citation-types`**

- Le package npm s'appelle désormais `@univ-lehavre/atlas-citation-types`. L'ancien `@univ-lehavre/atlas-openalex-types` sera déprécié.
- Renommages d'exports :
  - `OpenAlexID` → `CitationID` (type brandé)
  - `asOpenAlexID` → `asCitationID` (constructeur brandé)
  - `OpenalexResponse` → `CitationResponse` (wrapper de réponse paginée)
  - `FetchOpenAlexAPIOptions` → `FetchCitationAPIOptions` (options de requête)
- Les URLs validées (`https://openalex.org/...`) et les messages d'erreur restent inchangés — la marque OpenAlex est mentionnée uniquement dans le texte descriptif (README, JSDoc, messages), jamais dans les identifiants.

**Migration côté consommateur**

```diff
- import { asOpenAlexID, type OpenAlexID } from '@univ-lehavre/atlas-openalex-types';
+ import { asCitationID, type CitationID } from '@univ-lehavre/atlas-citation-types';
```

**Consommateurs impactés**

- `@univ-lehavre/atlas-fetch-openalex`, `@univ-lehavre/atlas-validate-openalex`, `@univ-lehavre/atlas-researcher-profiles` : imports et identifiants dérivés (`get*OpenAlexID*` → `get*CitationID*`) mis à jour.
- `@univ-lehavre/atlas-biblio-cli`, `@univ-lehavre/atlas-researcher-profiles-cli` : imports mis à jour, surface CLI inchangée.
