#!/bin/bash
# Publie les paquets sur les deux registres (npm public + GitHub Packages).
# Appelé par changesets/action après le versioning (cf. ADR 0017).
#
# Deux garde-fous appris à la dure (Phase 15) :
#  1. L'étape npm (`changeset publish`) ne doit PAS, en cas d'échec,
#     court-circuiter la publication GitHub Packages. On capture donc son
#     code de sortie au lieu de laisser `set -e` tuer le script — GitHub
#     Packages reste un registre de repli même quand npm échoue (ex. token
#     npm exigeant une OTP/2FA en CI).
#  2. La boucle GitHub Packages doit couvrir TOUTES les catégories
#     publiables (`packages/`, `cli/`, `services/`, `config/`, `assets/`),
#     pas seulement `packages/` — sinon les CLIs ne sont jamais poussés.

set -euo pipefail

npm_status=0

echo "📦 Publishing packages to npm (registry.npmjs.org)..."
# Ne pas laisser un échec npm (EOTP/2FA, réseau, version déjà publiée…)
# interrompre la suite : on mémorise l'échec et on le rejoue à la fin.
pnpm changeset publish || npm_status=$?
if [ "$npm_status" -ne 0 ]; then
  echo "::warning::npm publish a échoué (code $npm_status) — on poursuit vers GitHub Packages, l'échec npm sera resignalé en fin de script."
fi

echo ""
echo "📦 Publishing packages to GitHub Packages (npm.pkg.github.com)..."
# changeset publish ne supporte pas --registry ; on publie sur GitHub
# Packages en itérant sur tous les paquets publiables et en appelant
# `pnpm publish` directement. Couvre toutes les catégories publiables.
find packages cli services config assets -maxdepth 2 -name "package.json" \
  ! -path "*/node_modules/*" \
  ! -path "*/.svelte-kit/*" \
  ! -path "*/dist/*" 2>/dev/null | while read -r pkg; do
  private=$(node -e "const p=require('./$pkg'); process.stdout.write(String(p.private ?? false))")
  name=$(node -e "const p=require('./$pkg'); process.stdout.write(p.name ?? '')")
  if [ "$private" = "false" ] && [ -n "$name" ]; then
    dir=$(dirname "$pkg")
    echo "  Publishing $name from $dir..."
    # `|| true` : GitHub Packages renvoie une erreur si la version est déjà
    # publiée — non bloquant, on veut juste pousser les nouvelles versions.
    pnpm --filter "$name" publish --registry https://npm.pkg.github.com --provenance --no-git-checks 2>&1 || true
  fi
done

echo ""
if [ "$npm_status" -ne 0 ]; then
  echo "❌ Publication terminée mais l'étape npm a échoué (code $npm_status)."
  echo "   Vérifier le secret NPM_TOKEN (un automation token sans 2FA est requis"
  echo "   pour publier depuis le CI ; voir ADR 0017)."
  exit "$npm_status"
fi
echo "✅ Published successfully!"
