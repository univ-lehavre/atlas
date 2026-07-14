#!/usr/bin/env bash
# Build + push de la PRÉ-IMAGE de build « scholar-network-deps-base » (ADR cluster 0110).
#
# La pré-image est l'étage LOURD et FIGÉ du Dockerfile (cible `deps` : deps système,
# wheels du lock, extensions DuckDB, modèle ONNX) — le SEUL build qui touche Internet.
# On la construit RAREMENT (à chaque bump de `uv.lock`), ICI SUR LE POSTE DE CONTRÔLE
# (où le réseau est disponible), et on la pousse au registre interne. Le build du CODE
# (cible `code`) se fait ensuite AILLEURS et SANS réseau (`FROM ${DEPS_REF}`, in-pod) —
# c'est ce qui rend le cluster air-gappé pour le build (ADR cluster 0110 §2/§7).
#
# ── Tag = SHA_DEPS (source de vérité unique) ────────────────────────────────────
# La base est taguée `registry:80/scholar-network-deps-base:<SHA_DEPS>`, où SHA_DEPS est
# le digest des ENTRÉES de la cible `deps` (uv.lock + tranche Dockerfile + provenance
# ONNX), calculé par `scripts/check_deps_base_freshness.py --print-tag`. Le MÊME script
# sert de garde-fou avant un build de code (« la base de ce SHA_DEPS est-elle poussée ? ») :
# une seule source de vérité du tag, pas de double calcul (ADR 0110 §3). Tag immuable,
# jamais `:latest` (ADR cluster 0006).
#
# ── Registre air-gappé : port-forward ───────────────────────────────────────────
# `registry:80` n'est résoluble que côté nœud. Depuis le poste, joindre le registre via
#   kubectl port-forward svc/registry <lport>:80
# et passer REGISTRY_ENDPOINT=localhost:<lport> à ce script (le TAG garde le nom logique
# `registry:80/…`, seul l'endpoint de PUSH change). Sans port-forward, `--push` échoue.
#
# Usage :
#   deploy/build-deps-base.sh [--platform <p>] [--endpoint <host:port>] [--dry-run]
#     --platform  défaut = linux/arm64,linux/amd64 (index OCI multi-arch, ADR 0110)
#     --endpoint  endpoint de PUSH (défaut REGISTRY_ENDPOINT ou registry:80)
#     --dry-run   calcule le tag et affiche la commande SANS builder ni pousser
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dataops_ctx="$(cd "$here/../.." && pwd)"          # contexte de build = dataops/
cl_dir="$here/.."                                  # dataops/scholar-network-dagster/
check="$cl_dir/scripts/check_deps_base_freshness.py"

platform="linux/arm64,linux/amd64"
endpoint="${REGISTRY_ENDPOINT:-registry:80}"
dry_run=0
for arg in "$@"; do
  case "$arg" in
    --platform=*) platform="${arg#*=}" ;;
    --platform)   echo "✗ utiliser --platform=<p> (ex. --platform=linux/arm64)" >&2; exit 2 ;;
    --endpoint=*) endpoint="${arg#*=}" ;;
    --endpoint)   echo "✗ utiliser --endpoint=<host:port>" >&2; exit 2 ;;
    --dry-run)    dry_run=1 ;;
    *) echo "✗ argument inconnu : $arg" >&2; exit 2 ;;
  esac
done

# ── Outils requis ────────────────────────────────────────────────────────────
for tool in docker uv; do
  command -v "$tool" >/dev/null 2>&1 || { echo "✗ $tool introuvable (requis)." >&2; exit 1; }
done

# ── 1. Tag = SHA_DEPS, via le garde-fou (source de vérité unique) ────────────
# `--print-tag` imprime `registry:80/scholar-network-deps-base:<SHA_DEPS>` (nom logique).
logical_tag="$(uv --project "$cl_dir" run python "$check" --print-tag)"
sha_deps="${logical_tag##*:}"                       # la part après le dernier ':'
# Tag de PUSH : même image, endpoint substitué (registry:80 → l'endpoint réel).
push_tag="${endpoint}/scholar-network-deps-base:${sha_deps}"

echo "── build-deps-base : SHA_DEPS=$sha_deps ──"
echo "  tag logique : $logical_tag"
echo "  tag de push : $push_tag  (platform=$platform)"

build_cmd=(docker buildx build --platform "$platform" --target deps
  -f "$cl_dir/Dockerfile" -t "$push_tag" --push "$dataops_ctx")

if [ "$dry_run" -eq 1 ]; then
  echo "→ --dry-run : commande de build (non exécutée) :"
  printf '   %q ' "${build_cmd[@]}"; echo
  exit 0
fi

# ── 2. Build multi-arch + push de la cible `deps` ────────────────────────────
echo "→ build + push de la pré-image (cible deps, egress : deps + DuckDB + ONNX)"
"${build_cmd[@]}"

# ── 3. Vérification post-push : la base est bien présente au registre ────────
# On rejoue le garde-fou en mode ONLINE : il doit maintenant trouver la base (exit 0).
echo "→ vérification : la pré-image $sha_deps est présente au registre"
REGISTRY_ENDPOINT="$endpoint" uv --project "$cl_dir" run python "$check" \
  --check-registry --registry-endpoint "$endpoint"

# ── 4. Matérialise la référence pour la chaîne de livraison (ADR 0104) ───────
# Le workflow in-cluster (.gitea/workflows/livraison.yaml) LIT ce fichier pour le
# FROM de la cible `code` : le runner (air-gappé, sans python) ne recalcule rien.
# La FRAÎCHEUR est gardée au portail QUALITÉ : un test pytest vérifie que ce
# fichier == `--print-tag` — bumper le lock sans re-builder la pré-image (et
# committer ce fichier) casse la CI GitHub AVANT le merge.
printf '%s\n' "$logical_tag" > "$cl_dir/deploy/deps-base.ref"
echo "→ deploy/deps-base.ref mis à jour — à COMMITTER avec le bump du lock."

echo "✓ pré-image poussée : $logical_tag"
echo "  Le build de code peut désormais faire FROM …:$sha_deps (--build-arg DEPS_REF)."
