#!/usr/bin/env bash
set -euo pipefail

# Security tests against the real REDCap Docker instance

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "REDCap Security Tests"
echo "====================="
echo ""

# Check if REDCap is running
if ! curl -s http://localhost:8888/api/ > /dev/null 2>&1; then
  echo "REDCap Docker is not running."
  echo "Start it with: pnpm docker:up"
  exit 1
fi

echo "REDCap is running at http://localhost:8888"
echo ""

# Run Schemathesis against the extracted spec
echo "Running Schemathesis against REDCap..."
echo ""

# Check if extracted spec exists
if [ ! -f "specs/redcap-extracted.yaml" ]; then
  echo "Extracted spec not found. Run 'pnpm analyze' first."
  exit 1
fi

# Run schemathesis
uvx schemathesis run specs/redcap-extracted.yaml \
  --base-url http://localhost:8888 \
  --checks all \
  --workers 1 \
  --hypothesis-phases=explicit \
  --dry-run || true

echo ""
echo "Note: Some failures are expected as schemathesis generates"
echo "invalid tokens/parameters that REDCap correctly rejects."
echo ""
echo "For full security testing, provide a valid API token:"
echo "  export REDCAP_TOKEN=YOUR_TOKEN"
echo "  schemathesis run specs/redcap-extracted.yaml --base-url http://localhost:8888"
