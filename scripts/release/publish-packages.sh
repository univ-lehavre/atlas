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
#
# Provenance : la provenance npm (attestation in-toto signée OIDC) n'est honorée
# QUE par registry.npmjs.org (registre primaire, couvert par `changeset publish`
# ci-dessus avec NPM_CONFIG_PROVENANCE=true). Sur GitHub Packages, `--provenance`
# n'apporte rien et peut faire échouer la publication côté serveur ; on le
# désactive donc explicitement pour cette boucle (ADR 0017, maj). Le mirror GH
# Packages reste un simple repli de disponibilité, sans attestation propre.
ghp_status=0
while read -r pkg; do
  private=$(node -e "const p=require('./$pkg'); process.stdout.write(String(p.private ?? false))")
  name=$(node -e "const p=require('./$pkg'); process.stdout.write(p.name ?? '')")
  if [ "$private" = "false" ] && [ -n "$name" ]; then
    dir=$(dirname "$pkg")
    echo "  Publishing $name from $dir..."
    # On ne masque PLUS tout échec avec `|| true` : on tolère le SEUL cas
    # bénin (version déjà publiée — GitHub Packages renvoie « cannot publish
    # over … »), et on propage le reste (token invalide, scope manquant,
    # réseau) via ghp_status pour faire rougir la Release au lieu de sortir un
    # faux « ✅ ».
    if ! out=$(NPM_CONFIG_PROVENANCE=false pnpm --filter "$name" publish \
      --registry https://npm.pkg.github.com --no-git-checks 2>&1); then
      if echo "$out" | grep -qiE 'cannot publish over|already exists|previously published|EPUBLISHCONFLICT'; then
        echo "    (déjà publié sur GitHub Packages — ignoré)"
      else
        echo "$out"
        echo "::error::Échec de publication GitHub Packages pour $name"
        ghp_status=1
      fi
    fi
  fi
  # Process substitution (`done < <(...)`) plutôt que `find … | while` : un pipe
  # exécute la boucle dans un SOUS-SHELL, où toute affectation de ghp_status est
  # perdue à la sortie. Ici la boucle tourne dans le shell courant, ghp_status
  # survit et peut être agrégé ci-dessous.
done < <(find packages cli services config assets -maxdepth 2 -name "package.json" \
  ! -path "*/node_modules/*" \
  ! -path "*/.svelte-kit/*" \
  ! -path "*/dist/*" 2>/dev/null)

echo ""
# On agrège les deux registres : la Release échoue si l'UN des deux a échoué,
# en privilégiant le code npm (registre primaire) pour le diagnostic.
if [ "$npm_status" -ne 0 ]; then
  echo "❌ Publication terminée mais l'étape npm a échoué (code $npm_status)."
  echo "   Vérifier le secret NPM_TOKEN (un automation token sans 2FA est requis"
  echo "   pour publier depuis le CI ; voir ADR 0017)."
  exit "$npm_status"
fi
if [ "$ghp_status" -ne 0 ]; then
  echo "❌ npm public OK, mais au moins une publication GitHub Packages a échoué."
  echo "   Registre primaire (npm) intact ; corriger le mirror puis rejouer"
  echo "   le workflow Release (workflow_dispatch). Voir ADR 0017."
  exit "$ghp_status"
fi
echo "✅ Published successfully!"
