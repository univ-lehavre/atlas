#!/usr/bin/env bash
# Orchestrate the full local setup: BaaS provisioning + CRF install.
# Run after `pnpm up` has the containers running.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Waiting for BaaS health…"
./scripts/wait-for.sh http://localhost:"${APP_PORT:-8090}"/v1/health 120

echo "==> Bootstrapping BaaS project + API key"
./scripts/bootstrap-baas.sh

echo "==> Bootstrapping CRF project + API token"
./scripts/bootstrap-crf.sh

echo "==> Writing apps/amarre/.env.local"
./scripts/write-amarre-env.sh

cat <<'MSG'

==> Sandbox ready. Next steps:

  cd ../../apps/amarre
  pnpm dev

  Then open http://localhost:5173 and log in with an email matching
  ALLOWED_DOMAINS_REGEXP.

  Useful URLs:
  - BaaS console : http://localhost:${APP_PORT:-8090}/console
  - CRF          : http://localhost:8888
  - phpMyAdmin   : http://localhost:8889
  - Mailpit (mail trap) : http://localhost:8025
MSG
