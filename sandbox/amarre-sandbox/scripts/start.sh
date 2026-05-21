#!/usr/bin/env bash
# Full zero-touch sandbox setup :
#   1. docker compose up -d
#   2. ./scripts/bootstrap.sh    (provisions BaaS + CRF + seed + .env.local)
#   3. pnpm test:smoke           (Playwright level-5 smoke ; auto-spawns
#                                 the amarre dev server via webServer)
#
# Environment knobs :
#   SEED_MODE=fake|prod|none  (default: fake)
#       fake  → 120 synthetic records via @faker-js/faker
#       prod  → pull real records from PROD_CRF_URL/PROD_CRF_TOKEN
#       none  → skip data population
#   SKIP_E2E=1                Skip the final smoke test.

set -euo pipefail

cd "$(dirname "$0")/.."

# Ensure .env exists with a real OpenSSL key BEFORE docker compose reads
# it. compose's `${VAR:?msg}` interpolation runs at parse time, so the
# key must be present in .env upfront.
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi
if grep -qE '^_APP_OPENSSL_KEY_V1=__set_a_random_string_here__$' .env; then
  echo "==> Generating _APP_OPENSSL_KEY_V1 (random 32-byte hex)"
  KEY=$(openssl rand -hex 32)
  sed -i.bak "s/^_APP_OPENSSL_KEY_V1=.*/_APP_OPENSSL_KEY_V1=${KEY}/" .env
  rm -f .env.bak
fi

echo "==> [1/3] Starting containers"
docker compose up -d

echo
echo "==> [2/3] Running bootstrap"
./scripts/bootstrap.sh

if [ "${SKIP_E2E:-0}" = "1" ]; then
  echo
  echo "==> Skipping E2E smoke test (SKIP_E2E=1)"
  exit 0
fi

echo
echo "==> [3/3] Running Playwright smoke (level 5)"
pnpm test:smoke
