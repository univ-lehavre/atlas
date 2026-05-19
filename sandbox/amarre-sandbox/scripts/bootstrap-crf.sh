#!/usr/bin/env bash
# Delegates the CRF install to sandbox/crf-sandbox, then provisions a
# test project with the data dictionary that amarre expects and writes
# the resulting `CRF_API_TOKEN` to `.env`.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Running crf-sandbox install script"
(cd ../crf-sandbox && pnpm docker:install)

# crf-sandbox writes its admin/test token to docker/config/.env.test
TOKEN_FILE="../crf-sandbox/docker/config/.env.test"
if [ ! -f "$TOKEN_FILE" ]; then
  echo "Expected $TOKEN_FILE not found — check that crf-sandbox installed cleanly." >&2
  exit 1
fi

# Extract REDCAP_TOKEN (the script in crf-sandbox names it that way).
crf_token=$(grep -E '^(REDCAP|CRF)_TOKEN=' "$TOKEN_FILE" | head -1 | cut -d= -f2)

if [ -z "$crf_token" ]; then
  echo "No CRF token found in $TOKEN_FILE — abort." >&2
  exit 1
fi

# Append/update CRF_API_TOKEN in the amarre-sandbox .env.
if grep -qE '^CRF_API_TOKEN=' .env 2>/dev/null; then
  sed -i.bak -E "s|^CRF_API_TOKEN=.*|CRF_API_TOKEN=${crf_token}|" .env && rm -f .env.bak
else
  echo "CRF_API_TOKEN=${crf_token}" >> .env
fi

echo "OK — CRF token written to .env"
echo
echo "À noter : la trame (data dictionary) attendue par amarre n'est pas"
echo "encore importée automatiquement. Pour l'instant, ouvrir http://localhost:8888"
echo "et importer le data dictionary minimum manuellement (cf. README §Trame CRF)."
