#!/usr/bin/env bash
# Installation / bascule de la code-location Dagster « citation » — banc ou prod.
#
# Orchestre le runbook (RUNBOOK.md) en UNE commande : build image → fige le tag →
# checks (validate.sh + lint + tests) → push Gitea (Argo CD réconcilie). Le push est
# le DÉCLENCHEUR GitOps (ADR cluster 0044) ; ce script va jusqu'au bout MAIS demande
# une confirmation explicite avant — un HUMAIN le lance (aucun agent ne déclenche le
# déploiement réel, ADR cluster 0033). `--yes` saute la confirmation (CI/scripté).
#
# Deux profils (ADR cluster 0085/0036) :
#   - bench : banc `atlas` local-path (SeaweedFS, overlays/bench) — PREUVE APPLICATIVE
#     de référence (même code qu'en prod, seul le backing S3 diffère, ADR 0085) ;
#   - prod  : Ceph (RGW/OBC, overlays/prod) — la cible. Tag IMMUABLE (jamais
#     :dev/latest), figé dans l'overlay. Un diff touchant le chemin S3/backing se
#     revalide sur Ceph applicatif (soupape `cluster-dataops`, ADR 0036/0085).
#
# Usage :
#   deploy/install.sh <bench|prod> [tag] [--yes] [--no-push]
#     tag       défaut = git short SHA (prod) / "dev" (bench)
#     --no-push : build + checks SANS pousser (prépare, ne déploie pas)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dataops_ctx="$(cd "$here/../.." && pwd)"          # contexte de build = dataops/
repo_root="$(cd "$dataops_ctx/.." && pwd)"
registry="${REGISTRY:-registry:80}"
image="$registry/citation-dagster"

# ── Arguments ────────────────────────────────────────────────────────────────
profile=""
tag=""
assume_yes=0
do_push=1
for arg in "$@"; do
  case "$arg" in
    bench | prod) profile="$arg" ;;
    --yes | -y) assume_yes=1 ;;
    --no-push) do_push=0 ;;
    -*) echo "✗ option inconnue : $arg" >&2; exit 2 ;;  # ne JAMAIS prendre un flag pour un tag
    *) tag="$arg" ;;
  esac
done

if [ "$profile" != "bench" ] && [ "$profile" != "prod" ]; then
  echo "✗ profil requis : bench | prod  (usage: install.sh <bench|prod> [tag] [--yes] [--no-push])" >&2
  exit 2
fi

# Tag par défaut : SHA court en prod (immuable), "dev" en banc léger.
if [ -z "$tag" ]; then
  if [ "$profile" = "prod" ]; then
    tag="$(git -C "$repo_root" rev-parse --short HEAD)"
  else
    tag="dev"
  fi
fi

if [ "$profile" = "prod" ] && { [ "$tag" = "dev" ] || [ "$tag" = "latest" ]; }; then
  echo "✗ prod : tag immuable requis (ni :dev ni :latest, ADR cluster 0033)." >&2
  exit 2
fi

# ── Outils requis ────────────────────────────────────────────────────────────
for tool in docker kubectl git; do
  command -v "$tool" >/dev/null 2>&1 || { echo "✗ $tool introuvable (requis)." >&2; exit 1; }
done

echo "── install : profil=$profile  image=$image:$tag  push=$do_push ──"

# ── 1. Build + push de l'image (contexte dataops/, arm64 pour Lima) ──────────
echo "→ build image"
docker buildx build --platform linux/arm64 \
  -f "$here/../Dockerfile" \
  -t "$image:$tag" --push "$dataops_ctx"

