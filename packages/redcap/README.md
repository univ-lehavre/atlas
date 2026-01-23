# @univ-lehavre/atlas-redcap

REDCap source analysis, Docker environment, and API contract testing.

## Purpose

This package provides:

- **Docker environment** for running a local REDCap instance
- **API analyzer** to extract OpenAPI spec from REDCap PHP source
- **Contract tests** to validate spec against real REDCap responses
- **Security tests** with Schemathesis fuzzing
- **Multi-version support** for testing against different REDCap versions

## Structure

```
packages/redcap/
├── redcap-source/              # REDCap PHP code (not committed)
│   ├── versions/               # Multiple REDCap versions
│   │   ├── 14.5.10/           # Default version
│   │   └── ...                # Add more versions here
│   └── shared/                # Data shared across versions
│       └── edocs/             # Uploaded documents
├── docker/
│   ├── docker-compose.yml     # REDCap + MariaDB + phpMyAdmin
│   ├── php/Dockerfile         # PHP 8.2 + extensions
│   └── config/                # Configuration files
├── analyzer/
│   ├── extract-api.ts         # Parse PHP → OpenAPI
│   └── compare-spec.ts        # Compare with CRF spec
├── specs/
│   └── redcap-extracted.yaml  # Generated OpenAPI spec
├── tests/
│   ├── contract/              # Contract tests
│   ├── fixtures/              # Test project setup
│   └── api-smoke.ts           # Smoke tests
└── scripts/
    └── install-redcap.sh      # Automated installation
```

## Prerequisites

