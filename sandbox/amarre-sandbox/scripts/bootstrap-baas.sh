#!/usr/bin/env bash
# Provisions an Appwrite project + an API key for the amarre app.
# Writes the resulting `PUBLIC_APPWRITE_PROJECT` and `APPWRITE_KEY`
# to `.env.bootstrap` (sourced later by write-amarre-env.sh).
#
# Limitation : la création initiale d'un projet Appwrite passe
# traditionnellement par la console web. L'API admin n'expose pas
# directement `createProject` sans organisation préalable. Pour
# garder le bootstrap reproductible, on s'attend à ce qu'une console
# admin ait été configurée au premier `docker compose up` (création
# manuelle du root user via http://localhost:${APP_PORT}/console).
#
# Si tu veux un bootstrap 100 % programmatique, ouvre une issue —
# c'est faisable via l'endpoint `/v1/account` puis `/v1/projects`
# avec le cookie root.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
fi
# shellcheck disable=SC1091
source .env

ENDPOINT="${PUBLIC_APPWRITE_ENDPOINT:-http://localhost:${APP_PORT:-8090}/v1}"

echo "Appwrite endpoint: $ENDPOINT"
echo
echo "Étape manuelle requise au premier run :"
echo "  1. Ouvre $ENDPOINT/console dans un navigateur."
echo "  2. Crée le user admin (premier compte = admin)."
echo "  3. Crée une organisation puis un projet 'amarre-sandbox'."
echo "  4. Génère une clé serveur avec les scopes :"
echo "     users.read, users.write, sessions.write, account.write"
echo "  5. Récupère le project ID et la clé, et renseigne dans .env :"
echo "     PUBLIC_APPWRITE_PROJECT=…"
echo "     APPWRITE_KEY=…"
echo
echo "Une fois fait, relance ce script pour passer aux étapes suivantes."

# Stop early if values are still placeholders.
if [ -z "${PUBLIC_APPWRITE_PROJECT:-}" ] || [ "${PUBLIC_APPWRITE_PROJECT}" = "__filled_by_bootstrap__" ]; then
  echo "PUBLIC_APPWRITE_PROJECT not set in .env — stopping." >&2
  exit 0
fi
if [ -z "${APPWRITE_KEY:-}" ] || [ "${APPWRITE_KEY}" = "__filled_by_bootstrap__" ]; then
  echo "APPWRITE_KEY not set in .env — stopping." >&2
  exit 0
fi

# Sanity-check the credentials by hitting /v1/users (admin-scoped).
status=$(curl -s -o /tmp/baas-bootstrap.json -w '%{http_code}' \
  -H "X-Appwrite-Project: $PUBLIC_APPWRITE_PROJECT" \
  -H "X-Appwrite-Key: $APPWRITE_KEY" \
  "$ENDPOINT/users")

if [ "$status" = "200" ]; then
  echo "OK — admin key validated against $ENDPOINT/users"
else
  echo "Admin key check failed (HTTP $status). Body:" >&2
  cat /tmp/baas-bootstrap.json >&2
  exit 1
fi
