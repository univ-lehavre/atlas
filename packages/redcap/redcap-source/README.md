# REDCap Source Code

This directory contains REDCap source code installations. Multiple versions can coexist.

**This code is proprietary and should NOT be committed to git.**

## Directory Structure

```
redcap-source/
├── versions/               # REDCap installations by version
│   ├── 14.5.10/           # Default version
│   │   ├── api/
│   │   ├── database.php
│   │   ├── index.php
│   │   ├── install.php
│   │   └── redcap_v14.5.10/  # Core PHP code
│   ├── 14.6.x/            # Add other versions here
│   └── 15.x.x/
├── shared/                 # Data shared across versions
│   └── edocs/             # Uploaded documents
├── .gitignore
└── README.md
```

## Installation

### Installing a new version

1. Download REDCap from the [REDCap Community](https://projectredcap.org/resources/community/)
2. Extract the archive
3. Move the extracted directory to `versions/<version>/`

```bash
# Example for version 14.6.0
unzip redcap14.6.0.zip
mv redcap_v14.6.0 redcap-source/versions/14.6.0
```

### Expected structure inside each version

```
versions/14.5.10/
├── api/                    # API endpoint wrapper
│   └── index.php
├── redcap_v14.5.10/       # Core code (version-specific name)
│   ├── API/               # API implementation
│   ├── Classes/           # PHP classes
│   ├── Config/
│   ├── Controllers/
│   ├── Languages/
│   ├── Libraries/
│   └── Resources/
├── database.php           # Database config template
├── index.php              # Main entry point
├── install.php            # Installation wizard
├── cron.php
├── hooks/
├── languages/
├── modules/
├── plugins/
├── surveys/
├── temp/
└── webtools2/
```

## Switching Versions

### Using environment variable

```bash
# Start with default version (14.5.10)
pnpm docker:up

# Start with specific version
REDCAP_VERSION=14.6.0 pnpm docker:up

# Or export for the session
export REDCAP_VERSION=14.6.0
pnpm docker:up
```

### Using .env file

Create `docker/.env`:

```bash
REDCAP_VERSION=14.5.10
```

## Key Files for API Analysis

The analyzer (`pnpm analyze`) extracts API information from:

| File                                   | Information             |
| -------------------------------------- | ----------------------- |
| `redcap_v*/API/index.php`              | Content types, routing  |
| `redcap_v*/API/help.php`               | Parameter documentation |
| `redcap_v*/API/<content>/<action>.php` | Validation, responses   |
| `redcap_v*/Classes/*.php`              | Data schemas            |

## Supported Versions

| Version | Status  | Notes           |
| ------- | ------- | --------------- |
| 14.5.10 | Active  | Default version |
| 14.6.x  | Planned | -               |
| 15.x.x  | Planned | -               |

## Database Compatibility

Each REDCap version may require database migrations. When switching versions:

1. **Upgrading**: REDCap handles migrations automatically
2. **Downgrading**: Not recommended (may cause data loss)
3. **Fresh install**: Use `pnpm docker:reset` to start clean
