# @univ-lehavre/atlas-citation-validate

Moteur de workflow pour valider et fiabiliser des données bibliographiques OpenAlex.

Ce package modélise les actions interactives de validation d'un auteur: contexte ORCID, événements, métriques, statuts globaux, sélection d'identifiants auteurs, variantes de noms, affiliations et publications. Il fournit les stores, prompts, actions et helpers utilisés par `atlas-biblio`.

## Installation

```bash
pnpm add @univ-lehavre/atlas-citation-validate
```

## Usage

```typescript
import {
  loadStores,
  active_actions,
  action2option,
  getEvents,
} from "@univ-lehavre/atlas-citation-validate";
```

Le package expose les briques de workflow utilisées par le CLI `atlas-biblio`: stores, contexte auteur, événements, actions de validation, prompts et helpers de statut.

## Configuration

Requires a `.env` file:

```ini
USER_AGENT=my-app/1.0
RATE_LIMIT={"limit":1,"interval":"1 seconds"}
API_URL=https://api.openalex.org
RESULTS_PER_PAGE=25
OPENALEX_API_KEY=          # optional
```

## API

Ce package est une bibliothèque de workflow. Ses modules sont exportés pour être assemblés par un CLI ou par d'autres outils:

### Fetch

| Export                                 | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| `searchAuthorsByName(names, config)`   | Search authors by name via `fetch-openalex` |
| `searchAuthorsByORCID(orcids, config)` | Search authors by ORCID                     |
| `searchWorksByAuthorIDs(ids, config)`  | Fetch works by author IDs                   |
| `searchWorksByORCID(orcid, config)`    | Fetch works by ORCID                        |
| `searchWorksByDOI(dois, config)`       | Fetch works by DOI                          |

### Tools

| Export                    | Description                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `buildIntegrity(data)`    | Generates a UUID v5 hash from JSON-stable-stringified data, scoped to the context namespace |
| `uniqueSorted<T>(values)` | Returns a deduplicated and sorted array                                                     |
