# @univ-lehavre/atlas-citation-types

Types TypeScript partagés pour les réponses et identifiants du graphe de citations OpenAlex.

Ce package définit les types de réponses OpenAlex utilisés dans Atlas, les paramètres d'appel API et les types brandés `ORCID` et `CitationID` avec helpers de conversion. Il évite de dupliquer les contrats OpenAlex entre clients, CLI et services de validation.

## Installation

```bash
pnpm add @univ-lehavre/atlas-citation-types
```

## Usage

```typescript
import { asORCID, asCitationID, type ORCID, type CitationID } from '@univ-lehavre/atlas-citation-types';

const orcid: ORCID = asORCID('https://orcid.org/0000-0001-2345-6789');
const id: CitationID = asCitationID('https://openalex.org/A123456789');
```

## API

### Branded types

| Export | Description |
|--------|-------------|
| `ORCID` | Branded `string` for ORCID identifiers |
| `CitationID` | Branded `string` for OpenAlex citation identifiers |
| `asORCID(value)` | Casts a string to `ORCID` |
| `asCitationID(value)` | Casts a string to `CitationID` |

### API response types

| Export | Description |
|--------|-------------|
| `AuthorsResult` | Single author result from `/authors` |
| `AffiliationsResult` | Author affiliation entry |
| `WorksResult` | Single work result from `/works` |
| `IInstitution` | Institution object |
| `AuthorshipInstitution` | Institution within an authorship |
| `CitationResponse<T>` | Paginated API response wrapper |
| `RateLimitInfo` | Rate-limit headers parsed from responses |

### API parameter types

| Export | Description |
|--------|-------------|
| `FetchCitationAPIOptions` | Query parameters for OpenAlex API requests (includes `api_key`, `search`, `filter`, `sort`, etc.) |
