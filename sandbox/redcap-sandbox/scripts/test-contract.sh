#!/usr/bin/env bash
set -euo pipefail

# Contract tests against the real REDCap Docker instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PACKAGE_DIR"

echo "REDCap API Contract Tests"
echo "========================="
echo ""

# Check if REDCap is running
if ! curl -s http://localhost:8888/api/ > /dev/null 2>&1; then
  echo "REDCap Docker is not running."
  echo "Start it with: pnpm docker:up"
  exit 1
fi

echo "REDCap is running at http://localhost:8888"
echo ""

# Check if fixtures exist
if [ ! -f "tests/fixtures/projects.json" ]; then
  echo "Test fixtures not found. Run 'pnpm test:setup' first."
  exit 1
fi

# Run contract tests
exec pnpm vitest run tests/contract/api-contract.test.ts \
  --config vitest.contract.config.ts
