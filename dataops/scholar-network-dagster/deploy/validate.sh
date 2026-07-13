#!/usr/bin/env bash
# Garde-fou des manifestes de déploiement de la code-location Dagster « scholar-network ».
#
# Le contrat cluster↔atlas (ADR 0033) se tient « par discipline » : ce script remplace
# une partie de cette discipline par une vérification mécanique, pour attraper les dérives
# silencieuses (manifeste qui ne build pas, image `:dev` qui fuite en prod, variable de
# contrat perdue) AVANT le déploiement.
#
# SQUELETTE (lot 1) : un SEUL overlay (`prod`). Vérifie :
#   1. l'overlay se construit (`kubectl kustomize`) ;
#   2. le rendu est valide vis-à-vis des schémas K8s (kubeconform) ;
#   3. invariants de contrat : MLFLOW_TRACKING_URI présent ; resources.limits + PDB ;
#      image jamais en `:dev` ; envFrom du ConfigMap BUCKET_* et alignement du Secret S3 ;
#      placeholders d'image (`__SCHOLAR_NETWORK_IMAGE__` / `__SCHOLAR_NETWORK_IMAGE_DIGEST__`)
#      intacts sur les fichiers sources.
#
# Usage : dataops/scholar-network-dagster/deploy/validate.sh   (ou `pnpm dataops:manifests`)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
overlays=("prod")

# kubeconform est optionnel localement (peut manquer) ; en CI il est installé.
# kubectl est requis (porte `kustomize`).
if ! command -v kubectl >/dev/null 2>&1; then
  echo "✗ kubectl introuvable (requis pour \`kubectl kustomize\`)." >&2
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
    # -strict : rejette les champs inconnus. Les CRD (ObjectBucketClaim, Application Argo)
    # ne sont pas dans le schéma standard → on les ignore (ignore-missing-schemas), le but
    # ici est de valider les ressources cœur.
    #
    # On capture le code de sortie pour DISTINGUER une vraie erreur de validation (exit 1)
    # d'un CRASH de l'outil (segfault 139, SIGPIPE 141… : code ≥ 126). kubeconform est un
    # binaire Go qui a occasionnellement segfaulté sur les runners CI : un crash de l'OUTIL
    # ne dit rien sur la validité des MANIFESTES — on l'émet en avertissement non bloquant
    # plutôt que de faire échouer la garde. Le `|| rc=$?` neutralise `set -e` le temps de lire.
    rc=0
    printf '%s' "$rendered" | kubeconform -strict -summary -ignore-missing-schemas || rc=$?
    if [ "$rc" -eq 0 ]; then
      echo "✓ kubeconform"
    elif [ "$rc" -ge 126 ]; then
      echo "⚠ $o : kubeconform a CRASHÉ (code $rc, ex. segfault runner) — validation de schéma sautée, pas un échec des manifestes." >&2
    else
      echo "✗ $o : kubeconform a signalé des erreurs (code $rc)." >&2; fail=1
    fi
  fi

  # Invariant commun : MLFLOW_TRACKING_URI doit être injecté (sinon le futur logging
  # drift/CT loguerait en no-op silencieux — la régression qu'on prévient).
  if ! printf '%s' "$rendered" | grep -q 'MLFLOW_TRACKING_URI'; then
    echo "✗ $o : MLFLOW_TRACKING_URI absent du rendu." >&2; fail=1
  else
    echo "✓ MLFLOW_TRACKING_URI présent"
  fi

  # Invariant commun QoS (issue #400) : la code-location doit déclarer des resources.limits
  # (sinon BestEffort, premier tué sous pression mémoire) ET un PodDisruptionBudget
  # (anti-SPOF sur replicas:1). On garde leur présence pour qu'un retrait fasse échouer.
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
    # Contrat ADR 0033 : pas de tag `:dev`/`latest` en production (ni sur l'image du
    # conteneur, ni sur DAGSTER_CURRENT_IMAGE des run workers).
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
    # Pods de RUN : le futur code branchera la source S3 via SCHOLAR_NETWORK_S3_SECRET /
    # SCHOLAR_NETWORK_S3_CONFIGMAP (les env/envFrom du Deployment ne se propagent PAS aux
    # pods de run, piège ADR 0086). En prod l'OBC sépare Secret AWS_* et ConfigMap BUCKET_* :
    # les DEUX variables doivent être posées sur le Deployment. On vérifie leur présence ET
    # que SCHOLAR_NETWORK_S3_SECRET pointe le MÊME nom que l'ObjectBucketClaim.
    obc_name="$(printf '%s' "$rendered" | awk '
      $1=="kind:" && $2=="ObjectBucketClaim"{f=1}
      f && $1=="name:"{print $2; exit}')"
    for v in SCHOLAR_NETWORK_S3_SECRET SCHOLAR_NETWORK_S3_CONFIGMAP; do
      # grep -F (chaîne fixe) : pas de \b portable en awk/grep BSD comme GNU.
      if ! printf '%s' "$rendered" | grep -qF "name: $v"; then
        echo "✗ prod : $v absent du Deployment (pods de run sans source S3)." >&2; fail=1
      else
        echo "✓ $v présent"
      fi
    done
    if [ -n "$obc_name" ]; then
      # La valeur de SCHOLAR_NETWORK_S3_SECRET (ligne `value:` suivant son `name:`) doit
      # être le nom de la claim — sinon le pod de run vise un Secret inexistant.
      # $2/$3 sur `- name: SCHOLAR_NETWORK_S3_SECRET` (item de liste YAML), puis $1/$2 sur
      # `value: scholar-network-datalake` (ligne suivante). Ancré sur $3 exact pour ne pas
      # confondre le préfixe commun avec …_CONFIGMAP.
      s3_secret_val="$(printf '%s' "$rendered" | awk '
        $2=="name:" && $3=="SCHOLAR_NETWORK_S3_SECRET"{f=1; next}
        f && $1=="value:"{print $2; exit}')"
      if [ "$s3_secret_val" != "$obc_name" ]; then
        echo "✗ prod : SCHOLAR_NETWORK_S3_SECRET ($s3_secret_val) ≠ ObjectBucketClaim ($obc_name)." >&2
        fail=1
      else
        echo "✓ SCHOLAR_NETWORK_S3_SECRET aligné sur l'OBC ($obc_name)"
      fi
    fi

    # Placeholders de l'overlay prod : des ancres que l'overlay ne doit PAS résoudre par une
    # valeur d'instance gravée. On les vérifie présents et intacts sur les FICHIERS SOURCES
    # (pas le rendu : kustomize concatène le digest au champ `image:`).
    #   - `__SCHOLAR_NETWORK_IMAGE__` / `__SCHOLAR_NETWORK_IMAGE_DIGEST__` : image par digest
    #     (ADR 0075/0110) — la graver = retour au double-couplage (audit #499).
    for ph in \
      "__SCHOLAR_NETWORK_IMAGE_DIGEST__:kustomization.yaml" \
      "__SCHOLAR_NETWORK_IMAGE__:patch-s3-envfrom.yaml"; do
      placeholder="${ph%%:*}"; src="$here/overlays/prod/${ph##*:}"
      if ! grep -qF "$placeholder" "$src"; then
        echo "✗ prod : placeholder $placeholder absent de $(basename "$src") — cette ancre" >&2
        echo "  ne doit pas être résolue par une valeur gravée côté atlas." >&2
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
