#!/bin/sh
# LE geste de mise en production (ADR 0104) : pousser le `main` REVU vers la forge
# Gitea d'une instance. Tout l'aval est AUTONOME (l'usine, ADR cluster 0112/0113) :
#
#   push main → Gitea Actions (.gitea/workflows/livraison.yaml)
#     → build in-pod des code-locations changées (buildctl → buildkitd, zéro egress)
#     → write-back des digests sur la branche `deploy` (scripts/regenerate-deploy.sh)
#     → Argo CD (targetRevision: deploy) : migrations PreSync + rollout par digest.
#
# Ce script est le SEUL geste ; il ne builde rien, ne déploie rien lui-même.
#
# Ce qui est poussé = `origin/main` (le main GitHub, revu et mergé), PAS le HEAD
# local : on ne livre jamais un état de travail. (Le flux « tout local » du banc
# léger reste `dataops/<cl>-dagster/deploy/install.sh bench`.)
#
# Garde de cible (ADR 0073 §B) : la forge cible se LIT dans le `.env` d'instance
# (`GITEA_PUSH_URL`, généré par `nestor access` du dépôt cluster — contrat ADR 0033) ;
# elle n'est JAMAIS déduite de l'environnement ambiant. Cible absente = refus bruyant.
#
# Usage : dataops/deploy.sh [--yes]
#   --yes : saute la confirmation (usage scripté ; le geste reste humain, ADR 0033).
set -eu

here="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$here/.." && pwd)"

ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --yes | -y) ASSUME_YES=1 ;;
    *) echo "✗ option inconnue : $arg (usage : dataops/deploy.sh [--yes])" >&2; exit 2 ;;
  esac
done

# ── Garde de cible (ADR 0073 §B) ─────────────────────────────────────────────
env_file="$repo_root/.env.cluster.local"
# shellcheck source=/dev/null
if [ -f "$env_file" ]; then
  set -a; . "$env_file"; set +a
fi
if [ -z "${GITEA_PUSH_URL:-}" ]; then
  echo "✗ cible de livraison non confirmée : GITEA_PUSH_URL absente." >&2
  echo "  Atlas LIT sa cible dans $env_file (généré par \`nestor access\` du" >&2
  echo "  dépôt cluster, contrat ADR 0033) ; il ne la devine pas. Régénérer le" >&2
  echo "  .env d'instance, ou exporter GITEA_PUSH_URL explicitement (ADR 0073 §B)." >&2
  exit 2
fi

# ── Ce qui sera livré : le main GitHub revu (jamais le HEAD local) ───────────
git -C "$repo_root" fetch -q origin main
sha="$(git -C "$repo_root" rev-parse --short=12 refs/remotes/origin/main)"
subject="$(git -C "$repo_root" log -1 --format=%s refs/remotes/origin/main)"

echo "── mise en production (ADR 0104) ──"
echo "  livré  : origin/main @ $sha — « $subject »"
echo "  cible  : $GITEA_PUSH_URL"
echo "  aval   : usine autonome (build in-pod → branche deploy → Argo CD)"

if [ "$ASSUME_YES" -ne 1 ]; then
  printf "  Confirmer le push (déclenche la chaîne de livraison) ? [y/N] "
  read -r reply
  case "$reply" in
    y | Y | yes | oui) ;;
    *) echo "✗ livraison annulée (rien n'a été poussé)."; exit 0 ;;
  esac
fi

git -C "$repo_root" push "$GITEA_PUSH_URL" "refs/remotes/origin/main:refs/heads/main"
echo "✓ poussé. Suivre : le run « livraison » sur la forge, puis Argo CD (Synced/Healthy)."
echo "  Rappel : schedules Dagster STOPPED par défaut — l'armement reste un geste (ADR 0062)."
