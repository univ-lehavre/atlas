#!/usr/bin/env bash
# Installation de la code-location Dagster « citation » sur le BANC — preuve
# applicative de référence (overlays/bench, SeaweedFS local-path, ADR 0085).
#
# Orchestre la preuve locale du banc en UNE commande : build image du banc →
# checks (validate.sh + lint + tests) → push Gitea (Argo CD réconcilie). Le push est
# le DÉCLENCHEUR GitOps (ADR cluster 0044) ; ce script va jusqu'au bout MAIS demande
# une confirmation explicite avant — un HUMAIN le lance (aucun agent ne déclenche le
# déploiement réel, ADR cluster 0033). `--yes` saute la confirmation (CI/scripté).
#
# PROD : ce script ne pilote PAS la prod (ADR 0075). En production, `atlas` ne
# fabrique ni ne résout l'image : l'overlay prod n'expose que des placeholders
# (`__CITATION_IMAGE_DIGEST__`, `__CITATION_IMAGE__`) que le cluster remplit par le
# digest immuable de l'image de CODE qu'il build in-pod sur la pré-image (ADR cluster
# 0110). Build de l'image, injection du digest et réconciliation prod sont des gestes
# `cluster` (frontière ADR 0033/0094). Ici, on prouve le MÊME code applicatif sur le
# banc ; seul le backing S3 diffère (ADR 0036/0085).
#
# Usage :
#   deploy/install.sh bench [tag] [--yes] [--no-push]
#     tag       défaut = "dev"
#     --no-push : build + checks SANS pousser (prépare, ne déploie pas)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dataops_ctx="$(cd "$here/../.." && pwd)"          # contexte de build = dataops/
repo_root="$(cd "$dataops_ctx/.." && pwd)"
registry="${REGISTRY:-registry:80}"
image="$registry/citation-dagster"

# ── Arguments ────────────────────────────────────────────────────────────────
# Seul le profil `bench` est piloté ici (la prod appartient à `cluster`, ADR 0075).
profile=""
tag=""
assume_yes=0
do_push=1
for arg in "$@"; do
  case "$arg" in
    bench) profile="$arg" ;;
    prod) echo "✗ prod n'est pas pilotée par ce script (ADR 0075) : l'image et le digest" >&2
          echo "  de production sont fabriqués+injectés par cluster (frontière ADR 0094)." >&2
          exit 2 ;;
    --yes | -y) assume_yes=1 ;;
    --no-push) do_push=0 ;;
    -*) echo "✗ option inconnue : $arg" >&2; exit 2 ;;  # ne JAMAIS prendre un flag pour un tag
    *) tag="$arg" ;;
  esac
done

if [ "$profile" != "bench" ]; then
  echo "✗ profil requis : bench  (usage: install.sh bench [tag] [--yes] [--no-push])" >&2
  exit 2
fi

# Tag par défaut du banc léger.
tag="${tag:-dev}"

# ── Outils requis ────────────────────────────────────────────────────────────
for tool in docker kubectl git; do
  command -v "$tool" >/dev/null 2>&1 || { echo "✗ $tool introuvable (requis)." >&2; exit 1; }
done

echo "── install : profil=$profile  image=$image:$tag  push=$do_push ──"

# ── 1. Build + push de l'image (contexte dataops/, arm64 pour Lima) ──────────
# Découpage pré-image (ADR cluster 0110) : UN Dockerfile, DEUX cibles.
#   1a. cible `deps`  → la pré-image `citation-deps-base` (LOURDE, egress : deps +
#       wheels du lock + extensions DuckDB + modèle ONNX) — le seul build à Internet ;
#   1b. cible `code`  → l'image applicative (`FROM ${DEPS_REF}`, zéro egress).
# Sur le banc local (poste avec réseau), on build les deux à la suite : la deps-base
# d'abord (poussée sous `:$tag`), puis le code qui la référence par ce même tag. En
# prod, la deps-base est fournie séparément (poste de contrôle) et le code se build
# in-pod ; ce script n'orchestre que la PREUVE LOCALE (ADR cluster 0110).
deps_ref="$registry/citation-deps-base:$tag"

echo "→ build pré-image (cible deps : deps + extensions DuckDB + ONNX, egress)"
docker buildx build --platform linux/arm64 --target deps \
  -f "$here/../Dockerfile" \
  -t "$deps_ref" --push "$dataops_ctx"

echo "→ build image de code (cible code : FROM $deps_ref, zéro egress)"
docker buildx build --platform linux/arm64 --target code \
  -f "$here/../Dockerfile" \
  --build-arg "DEPS_REF=$deps_ref" \
  -t "$image:$tag" --push "$dataops_ctx"

# Le banc utilise l'overlay/bench (image de base, pas de placeholder à figer).
# L'overlay prod n'est pas touché ici : ses placeholders d'image sont remplis côté
# cluster (build de code in-pod + injection du digest, ADR cluster 0110/0075).

# ── 2. Checks : manifestes (validate.sh) + lint + tests Python ───────────────
echo "→ checks manifestes (validate.sh)"
bash "$here/validate.sh"

echo "→ checks Python (lint + tests)"
if command -v uv >/dev/null 2>&1; then
  ( cd "$here/.." && uv run ruff check . && uv run ruff format --check . && uv run pytest -q )
else
  echo "⚠ uv absent : lint/tests Python sautés (lancer 'pnpm dataops:check' séparément)."
fi

# ── 3. Push Gitea = DÉCLENCHEUR GitOps (Argo CD réconcilie) ───────────────────
if [ "$do_push" -eq 0 ]; then
  echo "✓ build + checks OK (banc, tag $tag). --no-push : rien n'est déployé."
  echo "  Pour déployer le banc : 'git push' vers la cible Gitea (Argo CD réconcilie)."
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
  echo "✗ cible GitOps non confirmée : GITEA_PUSH_URL absente (banc)." >&2
  echo "  Atlas LIT sa cible dans $env_file (généré par l'access.sh du dépôt cluster," >&2
  echo "  contrat ADR 0033) ; il ne la devine pas. Régénérer le .env d'instance," >&2
  echo "  ou exporter GITEA_PUSH_URL explicitement, puis relancer (ADR 0073 §B)." >&2
  exit 2
fi

echo
echo "⚠ Le push va DÉCLENCHER la réconciliation Argo CD (déploiement du banc)."
if [ "$assume_yes" -ne 1 ]; then
  printf "  Confirmer le push ? [y/N] "
  read -r reply
  case "$reply" in
    y | Y | yes | oui) ;;
    *) echo "✗ push annulé (build + checks restent faits)."; exit 0 ;;
  esac
fi

echo "→ push (Gitea → Argo CD) vers la cible confirmée"
# Cible explicite uniquement : GITEA_PUSH_URL est garantie posée par le garde-fou
# ci-dessus. On ne retombe JAMAIS sur un `git push` au remote ambiant (ADR 0073 §B).
git -C "$repo_root" push "$GITEA_PUSH_URL" HEAD:main

echo "✓ poussé. Argo CD réconcilie ; vérifier Synced/Healthy + lancer un run de validation."
