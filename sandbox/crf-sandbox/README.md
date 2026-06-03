# REDCap Sandbox

Sandbox Docker et tests d'intégration pour valider REDCap avec Atlas.

Ce workspace fournit un environnement REDCap isolé, des scripts d'installation, des tests de contrat, des tests de sécurité et des smoke tests API. Il sert à confronter les spécifications OpenAPI et clients Atlas à une instance REDCap réelle ou locale.

## Structure

```
redcap-sandbox/
├── docker/                 # Docker environment for REDCap
│   ├── docker-compose.yml  # Main compose file (MySQL, PHP, phpMyAdmin)
│   ├── config/             # PHP and database configuration
│   └── init.sql            # Database initialization
├── scripts/                # Automation scripts
│   ├── install-crf.sh   # Automated REDCap installation
│   ├── test-contract.sh    # Run contract tests
│   └── test-security.sh    # Run security/fuzzing tests
├── tests/                  # Integration tests
│   ├── contract/           # Generic REDCap API contract tests (require Docker)
│   ├── contract-amarre/    # Amarre-specific contract tests (run pnpm test:contract:amarre)
│   ├── fixtures/           # Test data and setup scripts
│   │   ├── redcap-admin.ts # API-only helpers : mint super-token, create project, import dictionary
│   │   └── setup-test-projects.ts # Provisions tokens + amarre project via API
│   └── api-smoke.ts        # Quick API smoke tests
├── docker-compose.yaml     # Main compose file
└── vitest.config.ts        # Vitest configuration
```

REDCap source code is located in the sibling package `redcap-openapi/upstream/`.

## Purpose

The development environment serves three main purposes:

1. **Validation** - Verify that extracted OpenAPI specs match actual REDCap behavior
2. **Contract Testing** - Ensure API responses conform to documented schemas
3. **Security Testing** - Fuzz testing with Schemathesis to find edge cases

## Quick Start

### 1. Start Docker Environment

```bash
# From packages/redcap-sandbox directory
pnpm docker:up
```

This starts:

- **REDCap** at http://localhost:8888
- **phpMyAdmin** at http://localhost:8889
- **Mailpit** at http://localhost:8025

### 2. Install REDCap Database

```bash
pnpm docker:install
```

This script:

1. Submits the REDCap install form
2. Extracts and executes the SQL schema
3. Creates an API token for testing
4. Saves config to `docker/config/.env.test`

### 3. Run Tests

```bash
# Quick API smoke test
pnpm test:api

# Full contract tests (26 tests)
pnpm test:contract

# Security/fuzzing tests
pnpm test:security
```

## Docker Services

| Service    | URL                   | Credentials              |
| ---------- | --------------------- | ------------------------ |
| REDCap     | http://localhost:8888 | site_admin               |
| phpMyAdmin | http://localhost:8889 | redcap / redcap_password |
| Mailpit    | http://localhost:8025 | -                        |
| MariaDB    | localhost:3306        | redcap / redcap_password |

## Multi-Version Testing

The Docker environment supports multiple REDCap versions:

```bash
# Start with specific version
REDCAP_VERSION=14.6.0 pnpm docker:up

# Extract spec for that version
REDCAP_VERSION=14.6.0 pnpm extract
```

Versions are stored in `../redcap-openapi/upstream/versions/<version>/`.

## Commands Reference

```bash
# Docker management
pnpm docker:up       # Start services
pnpm docker:down     # Stop services
pnpm docker:logs     # View logs
pnpm docker:reset    # Reset database (destroys data)
pnpm docker:install  # Automated installation

# Testing
pnpm test:setup            # Setup test fixtures + provision amarre project (API-only)
pnpm test:api              # Smoke tests (quick)
pnpm test:contract         # Contract tests (full — generic REDCap + amarre)
pnpm test:contract:amarre  # Contract tests scoped to the amarre project only
pnpm test:security         # Security/fuzz tests
```

## Amarre contract tests

The `tests/contract-amarre/` suite exercises the REDCap endpoints used by [`apps/amarre`](https://github.com/univ-lehavre/atlas/tree/main/apps/amarre). It targets a dedicated `amarre` project provisioned by `pnpm test:setup` :

1. Mint a super-API token for `site_admin` via the Control Center AJAX endpoint (auth=none gives super-user access by default on the sandbox).
2. `POST /api/?content=project&action=import` with the super-token to create a fresh project.
3. `POST /api/?content=metadata&action=import` with the project's regular token to load [`data-dictionaries/127-amarre-v1.json`](https://github.com/univ-lehavre/atlas/blob/main/data-dictionaries/127-amarre-v1.json).

No SQL is executed (this is a project policy — REDCap is touched exclusively through its HTTP API, web endpoints included). The helpers live in [`tests/fixtures/redcap-admin.ts`](https://github.com/univ-lehavre/atlas/blob/main/sandbox/crf-sandbox/tests/fixtures/redcap-admin.ts) and are idempotent across runs: a cached token in `.env.test` is reused if it still resolves to a project titled `amarre`.

## Test Fixtures

The `tests/fixtures/` directory contains:

- `projects.json` - Test project configurations
- `setup-test-projects.ts` - Script to create test projects via API

### Test Projects

| Project               | Type         | Features          |
| --------------------- | ------------ | ----------------- |
| Classic Database      | Classic      | Basic data entry  |
| Longitudinal (1 arm)  | Longitudinal | 8 events          |
| Basic Demography      | Classic      | Single form       |
| Repeating Instruments | Classic      | 4 repeating forms |

## Contract Tests

The contract tests validate:

- Version endpoint returns valid version string
- Project info matches expected schema
- Metadata export returns field definitions
- Record export with filters works correctly
- Event endpoint handles longitudinal vs classic
- Error responses follow expected format
- Response formats (JSON, CSV, XML) work

## Troubleshooting

### Container not starting

```bash
# Check logs
pnpm docker:logs

# Reset and restart
pnpm docker:reset
```

### API token not working

```bash
# Regenerate token
pnpm docker:install
```

### Tests failing

Ensure REDCap is running and initialized:

```bash
curl -X POST http://localhost:8888/api/ \
  -d "token=$(cat sandbox/docker/config/.env.test | grep TOKEN | cut -d= -f2)" \
  -d "content=version"
```
