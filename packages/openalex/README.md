# @univ-lehavre/atlas-openalex

Interactive CLI for OpenAlex data mining. Guides a researcher through author search, affiliation selection, and publication curation — backed by DuckDB, ML embeddings, and string similarity grouping.

## Usage

```bash
pnpm -F @univ-lehavre/atlas-openalex start
# or with a name argument
node --env-file .env dist/index.js --name "Dupont Jean"
```

The CLI:
1. Searches OpenAlex for authors matching the given name
2. Selects relevant display name variants
3. Filters by institution affiliation
4. Curates the final list of publications

## Configuration

Requires a `.env` file:

```env
OPENALEX_API_URL=https://api.openalex.org
PER_PAGE=25
OPENALEX_API_KEY=          # optional
```

## Internals

### `src/fetch/`

| Export | Description |
|--------|-------------|
| `searchAuthors(name)` | Searches OpenAlex authors by display name |
| `retrieve_articles(authorIds, institutionIds)` | Fetches articles for given authors and institutions |
| `retrieve_articles_given_work_ids(workIds)` | Fetches articles by OpenAlex work IDs |

### `src/group/`

String similarity utilities for grouping affiliation strings:

| Export | Description |
|--------|-------------|
| `groupBySimilarity(strings, threshold)` | Groups strings by Levenshtein similarity |
| `groupBySimilarityWithScore(strings, threshold)` | Same, with per-group similarity score |
| `groupByNGramSimilarity(strings, threshold)` | Groups strings by n-gram (bigram/trigram) Jaccard similarity |
| `normalizeString(input, options)` | Normalizes a string (diacritics, punctuation, case) |
