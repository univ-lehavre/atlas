#!/bin/sh
# Régénère la branche `deploy` : une PROJECTION MÉCANIQUE `main ⊕ digests`
# (ADR 0104 atlas / ADR 0113 cluster — le write-back de la chaîne de livraison).
#
# Invariants portés par ce script :
#   1. l'ARBRE de `deploy` = l'arbre du commit de `main` livré, PLUS la substitution
#      des placeholders d'image (`__<CL>_IMAGE_DIGEST__` / `__<CL>_IMAGE__`) pour
#      chaque code-location dont un digest est CONNU ;
#   2. les digests des code-locations non rebuildées sont REPORTÉS depuis l'état
#      précédent de `deploy` (fichier `.deploy/digests.env`, versionné SUR deploy
#      uniquement) ; un `--set` (nouveau build) écrase l'entrée reportée ;
#   3. l'HISTOIRE est linéaire et jamais perdue : le nouveau commit a pour parent
#      l'ancien sommet de `deploy` (`git commit-tree`), son arbre est reconstruit
#      d'un bloc — AUCUN merge, donc aucun conflit possible, et toute édition
#      manuelle de `deploy` est écrasée au run suivant (« jamais éditée à la main ») ;
#   4. le push est FAST-FORWARD (parent = sommet distant) — pas de force.
#
# POSIX sh (pas de bashisme) : le shell du runner act_runner n'est pas garanti bash,
# et le test local doit tourner sous le bash 3.2 de macOS.
#
# Usage (depuis un clone où `<remote>` est la forge Gitea, authentifiée) :
#   scripts/regenerate-deploy.sh --sha <sha-de-main> [--set <cl>=<sha256:…>]... \
#                                [--remote origin] [--dry-run]
#   <cl> = nom court de la code-location (répertoire sans le suffixe -dagster :
#   citation, mediawatch, pageviews, scholar-network).
#
# Appelé par `.gitea/workflows/livraison.yaml` (l'usine) ; exécutable à la main
# UNIQUEMENT en secours documenté — la branche deploy reste la sortie de ce script.
set -eu

REMOTE="origin"
SHA=""
DRY_RUN=0
RAW_SETS="$(mktemp)"
trap 'rm -f "$RAW_SETS" "$RAW_SETS.merged" 2>/dev/null' EXIT

while [ $# -gt 0 ]; do
  case "$1" in
    --sha) SHA="$2"; shift 2 ;;
    --set) printf '%s\n' "$2" >> "$RAW_SETS"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "✗ argument inconnu : $1" >&2; exit 2 ;;
  esac
done
[ -n "$SHA" ] || { echo "✗ --sha <sha-de-main> requis." >&2; exit 2; }

DIGESTS_FILE=".deploy/digests.env"

# ── 0. Validation des --set (format du digest) ───────────────────────────────
while IFS= read -r kv; do
  digest="${kv#*=}"
  if ! printf '%s' "$digest" | grep -qE '^sha256:[0-9a-f]{64}$'; then
    echo "✗ digest invalide : $kv (attendu <cl>=sha256:<64 hex>)." >&2
    exit 1
  fi
done < "$RAW_SETS"

# ── 1. Report des digests de l'ancien deploy, puis --set par-dessus ──────────
git fetch -q "$REMOTE" deploy 2>/dev/null || true
PARENT="$(git rev-parse -q --verify "refs/remotes/$REMOTE/deploy" 2>/dev/null || true)"
{
  if [ -n "$PARENT" ]; then
    git show "$PARENT:$DIGESTS_FILE" 2>/dev/null | grep -v '^#' || true
  fi
  cat "$RAW_SETS"
} | awk -F= 'NF==2 { v[$1]=$2 } END { for (k in v) print k "=" v[k] }' \
  | sort > "$RAW_SETS.merged"

# ── 2. Arbre = main livré + substitutions ────────────────────────────────────
git checkout -q --detach "$SHA"
SUBSTITUTED=""
N=0
while IFS='=' read -r cl digest; do
  [ -n "$cl" ] || continue
  N=$((N + 1))
  dir="dataops/${cl}-dagster"
  prefix="$(printf '%s' "$cl" | tr '[:lower:]-' '[:upper:]_')"
  kfile="$dir/deploy/overlays/prod/kustomization.yaml"
  pfile="$dir/deploy/overlays/prod/patch-s3-envfrom.yaml"
  if [ ! -f "$kfile" ] || [ ! -f "$pfile" ]; then
    echo "⚠ $cl : overlay prod introuvable ($kfile) — digest connu mais non substitué." >&2
    continue
  fi
  # kustomization : `digest: "__<P>_IMAGE_DIGEST__"` → le sha256 (kustomize réécrit la
  # référence du conteneur en …@sha256:…). patch : `__<P>_IMAGE__` → la référence
  # COMPLÈTE par digest (DAGSTER_CURRENT_IMAGE des pods de run, ADR cluster 0095 §2).
  # Les manifestes gardent la forme `registry:80/…` (résolue node-side, ADR cluster 0011).
  sed "s|__${prefix}_IMAGE_DIGEST__|${digest}|g" "$kfile" > "$kfile.new" && mv "$kfile.new" "$kfile"
  sed "s|__${prefix}_IMAGE__|registry:80/${cl}-dagster@${digest}|g" "$pfile" > "$pfile.new" && mv "$pfile.new" "$pfile"
  short="$(printf '%s' "$digest" | cut -c8-19)"
  SUBSTITUTED="${SUBSTITUTED}${SUBSTITUTED:+ }${cl}@${short}"
done < "$RAW_SETS.merged"

mkdir -p .deploy
{
  echo "# Digests matérialisés par la chaîne de livraison (scripts/regenerate-deploy.sh)."
  echo "# NE PAS ÉDITER : régénéré à chaque push de main (ADR 0104 / ADR cluster 0113)."
  cat "$RAW_SETS.merged"
} > "$DIGESTS_FILE"

# ── 3. Commit (parent = ancien deploy) + push fast-forward ───────────────────
git add -A
TREE="$(git write-tree)"
SHORT_SHA="$(printf '%s' "$SHA" | cut -c1-12)"
MSG="deploy: main ${SHORT_SHA} ⊕ ${N} digest(s)${SUBSTITUTED:+ — ${SUBSTITUTED}}"
export GIT_AUTHOR_NAME="livraison (usine)" GIT_COMMITTER_NAME="livraison (usine)"
export GIT_AUTHOR_EMAIL="livraison@usine.invalid" GIT_COMMITTER_EMAIL="livraison@usine.invalid"
if [ -n "$PARENT" ]; then
  NEW="$(git commit-tree "$TREE" -p "$PARENT" -m "$MSG")"
else
  NEW="$(git commit-tree "$TREE" -m "$MSG")"
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "dry-run : deploy serait $NEW ($MSG)"
else
  git push -q "$REMOTE" "$NEW:refs/heads/deploy"
  echo "✓ deploy → $NEW ($MSG)"
fi