1. **REDCap source code** - Download from [REDCap Community](https://projectredcap.org/resources/community/)
2. **Docker** and **Docker Compose**
3. **pnpm** (for running scripts)

## Setup

### 1. Install REDCap source

Extract REDCap to the versions directory:

```bash
# Extract REDCap archive
unzip redcap14.5.10.zip

# Move to versions directory
mv redcap_v14.5.10 redcap-source/versions/14.5.10
```

### 2. Start Docker environment

```bash
# Start with default version (14.5.10)
pnpm docker:up

# Or start with a specific version
REDCAP_VERSION=14.6.0 pnpm docker:up
```

This starts:

- **REDCap** at http://localhost:8888
- **phpMyAdmin** at http://localhost:8889
- **Mailpit** at http://localhost:8025

### 3. Initialize REDCap database

#### Option A: Automated installation (recommended)

```bash
pnpm docker:install
```

This script:

1. Submits the REDCap install form
2. Extracts and executes the SQL schema (~7000 lines)
3. Creates an API token for `site_admin` on project 1
4. Saves config to `docker/config/.env.test`

#### Option B: Manual steps

<details>
<summary>Click to expand manual installation steps</summary>

```bash
# 1. Submit install form and extract SQL
curl -s -X POST http://localhost:8888/install.php \
  -d "redcap_base_url=http://localhost:8888/" \
  -d "institution=Atlas Dev" \
  -d "site_org_type=SiteOrgType Academic/University" \
  -d "language_global=English" \
  -d "project_encoding=UTF-8" \
  -d "auth_meth_global=none" \
  -d "auto_report_stats=1" \
  -d "superusers_only_create_project=0" \
  -d "superusers_only_move_to_prod=1" \
  -d "enable_url_shortener=1" > /tmp/redcap_install.html

# 2. Extract SQL from response
START_LINE=$(grep -n "textarea id='install-sql'" /tmp/redcap_install.html | head -1 | cut -d: -f1)
sed -n "$((START_LINE + 1)),\$p" /tmp/redcap_install.html | sed '/<\/textarea>/,$d' > /tmp/redcap_install.sql

# 3. Execute SQL in MariaDB
docker exec -i docker-mariadb-1 mariadb -u redcap -predcap_password redcap < /tmp/redcap_install.sql

# 4. Generate API token for site_admin on project 1
TOKEN=$(openssl rand -hex 16 | tr 'a-f' 'A-F')
docker exec docker-mariadb-1 mariadb -u redcap -predcap_password redcap -e "
INSERT INTO redcap_user_rights (project_id, username, api_token, api_export, api_import, data_export_tool, data_import_tool, data_logging, user_rights, design, alerts, graphical, data_quality_design)
VALUES (1, 'site_admin', '\$TOKEN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE api_token='\$TOKEN', api_export=1, api_import=1;"

echo "API Token: $TOKEN"
```

</details>

#### Option C: Wizard installation

Follow REDCap installation wizard at http://localhost:8888

### 4. Test API access

```bash
# Test version endpoint
curl -X POST http://localhost:8888/api/ \
  -d "token=YOUR_API_TOKEN" \
  -d "content=version"

# Test project info
curl -X POST http://localhost:8888/api/ \
  -d "token=YOUR_API_TOKEN" \
  -d "content=project" \
  -d "format=json"
```

## Commands

```bash
# Docker management
pnpm docker:up       # Start services (default version)
pnpm docker:down     # Stop services
pnpm docker:logs     # View logs
pnpm docker:reset    # Reset database (destroys data)
pnpm docker:install  # Automated installation + API token

# Multi-version support
REDCAP_VERSION=14.6.0 pnpm docker:up    # Start specific version
REDCAP_VERSION=14.6.0 pnpm analyze      # Analyze specific version

# Analysis
pnpm analyze         # Extract OpenAPI from PHP source
pnpm compare         # Compare extracted vs CRF spec

# Testing
pnpm test:setup      # Setup test fixtures (tokens + data)
pnpm test:api        # Run API smoke tests (10 endpoints)
pnpm test:contract   # Run contract tests (26 tests)
pnpm test:security   # Run Schemathesis security tests
```

## Multi-Version Support

### Available versions

| Version | Status  | Directory                         |
| ------- | ------- | --------------------------------- |
| 14.5.10 | Default | `redcap-source/versions/14.5.10/` |
| 14.6.x  | Planned | `redcap-source/versions/14.6.x/`  |
| 15.x.x  | Planned | `redcap-source/versions/15.x.x/`  |

### Adding a new version

```bash
# 1. Download and extract
unzip redcap14.6.0.zip

# 2. Move to versions directory
mv redcap_v14.6.0 redcap-source/versions/14.6.0

# 3. Start with new version
REDCAP_VERSION=14.6.0 pnpm docker:up

# 4. Install database schema
pnpm docker:install

# 5. Analyze API
REDCAP_VERSION=14.6.0 pnpm analyze
```

### Switching versions

```bash
# Stop current version
pnpm docker:down

# Start with different version (preserves database)
REDCAP_VERSION=14.6.0 pnpm docker:up

# Or reset for clean install
pnpm docker:reset
REDCAP_VERSION=14.6.0 pnpm docker:up
pnpm docker:install
```

## Workflow

```
┌─────────────────┐
│ REDCap PHP Code │
└────────┬────────┘
         │ pnpm analyze
         ▼
┌─────────────────────────┐
│ specs/redcap-extracted  │
└────────┬────────────────┘
         │ pnpm compare
         ▼
┌─────────────────────────┐     ┌─────────────────┐
│ Discrepancy Report      │────►│ Fix CRF spec    │
└─────────────────────────┘     └─────────────────┘
         │
         │ pnpm test:contract
         ▼
┌─────────────────────────┐
│ Validate against Docker │
└─────────────────────────┘
```

## Generated OpenAPI Spec

The analyzer extracts API information from multiple PHP sources:

| Source                       | Information extracted                         |
| ---------------------------- | --------------------------------------------- |
| `API/index.php`              | Content types, actions, routing logic         |
| `API/help.php`               | Documentation, parameters (required/optional) |
| `API/<content>/<action>.php` | Validation logic, response formats            |
| `Classes/*.php`              | Data schemas (Project, UserRights, etc.)      |
| `API/examples/curl/*.sh`     | Example API calls                             |

### Extracted endpoints (v14.5.10)

- **35 content types** (record, metadata, file, etc.)
- **60 action implementations** (export, import, delete, etc.)
- **57 documented endpoints** with parameters
- **3 data schemas** (ProjectInfo, ProjectSettingsImport, UserRights)

### Spec validation

```bash
# Validate OpenAPI syntax
pnpm spectral lint specs/redcap-extracted.yaml

# Preview documentation
pnpm redocly preview-docs specs/redcap-extracted.yaml
```

## Docker Services

| Service    | URL                   | Credentials              |
| ---------- | --------------------- | ------------------------ |
| REDCap     | http://localhost:8888 | site_admin               |
| phpMyAdmin | http://localhost:8889 | redcap / redcap_password |
| Mailpit    | http://localhost:8025 | -                        |
| MariaDB    | localhost:3306        | redcap / redcap_password |

## Test Fixtures

The test setup creates fixtures for 4 project types:

| Project               | Type         | Forms | Records | Features          |
| --------------------- | ------------ | ----- | ------- | ----------------- |
| Classic Database      | Classic      | 6     | 3       | Basic data entry  |
| Longitudinal (1 arm)  | Longitudinal | 8     | 2       | 8 events          |
| Basic Demography      | Classic      | 1     | 2       | Single form       |
| Repeating Instruments | Classic      | 5     | 3       | 4 repeating forms |

### Contract Tests (26 tests)

- **Version endpoint** - Returns version string
- **Project endpoint** - Returns project info, correct project_id
- **Metadata endpoint** - Field definitions, structure validation
- **Instrument endpoint** - Instrument list, structure
- **Record endpoint** - Record export, filtering, rawOrLabel
- **Export Field Names** - Field name mappings
- **Event endpoint** - Events for longitudinal, error for classic
- **Repeating Forms** - Configuration validation
- **User endpoint** - User list, site_admin presence
- **DAG endpoint** - Data access groups
- **Error handling** - Invalid token, invalid content type
- **Response formats** - JSON, CSV, XML support

## License

The REDCap source code is proprietary and is NOT included in this repository.
Only the analysis tools and Docker configuration are versioned.
