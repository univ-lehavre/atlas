# syntax=docker/dockerfile:1
#
# services/crf/Dockerfile — image du microservice HTTP `crf` (Hono).
#
# Build-once : compile le service avec ses dépendances workspace
# (@univ-lehavre/atlas-crf-client) puis l'expose via Node sur :3000.
#
# Contexte de build : la RACINE du monorepo (pas services/crf), parce que
# le build a besoin du pnpm-lock.yaml, du pnpm-workspace.yaml et des
# package.json de tous les paquets workspace dont le service dépend.
#
#   docker build -f services/crf/Dockerfile -t atlas-crf .
#
# L'image est multi-stage : un stage `builder` lourd (toolchain pnpm +
# devDeps) produit le dossier `dist/`, puis un stage `runner` léger ne
# garde que le runtime Node, le build et un node_modules de prod élagué.
#
# ── Configuration (toute à l'EXÉCUTION) ───────────────────────────────
# Contrairement aux apps SvelteKit, le service n'a pas de variables
# `PUBLIC_*` inlinées au build : toute sa config est lue à l'exécution via
# `Config` Effect (services/crf/src/server/env.ts). Variables requises au
# démarrage (fail-closed) : REDCAP_API_URL, REDCAP_API_TOKEN,
# CRF_AUTH_TOKEN (Bearer /api/*, ADR 0041). Optionnelles : PORT (défaut
# 3000), DISABLE_RATE_LIMIT. Elles arrivent par `environment:`/secrets du
# déploiement, jamais en dur dans l'image.

# Aligné sur .nvmrc (Node 24.15.0, figé au patch — parité dev/prod,
# facteur X). Alpine pour une image runtime légère.
ARG NODE_VERSION=24.15.0
ARG ALPINE_VERSION=3.22

# ──────────────────────────────────────────────────────────────────────
# Base — active corepack/pnpm à la version pinnée dans package.json.
# ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# corepack lit `packageManager` du package.json racine (pnpm@10.x).
RUN corepack enable
WORKDIR /repo

# ──────────────────────────────────────────────────────────────────────
# Deps — installe TOUTES les deps du workspace (avec devDeps : le build
# tsc a besoin de typescript). Le store pnpm est mis en cache.
#
# On copie l'intégralité du contexte (node_modules exclus par
# .dockerignore) plutôt que d'énumérer chaque package.json : `--frozen-lockfile`
# garantit qu'on installe exactement ce que le lockfile décrit.
# ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────
# Builder — build le service crf + élague un node_modules de prod isolé.
# ──────────────────────────────────────────────────────────────────────
FROM deps AS builder

# Compile crf ET ses dépendances workspace (atlas-crf-client) d'abord :
# turbo respecte `dependsOn: ["^build"]`, donc le `--filter` tire toute la
# chaîne de build amont. Un simple `pnpm --filter … build` ne build QUE crf
# et échouerait faute des `dist/` de ses dépendances.
RUN pnpm turbo build --filter=@univ-lehavre/atlas-crf

# `pnpm deploy` matérialise un node_modules de PROD autonome (deps
# workspace résolues, devDeps écartées) hors du symlink-store, prêt à
# être copié seul dans le runner. --legacy : pnpm 10 hors workspace
# injecté exige ce flag pour cibler un filtre depuis la racine.
RUN pnpm --filter=@univ-lehavre/atlas-crf --prod --legacy deploy /prod

# ──────────────────────────────────────────────────────────────────────
# Runner — image finale minimale : runtime Node, dist/ et node_modules
# de prod élagué. Pas de pnpm, pas de sources, pas de devDeps.
# ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
# Le service lit PORT à l'exécution (défaut 3000 dans env.ts) ; on aligne
# l'EXPOSE et le healthcheck sur cette valeur.
ENV PORT=3000

# node_modules de prod (pruné) + artefacts de build + package.json.
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /repo/services/crf/dist ./dist
COPY --from=builder /repo/services/crf/package.json ./package.json

# Sécurité : ne pas tourner en root. L'image node fournit déjà l'user
# `node` (uid 1000) — on lui donne la propriété puis on bascule dessus.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Healthcheck léger : la sonde /health répond-elle ? (route ouverte, non
# authentifiée). wget est présent dans busybox/alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:3000/health || exit 1

# Entrée du service compilé. Pas de --env-file ici (le script `start` du
# package vise le dev local) : en conteneur, les variables arrivent par
# l'environnement du déploiement.
CMD ["node", "dist/server/index.js"]
