# REDCap Docker Development Environment

This directory contains Docker configuration for running a local REDCap instance.

## Prerequisites

1. **Docker** and **Docker Compose** installed
2. **REDCap source code** (version 14.5.10) placed in `../redcap-source/`

## Quick Start

### 1. Prepare REDCap Source

Download REDCap from [REDCap Community](https://projectredcap.org/resources/community/) and extract it:

```bash
# From packages/redcap directory
cd redcap-source
# Extract redcap_v14.5.10.zip here
# Structure should be: redcap-source/redcap_v14.5.10/...
```

### 2. Configure Database Connection

```bash
# Copy the template database config
cp docker/database.php redcap-source/database.php
```

### 3. Create edocs Directory

```bash
mkdir -p redcap-source/edocs
chmod 777 redcap-source/edocs
```

### 4. Start Services

```bash
# From packages/redcap directory
docker compose up -d

# Watch logs
docker compose logs -f
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

To import the REDCap schema:

```bash
# Via phpMyAdmin (http://localhost:8081)
# 1. Select 'redcap' database
# 2. Import > Choose file: redcap-source/redcap_v14.5.10/Resources/sql/install.sql

# Or via CLI
docker compose exec -T db mysql -u redcap -predcap_password redcap < redcap-source/redcap_v14.5.10/Resources/sql/install.sql
```

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
chmod -R 777 redcap-source/edocs
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
