# Sandbox

This directory contains the development, testing infrastructure and REDCap source code for validating the REDCap API extractor against real REDCap instances.

## Structure

```
sandbox/
├── docker/                 # Docker environment for REDCap
│   ├── docker-compose.yml  # Main compose file (MariaDB, PHP, Mailpit)
│   ├── config/             # PHP and database configuration
│   └── php/                # Custom PHP Dockerfile
├── scripts/                # Automation scripts
│   ├── install-redcap.sh   # Automated REDCap installation
│   ├── test-contract.sh    # Run contract tests
│   └── test-security.sh    # Run security/fuzzing tests
├── tests/                  # Integration tests
│   ├── contract/           # API contract tests (require Docker)
│   ├── fixtures/           # Test data and setup scripts
│   └── api-smoke.ts        # Quick API smoke tests
└── upstream/               # REDCap source code (gitignored)
    └── versions/           # Multiple REDCap versions
```

## Purpose

The development environment serves three main purposes:

1. **Validation** - Verify that extracted OpenAPI specs match actual REDCap behavior
2. **Contract Testing** - Ensure API responses conform to documented schemas
3. **Security Testing** - Fuzz testing with Schemathesis to find edge cases

## Quick Start

### 1. Start Docker Environment

```bash
# From packages/redcap directory
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

Versions are stored in `upstream/versions/<version>/`.

## Commands Reference

```bash
# Docker management
pnpm docker:up       # Start services
pnpm docker:down     # Stop services
pnpm docker:logs     # View logs
pnpm docker:reset    # Reset database (destroys data)
pnpm docker:install  # Automated installation

# Testing
pnpm test:setup      # Setup test fixtures
pnpm test:api        # Smoke tests (quick)
pnpm test:contract   # Contract tests (full)
pnpm test:security   # Security/fuzz tests
```

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
