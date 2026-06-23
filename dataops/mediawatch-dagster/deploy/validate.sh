#!/usr/bin/env bash
# Garde-fou des manifestes de déploiement de la code-location Dagster « mediawatch ».
#
# Le contrat cluster↔atlas (ADR 0033) se tient « par discipline » : ce script
# remplace une partie de cette discipline par une vérification mécanique, pour
# attraper les dérives silencieuses (manifeste qui ne build pas, image `:dev`
# qui fuite en prod, variable de contrat perdue) AVANT le banc.
#
# Vérifie, pour chaque overlay (bench, prod) :
#   1. l'overlay se construit (`kubectl kustomize`) ;
#   2. le rendu est valide vis-à-vis des schémas K8s (kubeconform) ;
#   3. invariants de contrat : OPENLINEAGE_URL présent ; en prod, image jamais en
#      `:dev` et envFrom du ConfigMap BUCKET_* (atlas-mediawatch).
#
# NB : pas d'invariant MLFLOW ici (contrairement à citation) — la v1 mediawatch
# n'entraîne aucun modèle (périmètre « articles seulement », ADR 0064).
#
# Usage : dataops/mediawatch-dagster/deploy/validate.sh  (ou `pnpm dataops:manifests`)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
overlays=("bench" "prod")

# kubeconform est optionnel localement (peut manquer) ; en CI il est installé.
# kubectl est requis (porte `kustomize`).
if ! command -v kubectl >/dev/null 2>&1; then
  echo "✗ kubectl introuvable (requis pour kubectl kustomize)." >&2
  exit 1
fi
have_kubeconform=0
command -v kubeconform >/dev/null 2>&1 && have_kubeconform=1 || \
  echo "⚠ kubeconform absent : validation de schéma sautée (build + invariants seuls)."

fail=0
for o in "${overlays[@]}"; do
  echo "── overlay: $o ──────────────────────────────────────────"
  rendered="$(kubectl kustomize "$here/overlays/$o")" || {
    echo "✗ $o : kustomize build a échoué." >&2; fail=1; continue; }
  echo "✓ build"

  if [ "$have_kubeconform" = 1 ]; then
    # -strict : rejette les champs inconnus. Les CRD (ObjectBucketClaim,
    # Application Argo) ne sont pas dans le schéma standard → on les ignore
    # (ignore-missing-schemas), le but ici est de valider les ressources cœur.
    if printf '%s' "$rendered" | kubeconform -strict -summary -ignore-missing-schemas; then
      echo "✓ kubeconform"
    else
      echo "✗ $o : kubeconform a signalé des erreurs." >&2; fail=1
    fi
  fi

  # Invariant commun : OPENLINEAGE_URL doit être injecté (sinon le lineage tombe
  # en no-op silencieux — la régression qu'on prévient, piège ADR 0086).
  if ! printf '%s' "$rendered" | grep -q 'OPENLINEAGE_URL'; then
    echo "✗ $o : OPENLINEAGE_URL absent du rendu." >&2; fail=1
  else
    echo "✓ OPENLINEAGE_URL présent"
  fi

  if [ "$o" = "prod" ]; then
    # Contrat ADR 0033 : pas de tag `:dev`/`latest` en production (ni sur
    # l'image du conteneur, ni sur DAGSTER_CURRENT_IMAGE des run workers).
    if printf '%s' "$rendered" | grep -q ':dev\b'; then
      echo "✗ prod : tag :dev présent (interdit en production)." >&2; fail=1
    else
      echo "✓ aucun tag :dev"
    fi
    # En prod, le ConfigMap BUCKET_* de l'OBC doit être branché en plus du Secret.
    if ! printf '%s' "$rendered" | grep -q 'configMapRef'; then
      echo "✗ prod : configMapRef (BUCKET_* de l'OBC) non branché." >&2; fail=1
    else
      echo "✓ configMapRef OBC branché"
    fi
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "✗ Validation des manifestes ÉCHOUÉE." >&2
  exit 1
fi
echo "✓ Manifestes de déploiement validés (${overlays[*]})."
