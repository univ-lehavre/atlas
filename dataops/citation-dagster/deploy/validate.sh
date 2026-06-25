#!/usr/bin/env bash
# Garde-fou des manifestes de déploiement de la code-location Dagster.
#
# Le contrat cluster↔atlas (ADR 0033) se tient « par discipline » : ce script
# remplace une partie de cette discipline par une vérification mécanique, pour
# attraper les dérives silencieuses (manifeste qui ne build pas, image `:dev`
# qui fuite en prod, variable de contrat perdue) AVANT le banc.
#
# Vérifie, pour chaque overlay (bench, prod) :
#   1. l'overlay se construit (`kubectl kustomize`) ;
#   2. le rendu est valide vis-à-vis des schémas K8s (kubeconform) ;
#   3. invariants de contrat : MLFLOW_TRACKING_URI présent ; en prod, image
#      jamais en `:dev` et envFrom du ConfigMap BUCKET_* (citation-datalake).
#
# Usage : dataops/citation-dagster/deploy/validate.sh   (ou `pnpm dataops:manifests`)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
overlays=("bench" "prod")

# kubeconform est optionnel localement (peut manquer) ; en CI il est installé.
# kubectl est requis (porte `kustomize`).
if ! command -v kubectl >/dev/null 2>&1; then
  echo "✗ kubectl introuvable (requis pour `kubectl kustomize`)." >&2
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

  # Invariant commun : MLFLOW_TRACKING_URI doit être injecté (sinon drift/CT
  # loggent en no-op silencieux — la régression qu'on prévient).
  if ! printf '%s' "$rendered" | grep -q 'MLFLOW_TRACKING_URI'; then
    echo "✗ $o : MLFLOW_TRACKING_URI absent du rendu." >&2; fail=1
  else
    echo "✓ MLFLOW_TRACKING_URI présent"
  fi

  # Invariant commun QoS (issue #400) : la code-location doit déclarer des
  # resources.limits (sinon BestEffort, premier tué sous pression mémoire) ET un
  # PodDisruptionBudget (anti-SPOF sur replicas:1). On garde leur présence pour
  # qu'un retrait silencieux fasse échouer la validation.
  if ! printf '%s' "$rendered" | grep -q 'limits:'; then
    echo "✗ $o : resources.limits absentes (QoS BestEffort)." >&2; fail=1
  else
    echo "✓ resources.limits présentes"
  fi
  if ! printf '%s' "$rendered" | grep -q 'kind: PodDisruptionBudget'; then
    echo "✗ $o : PodDisruptionBudget absent (SPOF non couvert)." >&2; fail=1
  else
    echo "✓ PodDisruptionBudget présent"
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
    # Pods de RUN : definitions.py branche la source S3 via CITATION_S3_SECRET /
    # CITATION_S3_CONFIGMAP (le nom vit dans le Python, hors du rendu kustomize —
    # angle mort de ce garde). En prod l'OBC sépare Secret AWS_* et ConfigMap
    # BUCKET_* : les DEUX variables doivent être posées sur le Deployment, sinon le
    # pod de run échoue (« Secret not found ») ou perd BUCKET_*. On vérifie leur
    # présence ET que CITATION_S3_SECRET pointe le MÊME nom que l'ObjectBucketClaim.
    obc_name="$(printf '%s' "$rendered" | awk '
      $1=="kind:" && $2=="ObjectBucketClaim"{f=1}
      f && $1=="name:"{print $2; exit}')"
    for v in CITATION_S3_SECRET CITATION_S3_CONFIGMAP; do
      # grep -F (chaîne fixe) : pas de \b portable en awk/grep BSD comme GNU.
      if ! printf '%s' "$rendered" | grep -qF "name: $v"; then
        echo "✗ prod : $v absent du Deployment (pods de run sans source S3)." >&2; fail=1
      else
        echo "✓ $v présent"
      fi
    done
    if [ -n "$obc_name" ]; then
      # La valeur de CITATION_S3_SECRET (ligne `value:` suivant son `name:`) doit
      # être le nom de la claim — sinon le pod de run vise un Secret inexistant.
      # index($0, k) plutôt que /.../ : pas de \b, et on isole le nom EXACT (le préfixe
      # CITATION_S3_SECRET est aussi celui de _CONFIGMAP → ancrer sur la fin de ligne).
      # Le nom est un item de liste YAML : `- name: CITATION_S3_SECRET` → $2/$3 ;
      # la valeur suit sur sa propre ligne : `value: citation-datalake` → $1/$2.
      s3_secret_val="$(printf '%s' "$rendered" | awk '
        $2=="name:" && $3=="CITATION_S3_SECRET"{f=1; next}
        f && $1=="value:"{print $2; exit}')"
      if [ "$s3_secret_val" != "$obc_name" ]; then
        echo "✗ prod : CITATION_S3_SECRET ($s3_secret_val) ≠ ObjectBucketClaim ($obc_name)." >&2
        fail=1
      else
        echo "✓ CITATION_S3_SECRET aligné sur l'OBC ($obc_name)"
      fi
    fi

    # Contrat ADR 0075 : en prod, `atlas` ne résout PAS l'image — il n'expose que
    # des placeholders que le seed cluster remplit par le digest immuable au
    # déploiement. On vérifie sur les FICHIERS SOURCES (pas le rendu : kustomize
    # concatène le digest au champ `image:`) que les deux placeholders sont
    # présents et intacts. Les graver par une valeur d'instance (digest/tag réel)
    # serait une régression silencieuse vers l'ancien double-couplage : on la rend
    # bruyante ici.
    for ph in \
      "__CITATION_IMAGE_DIGEST__:kustomization.yaml" \
      "__CITATION_IMAGE__:patch-s3-envfrom.yaml"; do
      placeholder="${ph%%:*}"; src="$here/overlays/prod/${ph##*:}"
      if ! grep -qF "$placeholder" "$src"; then
        echo "✗ prod : placeholder $placeholder absent de $(basename "$src") — l'image" >&2
        echo "  de prod ne doit pas être résolue côté atlas (digest injecté par cluster, ADR 0075)." >&2
        fail=1
      else
        echo "✓ placeholder $placeholder intact ($(basename "$src"))"
      fi
    done
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "✗ Validation des manifestes ÉCHOUÉE." >&2
  exit 1
fi
echo "✓ Manifestes de déploiement validés (${overlays[*]})."
