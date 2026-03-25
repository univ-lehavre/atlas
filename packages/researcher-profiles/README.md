# @univ-lehavre/atlas-researcher-profiles

CLI for resolving researcher profiles via OpenAlex and writing results to REDCap.

For each researcher, the CLI:
1. Searches OpenAlex by name (with and without middle name) and by ORCID
2. Displays author profiles and a sample of works found
3. Asks for confirmation before writing to REDCap
4. Writes the deduplicated works list as JSON to the `oa_references` field

## Prerequisites

| Variable | Description |
|---|---|
| `REDCAP_URL` | REDCap API URL (e.g. `https://redcap.example.com/api/`) |
| `REDCAP_TOKEN` | REDCap API token |
| `OPENALEX_USER_AGENT` | OpenAlex user agent (e.g. `mailto:contact@example.com`) |

## Commands

### `from-csv <file>`

Reads researchers from a CSV file, resolves their OpenAlex works, and writes results to REDCap.

**CSV format** — required columns: `userid`, `last_name`, `middle_name`, `first_name`, `orcid`

```csv
userid,last_name,middle_name,first_name,orcid
u001,Dupont,,Jean,0000-0001-2345-6789
u002,Martin,Louis,Pierre,
```

```bash
REDCAP_URL=https://redcap.example.com/api/ \
REDCAP_TOKEN=XXXX \
OPENALEX_USER_AGENT="mailto:contact@example.com" \
atlas-researcher-profiles from-csv researchers.csv
```

### `from-redcap`

Fetches researchers directly from the REDCap instrument `references_openalex`, then resolves and writes their works back to the same instrument.

```bash
REDCAP_URL=https://redcap.example.com/api/ \
REDCAP_TOKEN=XXXX \
OPENALEX_USER_AGENT="mailto:contact@example.com" \
atlas-researcher-profiles from-redcap
```

## REDCap instrument

The CLI reads from and writes to the `references_openalex` instrument.

| Field | Role |
|---|---|
| `record_id` (= `userid`) | Primary key |
| `last_name`, `middle_name`, `first_name` | Used to build search queries |
| `orcid` | Used as a complementary search criterion |
| `oa_references` | **Written by the CLI** — JSON array of `WorksResult[]` |

## Library API

The package also exports its core services for programmatic use:

```typescript
import {
  parseCsv,
  resolveAll,
  fetchResearchers,
  writeOaReferences,
} from '@univ-lehavre/atlas-researcher-profiles';
import type {
  ResearcherRow,
  OaReferencesRecord,
  RedcapConnectionConfig,
} from '@univ-lehavre/atlas-researcher-profiles';
```
