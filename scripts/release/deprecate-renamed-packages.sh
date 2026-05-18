#!/bin/bash
# Deprecate the 13 packages renamed during the trademark cleanup migration.
# Marks each old package as deprecated on npm with a message pointing to the new name.
#
# Usage:
#   ./scripts/release/deprecate-renamed-packages.sh           # dry-run (default)
#   ./scripts/release/deprecate-renamed-packages.sh --apply   # actually run npm deprecate
#
# Notes:
# - Requires `npm login` with publish rights on @univ-lehavre/*.
# - `npm deprecate` is idempotent: re-running with the same message is a no-op.
# - Only published packages are deprecated. Private apps (apps/*) are skipped.
# - Does NOT unpublish anything: old versions remain installable.

set -euo pipefail

APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=1
fi

declare -a PAIRS=(
  # citation cluster (PR 1 + PR 2)
  "@univ-lehavre/atlas-openalex-types|@univ-lehavre/atlas-citation-types"
  "@univ-lehavre/atlas-fetch-openalex|@univ-lehavre/atlas-citation-fetch"
  "@univ-lehavre/atlas-openalex|@univ-lehavre/atlas-citation"
  "@univ-lehavre/atlas-validate-openalex|@univ-lehavre/atlas-citation-validate"
  "@univ-lehavre/atlas-openalex-cli|@univ-lehavre/atlas-citation-cli"

  # crf cluster (PR 3 + PR 4)
  "@univ-lehavre/atlas-redcap-core|@univ-lehavre/atlas-crf-core"
  "@univ-lehavre/atlas-redcap-client|@univ-lehavre/atlas-crf-client"
  "@univ-lehavre/atlas-redcap-logs|@univ-lehavre/atlas-crf-logs"
  "@univ-lehavre/atlas-redcap-openapi|@univ-lehavre/atlas-crf-openapi"
  "@univ-lehavre/atlas-redcap-stats-cli|@univ-lehavre/atlas-crf-stats-cli"
  "@univ-lehavre/atlas-redcap-sandbox|@univ-lehavre/atlas-crf-sandbox"
  "@univ-lehavre/atlas-redcap-dashboard|@univ-lehavre/atlas-crf-dashboard"

  # baas (PR 5)
  "@univ-lehavre/atlas-appwrite|@univ-lehavre/atlas-baas"
)

if [[ $APPLY -eq 0 ]]; then
  echo "🟡 Dry-run mode. Use --apply to execute."
  echo ""
fi

for pair in "${PAIRS[@]}"; do
  OLD="${pair%%|*}"
  NEW="${pair##*|}"
  MSG="Renamed to ${NEW}. The old name will no longer receive updates. Please switch your dependency to ${NEW}."

  if [[ $APPLY -eq 1 ]]; then
    echo "📦 Deprecating ${OLD} -> ${NEW}"
    npm deprecate "${OLD}@*" "${MSG}"
  else
    echo "DRY-RUN: npm deprecate \"${OLD}@*\" \"${MSG}\""
  fi
done

echo ""
if [[ $APPLY -eq 1 ]]; then
  echo "✅ Done. Run \`npm view <pkg> --json | jq .deprecated\` to verify."
else
  echo "ℹ️  No changes made. Re-run with --apply to actually deprecate."
fi
