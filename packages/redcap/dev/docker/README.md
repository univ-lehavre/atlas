# REDCap Docker Development Environment

This directory contains Docker configuration for running a local REDCap instance.

## Prerequisites

1. **Docker** and **Docker Compose** installed
2. **REDCap source code** placed in `../../upstream/versions/`

## Quick Start

### 1. Prepare REDCap Source

Download REDCap from [REDCap Community](https://projectredcap.org/resources/community/) and extract it:

```bash
# From packages/redcap directory
cd upstream/versions
# Extract and rename
unzip redcap14.5.10.zip
mv redcap_v14.5.10 14.5.10
```

### 2. Start Services

```bash
# From packages/redcap directory
pnpm docker:up

# Watch logs
pnpm docker:logs
```

### 5. Install REDCap

1. Open http://localhost:8080/install.php
2. Follow the installation wizard
3. Import the database schema from `Resources/sql/install.sql`

## Services

| Service    | URL                   | Description         |
| ---------- | --------------------- | ------------------- |
| REDCap     | http://localhost:8080 | Main application    |
| phpMyAdmin | http://localhost:8081 | Database management |
| MySQL      | localhost:3306        | Database server     |

## Credentials

| Component  | Username | Password             |
| ---------- | -------- | -------------------- |
| MySQL root | root     | redcap_root_password |
| MySQL user | redcap   | redcap_password      |
| phpMyAdmin | root     | redcap_root_password |

## Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v

# View logs
docker compose logs -f redcap
docker compose logs -f db

# Access MySQL CLI
docker compose exec db mysql -u redcap -predcap_password redcap

# Access PHP container
docker compose exec redcap bash
```

## Database Import

Use the automated install script:

```bash
pnpm docker:install
```

Or manually via phpMyAdmin (http://localhost:8889).

## Troubleshooting

### PHP Extensions Missing

If you see errors about missing extensions, rebuild the container:

```bash
docker compose build --no-cache redcap
docker compose up -d
```

### Permission Issues

```bash
# Fix edocs permissions
chmod -R 777 ../../upstream/shared/edocs
```

### Database Connection Failed

Check that the database container is healthy:

```bash
docker compose ps
docker compose logs db
```

## Production Notes

For production deployments:

1. Change all passwords in `docker-compose.yaml`
2. Generate a new salt in `database.php`
3. Set `display_errors = Off` in `php.ini`
4. Use HTTPS with proper certificates
5. Configure proper backup strategy
