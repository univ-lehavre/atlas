# @univ-lehavre/atlas-citation

Bibliothèque de curation OpenAlex pour recherche d'auteurs et récupération de publications.

Le package expose la recherche d'auteurs, la récupération d'articles par auteur ou par identifiants de travaux, la lecture de configuration d'environnement et les erreurs métier associées. Il sert de couche fonctionnelle au CLI OpenAlex qui guide la sélection des formes de nom, affiliations et publications.

## Usage

```typescript
import { Effect } from "effect";
import {
  searchAuthors,
  retrieve_articles,
  retrieve_articles_given_work_ids,
} from "@univ-lehavre/atlas-citation";

const authors = await Effect.runPromise(searchAuthors("Dupont Jean"));
const works = await Effect.runPromise(
  retrieve_articles(
    ["https://openalex.org/A123456789"],
    ["https://openalex.org/I4210166736"],
  ),
);
```

Pour un usage interactif en terminal, voir `@univ-lehavre/atlas-citation-cli` dans `cli/citation`.

## Configuration

Requires a `.env` file:

```env
OPENALEX_API_URL=https://api.openalex.org
PER_PAGE=25
OPENALEX_API_KEY=          # optional
```

## Internals

### `src/fetch/`

| Export                                         | Description                                         |
| ---------------------------------------------- | --------------------------------------------------- |
| `searchAuthors(name)`                          | Searches OpenAlex authors by display name           |
| `retrieve_articles(authorIds, institutionIds)` | Fetches articles for given authors and institutions |
| `retrieve_articles_given_work_ids(workIds)`    | Fetches articles by OpenAlex work IDs               |

### `src/group/`

Utilitaires internes de similarité pour regrouper des chaînes d'affiliation:

| Export                                           | Description                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `groupBySimilarity(strings, threshold)`          | Groups strings by Levenshtein similarity                     |
| `groupBySimilarityWithScore(strings, threshold)` | Same, with per-group similarity score                        |
| `groupByNGramSimilarity(strings, threshold)`     | Groups strings by n-gram (bigram/trigram) Jaccard similarity |
| `normalizeString(input, options)`                | Normalizes a string (diacritics, punctuation, case)          |
