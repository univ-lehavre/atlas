# @univ-lehavre/atlas-validate-openalex

Interactive CLI for validating and assessing the reliability of OpenAlex bibliographic data. Guides a user through author search, affiliation selection, and publication curation using Effect.

## Installation

```bash
pnpm add @univ-lehavre/atlas-validate-openalex
```

## Usage

```bash
pnpm -F @univ-lehavre/atlas-validate-openalex start
```

The CLI prompts interactively to:
1. Search for an author by name
2. Select matching display name variants
3. Select relevant affiliations
4. Curate the final publication list

## Configuration

Requires a `.env` file:

```env
USER_AGENT=my-app/1.0
RATE_LIMIT={"limit":1,"interval":"1 seconds"}
API_URL=https://api.openalex.org
RESULTS_PER_PAGE=25
OPENALEX_API_KEY=          # optional
```

## API

This package is primarily a CLI. Its internals are exported for programmatic use:

### Fetch

| Export | Description |
|--------|-------------|
| `searchAuthorsByName(names, config)` | Search authors by name via `fetch-openalex` |
| `searchAuthorsByORCID(orcids, config)` | Search authors by ORCID |
| `searchWorksByAuthorIDs(ids, config)` | Fetch works by author IDs |
| `searchWorksByORCID(orcid, config)` | Fetch works by ORCID |
| `searchWorksByDOI(dois, config)` | Fetch works by DOI |

### Tools

| Export | Description |
|--------|-------------|
| `buildIntegrity(data)` | Generates a UUID v5 hash from JSON-stable-stringified data, scoped to the context namespace |
| `uniqueSorted<T>(values)` | Returns a deduplicated and sorted array |
