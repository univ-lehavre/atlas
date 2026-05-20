#!/usr/bin/env bash
# Orchestrates the full local setup once `pnpm up` has the containers
# running :
#   1. Provision Appwrite (root account + organisation + project + key)
#   2. Provision REDCap (install + project rename + import dictionary)
#   3. Seed REDCap with synthetic records
#   4. Write apps/amarre/.env.local
#
# All four steps are idempotent — safe to re-run.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

# Generate _APP_OPENSSL_KEY_V1 if still the placeholder. We do this here
# so the first-run path is fully automatic — no manual edit required.
if grep -qE '^_APP_OPENSSL_KEY_V1=__set_a_random_string_here__$' .env; then
  echo "==> Generating _APP_OPENSSL_KEY_V1 (random 32-byte hex)"
  KEY=$(openssl rand -hex 32)
  # macOS sed wants -i '' ; GNU sed wants -i ; the -i.bak shim works on both.
  sed -i.bak "s/^_APP_OPENSSL_KEY_V1=.*/_APP_OPENSSL_KEY_V1=${KEY}/" .env
  rm -f .env.bak
fi

# .env.prod is a gitignored, persistent overrides file (cf. .env.prod.example).
# We source it AFTER .env so its values win — typically used to keep
# PROD_CRF_URL/PROD_CRF_TOKEN across resets.
if [ -f .env.prod ]; then
  echo "==> Loading .env.prod overrides"
  set -a
  # shellcheck disable=SC1091
  source .env.prod
  set +a
fi

# SEED_MODE controls how the REDCap project is populated with data:
#   fake  (default) — generate N synthetic records with @faker-js/faker
#   prod            — pull real records from a remote REDCap (requires
#                     PROD_CRF_URL + PROD_CRF_TOKEN in .env)
#   none            — skip data population entirely
SEED_MODE="${SEED_MODE:-fake}"

echo "==> [1/4] Bootstrapping BaaS (Appwrite)"
pnpm bootstrap:baas

echo "==> [2/4] Bootstrapping CRF (REDCap)"
pnpm bootstrap:crf

case "$SEED_MODE" in
  fake)
    echo "==> [3/4] Seeding fake data"
    pnpm seed
    ;;
  prod)
    echo "==> [3/4] Pulling records from production REDCap"
    pnpm pull:prod --yes
    ;;
  none)
    echo "==> [3/4] Skipping data population (SEED_MODE=none)"
    ;;
  *)
    echo "Unknown SEED_MODE=$SEED_MODE (expected: fake|prod|none)" >&2
    exit 1
    ;;
esac

echo "==> [4/4] Writing apps/amarre/.env.local"
./scripts/write-amarre-env.sh

cat <<MSG

==> Sandbox ready. Next steps:

  cd ../../apps/amarre
  pnpm dev

  Then open http://localhost:5173 and log in with an email matching
  ALLOWED_DOMAINS_REGEXP. The magic link will land in Mailpit.

  Useful URLs:
  - amarre app   : http://localhost:5173
  - BaaS API     : http://localhost:${APP_PORT:-8090}/v1
  - BaaS console : http://localhost:${APP_CONSOLE_PORT:-8091}/
  - CRF          : http://localhost:8888  (project 'amarre')
  - phpMyAdmin   : http://localhost:8889
  - Mailpit (mail trap) : http://localhost:8025

  Run \`pnpm test:e2e\` (with the dev server up) for a full smoke test.
MSG
