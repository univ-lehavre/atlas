#!/usr/bin/env bash
# Build + push de l'IMAGE DE CODE « pageviews-dagster » (cible `code` du Dockerfile).
#
# DOCTRINE (révision : build hors cluster, ADR cluster 0110 amendé). Le build in-pod
# (buildkit rootless) a été ABANDONNÉ : PodSecurity `baseline` (k8s ≥ 1.34) refuse le
# `seccompProfile: Unconfined` que tout moteur de build rootless exige, et l'automatisme
# « build à chaque merge » n'existe plus (Argo Events abrogé, ADR 0105/0106 → le build est
# déjà manuel). On construit donc l'image de code ICI, SUR LE POSTE DE CONTRÔLE, comme la
# pré-image `deps-base`. Le GitOps est INCHANGÉ : le digest produit ici est injecté dans
# l'overlay prod (`__PAGEVIEWS_IMAGE_DIGEST__`) puis Argo CD déploie par digest immuable.
#
# ── FROM deps-base : au REGISTRE (multi-arch) ───────────────────────────────────
# La cible `code` fait `FROM ${DEPS_REF}`. On la pointe sur la deps-base AU REGISTRE (pas
# un cache local) : l'image de code est MULTI-ARCH (arm64 pour le banc Lima, amd64 pour la
# prod dirqual), or un cache Docker local ne porte qu'UNE arch. La deps-base multi-arch doit
# donc vivre au registre — d'où `build-deps-base.sh` qui l'y pousse EN PRÉALABLE. Idéalement
# `DEPS_REF` est un DIGEST immuable `…@sha256:…` (reproductibilité, ADR cluster 0006).
#
# ── Registre air-gappé : port-forward ───────────────────────────────────────────
# `registry:80` n'est résoluble que côté nœud. Depuis le poste, joindre le registre via
#   kubectl port-forward svc/registry <lport>:80
# et passer --endpoint=localhost:<lport> (le TAG garde le nom logique `registry:80/…`, seul
# l'endpoint de PULL de la base et de PUSH de l'image change). Sans port-forward, `--push`
# et le `FROM` de la base au registre échouent.
#
# ── Digest de sortie → GitOps ────────────────────────────────────────────────────
# `--metadata-file` capture `containerimage.digest` (le digest de l'index multi-arch poussé).
# C'est LUI qu'on injecte dans l'overlay prod (côté cluster : `push_atlas_tree`). Le script
# l'imprime et l'écrit dans un fichier pour un usage machine.
#
# Usage :
#   deploy/build-code.sh [--platform <p>] [--endpoint <host:port>]
#                        [--deps-ref <ref>] [--tag <tag>] [--digest-file <f>] [--dry-run]
#     --platform    défaut = linux/arm64,linux/amd64 (index OCI multi-arch)
#     --endpoint    endpoint PULL base + PUSH image (défaut REGISTRY_ENDPOINT ou registry:80)
#     --deps-ref    ref COMPLÈTE de la pré-image (défaut : le tag SHA_DEPS du garde-fou)
#     --tag         tag de l'image de code (défaut `dev` → registry:80/pageviews-dagster:dev)
#     --digest-file fichier où écrire le digest sha256:… produit (défaut : stdout seul)
#     --dry-run     affiche la commande SANS builder ni pousser
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dataops_ctx="$(cd "$here/../.." && pwd)"          # contexte de build = dataops/
cl_dir="$here/.."                                  # dataops/pageviews-dagster/
deps_check="$cl_dir/scripts/check_deps_base_freshness.py"

platform="linux/arm64,linux/amd64"
endpoint="${REGISTRY_ENDPOINT:-registry:80}"
deps_ref=""
tag="dev"
digest_file=""
dry_run=0
for arg in "$@"; do
  case "$arg" in
    --platform=*)    platform="${arg#*=}" ;;
    --platform)      echo "✗ utiliser --platform=<p>" >&2; exit 2 ;;
    --endpoint=*)    endpoint="${arg#*=}" ;;
    --endpoint)      echo "✗ utiliser --endpoint=<host:port>" >&2; exit 2 ;;
    --deps-ref=*)    deps_ref="${arg#*=}" ;;
    --deps-ref)      echo "✗ utiliser --deps-ref=<ref>" >&2; exit 2 ;;
    --tag=*)         tag="${arg#*=}" ;;
    --tag)           echo "✗ utiliser --tag=<tag>" >&2; exit 2 ;;
    --digest-file=*) digest_file="${arg#*=}" ;;
    --digest-file)   echo "✗ utiliser --digest-file=<f>" >&2; exit 2 ;;
    --dry-run)       dry_run=1 ;;
    *) echo "✗ argument inconnu : $arg" >&2; exit 2 ;;
  esac
done

# ── Outils requis ────────────────────────────────────────────────────────────
for tool in docker uv; do
  command -v "$tool" >/dev/null 2>&1 || { echo "✗ $tool introuvable (requis)." >&2; exit 1; }
done

# ── 1. Ref de la pré-image (DEPS_REF) : source de vérité = le garde-fou SHA_DEPS ──
# Sauf override explicite, on dérive le tag de la deps-base du MÊME script que
# `build-deps-base.sh` a utilisé pour la pousser → cohérence tag↔Dockerfile garantie,
# pas de double calcul. Le nom logique `registry:80/…` est réécrit vers l'endpoint réel.
if [ -z "$deps_ref" ]; then
  logical_deps="$(uv --project "$cl_dir" run python "$deps_check" --print-tag)"
  sha_deps="${logical_deps##*:}"
  deps_ref="${endpoint}/pageviews-deps-base:${sha_deps}"
fi

# ── 2. Tag de PUSH de l'image de code (endpoint substitué) ────────────────────
push_tag="${endpoint}/pageviews-dagster:${tag}"
meta_file="$(mktemp -t pageviews-code-meta.XXXXXX.json)"
trap 'rm -f "$meta_file"' EXIT

echo "── build-code : image de CODE pageviews-dagster ──"
echo "  DEPS_REF (base)  : $deps_ref"
echo "  tag de push      : $push_tag  (platform=$platform)"

build_cmd=(docker buildx build --platform "$platform" --target code
  -f "$cl_dir/Dockerfile" --build-arg "DEPS_REF=${deps_ref}"
  -t "$push_tag" --metadata-file "$meta_file" --push "$dataops_ctx")

if [ "$dry_run" -eq 1 ]; then
  echo "→ --dry-run : commande de build (non exécutée) :"
  printf '   %q ' "${build_cmd[@]}"; echo
  exit 0
fi

# ── 3. Build multi-arch + push de la cible `code` (FROM deps-base, zéro egress) ──
echo "→ build + push de l'image de code (cible code, FROM deps-base, UV_OFFLINE)"
"${build_cmd[@]}"

# ── 4. Digest de sortie → à injecter dans l'overlay GitOps ───────────────────
# `--metadata-file` produit un JSON dont `containerimage.digest` est le digest de l'index
# poussé (le sha256:… que le manifeste prod attend). On l'extrait sans dépendance externe.
digest="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["containerimage.digest"])' "$meta_file")"
[ -n "$digest" ] || { echo "✗ digest introuvable dans $meta_file" >&2; exit 1; }

echo "✓ image de code poussée : $push_tag"
echo "  digest : $digest"
echo "  → à injecter dans overlays/prod (__PAGEVIEWS_IMAGE_DIGEST__) pour le déploiement GitOps."
if [ -n "$digest_file" ]; then
  printf '%s\n' "$digest" > "$digest_file"
  echo "  digest écrit dans : $digest_file"
fi