# ── 2. Figer le tag dans l'overlay prod (newTag ET DAGSTER_CURRENT_IMAGE) ─────
# Le banc léger garde l'image de base ; seul prod épingle un tag immuable.
if [ "$profile" = "prod" ]; then
  echo "→ fige le tag $tag dans overlays/prod"
  kustomization="$here/overlays/prod/kustomization.yaml"
  patch="$here/overlays/prod/patch-s3-envfrom.yaml"
  # newTag de la kustomization (ligne `newTag: "<...>"`).
  sed -i.bak -E "s|(newTag: )\"[^\"]*\"|\1\"$tag\"|" "$kustomization" && rm -f "$kustomization.bak"
  # DAGSTER_CURRENT_IMAGE du patch (run workers) — aligné sur le même tag.
  sed -i.bak -E "s|($image:)[^[:space:]]*|\1$tag|" "$patch" && rm -f "$patch.bak"
fi

# ── 3. Checks : manifestes (validate.sh) + lint + tests Python ───────────────
echo "→ checks manifestes (validate.sh)"
bash "$here/validate.sh"

echo "→ checks Python (lint + tests)"
if command -v uv >/dev/null 2>&1; then
  ( cd "$here/.." && uv run ruff check . && uv run ruff format --check . && uv run pytest -q )
else
  echo "⚠ uv absent : lint/tests Python sautés (lancer 'pnpm dataops:check' séparément)."
fi

# ── 4. Push Gitea = DÉCLENCHEUR GitOps (Argo CD réconcilie) ───────────────────
if [ "$do_push" -eq 0 ]; then
  echo "✓ build + checks OK (profil $profile, tag $tag). --no-push : rien n'est déployé."
  echo "  Pour déployer : commiter le tag figé puis 'git push' (cf. RUNBOOK.md)."
  exit 0
fi

# Charge GITEA_PUSH_URL si l'instance l'a généré (access.sh → .env.cluster.local).
# Fichier d'instance gitignoré (généré par access.sh), chemin non constant.
env_file="$repo_root/.env.cluster.local"
# shellcheck source=/dev/null
[ -f "$env_file" ] && set -a && . "$env_file" && set +a

# ── Garde-fou de cible (ADR 0073 §B) ─────────────────────────────────────────
# La cible GitOps se LIT dans le `.env` injecté par l'infrastructure
# (GITEA_PUSH_URL, contrat ADR 0033) ; elle n'est jamais déduite de
# l'environnement ambiant. À cible absente ou vide, on REFUSE de pousser (échec
# bruyant) plutôt que de retomber sur le remote `git push` par défaut — celui-ci
# pourrait viser la mauvaise cible (banc vs prod) sans message d'erreur franc.
if [ -z "${GITEA_PUSH_URL:-}" ]; then
  echo "✗ cible GitOps non confirmée : GITEA_PUSH_URL absente (profil $profile)." >&2
  echo "  Atlas LIT sa cible dans $env_file (généré par l'access.sh du dépôt cluster," >&2
  echo "  contrat ADR 0033) ; il ne la devine pas. Régénérer le .env d'instance," >&2
  echo "  ou exporter GITEA_PUSH_URL explicitement, puis relancer (ADR 0073 §B)." >&2
  exit 2
fi

echo
echo "⚠ Le push va DÉCLENCHER la réconciliation Argo CD (déploiement réel, profil $profile)."
if [ "$assume_yes" -ne 1 ]; then
  printf "  Confirmer le push ? [y/N] "
  read -r reply
  case "$reply" in
    y | Y | yes | oui) ;;
    *) echo "✗ push annulé (build + checks restent faits)."; exit 0 ;;
  esac
fi

if [ "$profile" = "prod" ]; then
  echo "→ commit du tag figé (overlays/prod)"
  git -C "$repo_root" add "$kustomization" "$patch"
  git -C "$repo_root" commit -m "deploy(citation-dagster): image $tag (prod)" || true
fi

echo "→ push (Gitea → Argo CD) vers la cible confirmée"
# Cible explicite uniquement : GITEA_PUSH_URL est garantie posée par le garde-fou
# ci-dessus. On ne retombe JAMAIS sur un `git push` au remote ambiant (ADR 0073 §B).
git -C "$repo_root" push "$GITEA_PUSH_URL" HEAD:main

echo "✓ poussé. Argo CD réconcilie ; vérifier Synced/Healthy + run de validation (RUNBOOK.md)."
