#!/usr/bin/env bash
#
# import-dictionary.sh — import the minimal CRF data dictionary fixture
# into the local sandbox CRF instance via its HTTP API.
#
# This makes the CRF bootstrap fully self-contained: the committed
# fixture `fixtures/crf-dictionary.csv` is imported with no manual step
# and no dependency on a prod export. It is the automated fallback used
# by `bootstrap-crf.ts` when the (gitignored) full prod dictionary
# `data-dictionaries/127-amarre-v1.json` is not present locally.
#
# Contract used (REDCap-compatible metadata import):
#   POST <PUBLIC_CRF_URL>
#     token=<CRF_API_TOKEN>
#     content=metadata
#     action=import
#     format=csv
#     data=<raw CSV body>
#
# The CSV columns follow the standard CRF data-dictionary export order
# (the API maps columns by position, not by header name), so the fixture
# header must stay in canonical order — see fixtures/crf-dictionary.csv.
#
# Credentials policy: the API token is NEVER hardcoded. It is read from
# the environment (CRF_API_TOKEN) or from the sandbox `.env` that the
# bootstrap persists. Nothing secret lives in this file.
#
# Idempotence: the metadata import endpoint replaces the project's data
# dictionary wholesale, so re-running this script on a development
# project simply re-applies the same fixture — safe to repeat.
#
# Usage:
#   ./scripts/import-dictionary.sh                 # uses .env + fixture
#   CRF_DICTIONARY_FILE=/path/to.csv ./scripts/import-dictionary.sh
#   CRF_API_TOKEN=xxx PUBLIC_CRF_URL=http://localhost:8888/api/ \
#       ./scripts/import-dictionary.sh

set -euo pipefail

# --- Resolve paths -----------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SANDBOX_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SANDBOX_DIR}/.env"
DICTIONARY_FILE="${CRF_DICTIONARY_FILE:-${SANDBOX_DIR}/fixtures/crf-dictionary.csv}"

# --- Load .env (without clobbering pre-set env vars) -------------------
# Pre-set env wins so callers can override URL/token on the command line.
# We only export keys that aren't already in the environment.
if [ -f "${ENV_FILE}" ]; then
  while IFS= read -r line; do
    # skip blanks and comments
    case "${line}" in
      ''|\#*) continue ;;
    esac
    key="${line%%=*}"
    # only simple KEY=value lines
    case "${key}" in
      *' '*|*$'\t'*|'') continue ;;
    esac
    if [ -z "${!key:-}" ]; then
      value="${line#*=}"
      # strip surrounding single/double quotes
      value="${value%\"}"; value="${value#\"}"
      value="${value%\'}"; value="${value#\'}"
      export "${key}=${value}"
    fi
  done < "${ENV_FILE}"
fi

CRF_URL="${PUBLIC_CRF_URL:-http://localhost:8888/api/}"
CRF_TOKEN="${CRF_API_TOKEN:-}"

# --- Validate inputs ---------------------------------------------------
fail() { echo "✗ import-dictionary: $*" >&2; exit 1; }

if [ -z "${CRF_TOKEN}" ] || [ "${CRF_TOKEN}" = "__filled_by_bootstrap__" ]; then
  fail "CRF_API_TOKEN is not set.
  Run the CRF bootstrap first (\`pnpm bootstrap:crf\`) so the token is
  provisioned and written to ${ENV_FILE}, or export CRF_API_TOKEN
  explicitly before calling this script."
fi

if [ ! -f "${DICTIONARY_FILE}" ]; then
  fail "Dictionary fixture not found: ${DICTIONARY_FILE}"
fi

# Defend against an accidental/malicious .env redirecting our token to a
# foreign host. The sandbox CRF only ever lives on localhost.
case "${CRF_URL}" in
  http://localhost[:/]*|http://localhost|\
  http://127.0.0.1[:/]*|http://127.0.0.1|\
  https://localhost[:/]*|https://localhost|\
  https://127.0.0.1[:/]*|https://127.0.0.1) ;;
  *) fail "PUBLIC_CRF_URL must point to localhost/127.0.0.1; got '${CRF_URL}'" ;;
esac

command -v curl >/dev/null 2>&1 || fail "curl is required but not installed."

# --- Import ------------------------------------------------------------
echo "==> Importing CRF data dictionary"
echo "  • fixture : ${DICTIONARY_FILE}"
echo "  • target  : ${CRF_URL}"

# The CSV body goes in the urlencoded `data` field; --data-urlencode
# handles newlines/commas/quotes correctly. The token is passed the same
# way and never appears on the command line of another process.
http_body="$(mktemp)"
trap 'rm -f "${http_body}"' EXIT

http_code="$(
  curl -sS -o "${http_body}" -w '%{http_code}' \
    -X POST "${CRF_URL}" \
    -H 'Accept: application/json' \
    --data-urlencode "token=${CRF_TOKEN}" \
    --data-urlencode 'content=metadata' \
    --data-urlencode 'action=import' \
    --data-urlencode 'format=csv' \
    --data-urlencode 'returnFormat=json' \
    --data-urlencode "data@${DICTIONARY_FILE}"
)"

body="$(cat "${http_body}")"

if [ "${http_code}" != "200" ]; then
  fail "metadata import failed (HTTP ${http_code}): ${body}"
fi

# On success the API returns the number of imported fields (an integer).
echo "  ✓ Data dictionary imported (${body} fields)"
echo "Done. CRF project now carries the minimal amarre dictionary."
