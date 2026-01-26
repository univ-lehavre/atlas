# @univ-lehavre/atlas-redcap

REDCap source analysis, OpenAPI spec extraction, and API documentation tools.

## Purpose

This package provides:

- **Extractor** - Parse REDCap PHP source to generate OpenAPI specs
- **Comparator** - Compare OpenAPI specs between versions
- **Server** - Serve API documentation with Swagger UI and Redoc
- **CLI** - Interactive command-line interface for all tools

## Structure

```
packages/redcap/
├── src/                    # Exportable module code
│   ├── extractor/          # PHP source → OpenAPI
│   ├── comparator/         # Spec comparison
│   ├── server/             # Documentation server
│   └── cli/                # Interactive CLI
├── specs/                  # Generated OpenAPI specs
│   └── versions/           # Specs by REDCap version
├── upstream/               # REDCap PHP source (gitignored)
│   └── versions/           # Multiple REDCap versions
└── dev/                    # Development environment
    ├── docker/             # Docker compose + config
    ├── scripts/            # Automation scripts
    └── tests/              # Contract & integration tests
```

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap
```

## CLI Usage

Interactive mode:

```bash
pnpm cli
# or after build:
npx redcap
```

Direct commands:

```bash
pnpm extract   # Extract OpenAPI spec from PHP source
pnpm compare   # Compare two spec versions
pnpm docs      # Start documentation server
```

## Programmatic Usage

```typescript
import { extract, compare, serve } from '@univ-lehavre/atlas-redcap';

// Extract OpenAPI spec from REDCap source
const result = extract({
  version: '14.5.10',
  sourcePath: './upstream/versions',
  outputPath: './specs/versions/redcap-14.5.10.yaml',
});

// Compare two spec versions
const diff = compare({
  oldSpecPath: './specs/versions/redcap-14.5.10.yaml',
  newSpecPath: './specs/versions/redcap-14.6.0.yaml',
  oldVersion: '14.5.10',
  newVersion: '14.6.0',
});

// Serve documentation
serve({
  specPath: './specs/versions/redcap-14.5.10.yaml',
  port: 3000,
});
```

## Exports

| Export       | Description                     |
| ------------ | ------------------------------- |
| `.`          | All modules                     |
| `./extractor`| OpenAPI extraction from PHP     |
| `./comparator`| Spec comparison utilities      |
| `./server`   | Documentation server            |

## Development

### Prerequisites

1. **REDCap source code** - Download from [REDCap Community](https://projectredcap.org/resources/community/)
2. **Docker** and **Docker Compose** (for testing)

### Setup REDCap Source

```bash
# Extract to versions directory
unzip redcap14.5.10.zip
mv redcap_v14.5.10 upstream/versions/14.5.10
```

### Commands

```bash
# CLI
pnpm cli         # Interactive CLI
pnpm extract     # Extract OpenAPI spec
pnpm compare     # Compare specs
pnpm docs        # Documentation server

# Docker (requires REDCap source)
pnpm docker:up       # Start REDCap instance
pnpm docker:down     # Stop services
pnpm docker:install  # Initialize database

# Testing (requires Docker)
pnpm test:api        # API smoke tests
pnpm test:contract   # Contract tests
pnpm test:security   # Security tests

# Development
pnpm build       # Build TypeScript
pnpm dev         # Watch mode
pnpm lint        # ESLint
pnpm format      # Prettier
```

### Docker Services

| Service    | URL                   | Credentials              |
| ---------- | --------------------- | ------------------------ |
| REDCap     | http://localhost:8888 | site_admin               |
| phpMyAdmin | http://localhost:8889 | redcap / redcap_password |
| Mailpit    | http://localhost:8025 | -                        |

## Extracted Information

The extractor parses multiple PHP sources:

| Source                       | Information                         |
| ---------------------------- | ----------------------------------- |
| `API/index.php`              | Content types, actions, routing     |
| `API/help.php`               | Parameters (required/optional)      |
| `API/<content>/<action>.php` | Validation, response formats        |
| `Classes/*.php`              | Data schemas                        |

### Example Output (v14.5.10)

- 35 content types
- 60 action implementations
- 57 documented endpoints
- 3 data schemas (ProjectInfo, UserRights, etc.)

## Multi-Version Support

```bash
# Extract different versions
REDCAP_VERSION=14.6.0 pnpm extract

# Compare versions
pnpm compare  # Interactive selection
```

## License

MIT

The REDCap source code is proprietary and is NOT included in this repository.
