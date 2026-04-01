#!/bin/bash
# REDCap Automated Installation Script
# Installs REDCap database schema and creates an API token for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$DEV_DIR/docker/config"

echo "=== REDCap Automated Installation ==="
echo ""

# Check if Docker containers are running
if ! docker ps --format '{{.Names}}' | grep -q "docker-mariadb-1"; then
    echo "Error: MariaDB container not running. Start with: pnpm docker:up"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "docker-redcap-1"; then
    echo "Error: REDCap container not running. Start with: pnpm docker:up"
    exit 1
fi

# Wait for REDCap to be healthy
echo "Waiting for REDCap to be ready..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/ | grep -q "200"; then
        break
    fi
    sleep 2
done

# Check if already installed
TABLES=$(docker exec docker-mariadb-1 mariadb -u redcap -predcap_password redcap -N -e "SHOW TABLES LIKE 'redcap_config'" 2>/dev/null || echo "")
if [ -n "$TABLES" ]; then
    echo "REDCap database already initialized."
    echo ""
else
    echo "Step 1: Submitting install form..."
    curl -s -X POST http://localhost:8888/install.php \
      -d "redcap_base_url=http://localhost:8888/" \
      -d "institution=Atlas Dev" \
      -d "site_org_type=SiteOrgType Academic/University" \
      -d "grant_cite=" \
      -d "headerlogo=" \
      -d "language_global=English" \
      -d "project_encoding=UTF-8" \
      -d "auth_meth_global=none" \
      -d "auto_report_stats=1" \
      -d "bioportal_api_token=" \
      -d "hook_functions_file=" \
      -d "superusers_only_create_project=0" \
      -d "superusers_only_move_to_prod=1" \
      -d "enable_url_shortener=1" > /tmp/redcap_install.html

    echo "Step 2: Extracting SQL from install response..."
    # Find textarea start and end
    START_LINE=$(grep -n "textarea id='install-sql'" /tmp/redcap_install.html | head -1 | cut -d: -f1)
    if [ -z "$START_LINE" ]; then
        echo "Error: Could not find install SQL in response"
        exit 1
    fi

    # Extract SQL (skip first line with textarea tag, stop at </textarea>)
    sed -n "$((START_LINE + 1)),\$p" /tmp/redcap_install.html | sed '/<\/textarea>/,$d' > /tmp/redcap_install.sql

    SQL_LINES=$(wc -l < /tmp/redcap_install.sql)
    echo "   Extracted $SQL_LINES lines of SQL"

    echo "Step 3: Executing SQL in MariaDB..."
    docker exec -i docker-mariadb-1 mariadb -u redcap -predcap_password redcap < /tmp/redcap_install.sql
    echo "   Database schema created"
fi

# Check existing token
echo ""
echo "Step 4: Setting up API token..."
EXISTING_TOKEN=$(docker exec docker-mariadb-1 mariadb -u redcap -predcap_password redcap -N -e "SELECT api_token FROM redcap_user_rights WHERE username='site_admin' AND project_id=1" 2>/dev/null || echo "")

if [ -n "$EXISTING_TOKEN" ] && [ "$EXISTING_TOKEN" != "NULL" ]; then
    TOKEN="$EXISTING_TOKEN"
    echo "   Using existing token"
else
    TOKEN=$(openssl rand -hex 16 | tr 'a-f' 'A-F')
    docker exec docker-mariadb-1 mariadb -u redcap -predcap_password redcap -e "
    INSERT INTO redcap_user_rights (project_id, username, api_token, api_export, api_import, data_export_tool, data_import_tool, data_logging, user_rights, design, alerts, graphical, data_quality_design)
    VALUES (1, 'site_admin', '$TOKEN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE api_token='$TOKEN', api_export=1, api_import=1;"
    echo "   New token created"
fi

# Save token to config file
echo "# REDCap API Test Configuration" > "$CONFIG_DIR/.env.test"
echo "# Generated on $(date)" >> "$CONFIG_DIR/.env.test"
echo "" >> "$CONFIG_DIR/.env.test"
echo "REDCAP_API_URL=http://localhost:8888/api/" >> "$CONFIG_DIR/.env.test"
echo "REDCAP_API_TOKEN=$TOKEN" >> "$CONFIG_DIR/.env.test"
echo "REDCAP_PROJECT_ID=1" >> "$CONFIG_DIR/.env.test"

echo ""
echo "Step 5: Verifying API access..."
VERSION=$(curl -s -X POST http://localhost:8888/api/ -d "token=$TOKEN" -d "content=version")
if [ -n "$VERSION" ]; then
    echo "   REDCap version: $VERSION"
else
    echo "   Warning: Could not verify API access"
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "URLs:"
echo "  - REDCap:     http://localhost:8888"
echo "  - phpMyAdmin: http://localhost:8889"
echo "  - Mailpit:    http://localhost:8025"
echo ""
echo "API Token: $TOKEN"
echo "Saved to:  docker/config/.env.test"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:8888/api/ -d \"token=$TOKEN\" -d \"content=version\""
