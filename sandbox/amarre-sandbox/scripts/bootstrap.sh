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
#   prod  — pull real records from a remote REDCap (PROD_CRF_URL +
#           PROD_CRF_TOKEN required). Auto-selected when both are set.
#           Falls back to fake at runtime if the prod URL is not
#           reachable (e.g. off-VPN, bad token, server down).
#   fake  — generate N synthetic records with @faker-js/faker. Default
#           fallback when prod credentials aren't available.
#   none  — skip data population entirely.
# Override the auto-detection by exporting SEED_MODE explicitly.
if [ -z "${SEED_MODE:-}" ]; then
  if [ -n "${PROD_CRF_URL:-}" ] && [ -n "${PROD_CRF_TOKEN:-}" ]; then
    SEED_MODE="prod"
    echo "==> Detected PROD_CRF_* credentials → SEED_MODE=prod (real data)"
  else
    SEED_MODE="fake"
    echo "==> No PROD_CRF_* credentials → SEED_MODE=fake (synthetic data)"
  fi
fi

echo "==> [1/4] Bootstrapping BaaS (Appwrite)"
pnpm bootstrap:baas

echo "==> [2/4] Bootstrapping CRF (REDCap)"
pnpm bootstrap:crf

# Probe reachability of the prod REDCap API. Hits content=version
# (the cheapest authenticated endpoint, returns "16.1.9" in text/plain).
# Returns 0 iff HTTP 200 — anything else (302 to a 403 page when not
# on VPN, 401 on bad token, timeout when offline) means we can't pull.
probe_prod_reachable() {
  local code
  code=$(curl -sS -o /dev/null -m 5 -w "%{http_code}" \
    -X POST "$PROD_CRF_URL" \
    -d "token=$PROD_CRF_TOKEN" \
    -d "content=version" 2>/dev/null || echo "000")
  [ "$code" = "200" ]
}

case "$SEED_MODE" in
  fake)
    echo "==> [3/4] Seeding fake data"
    pnpm seed
    ;;
  prod)
    # Probing before `pull:prod` so an unreachable prod (VPN off,
    # token rotated, server down) falls back to fake instead of
    # killing the script under `set -e` and leaving step [4/4]
    # unwritten.
    if probe_prod_reachable; then
      echo "==> [3/4] Pulling records from production REDCap"
      pnpm pull:prod --yes
    else
      echo "==> [3/4] Prod REDCap unreachable (no VPN? token invalid?) → falling back to fake seed"
      pnpm seed
    fi
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
