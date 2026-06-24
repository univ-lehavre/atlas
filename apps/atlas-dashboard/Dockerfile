# syntax=docker/dockerfile:1
#
# apps/atlas-dashboard/Dockerfile — image de l'app SvelteKit `atlas-dashboard`.
#
# Build-once : compile l'app avec ses dépendances workspace
# (@univ-lehavre/atlas-*) puis l'expose via l'adapter Node sur :3000.
#
# Contexte de build : la RACINE du monorepo (pas apps/atlas-dashboard), parce que
# le build a besoin du pnpm-lock.yaml, du pnpm-workspace.yaml et des
# package.json de tous les paquets workspace dont atlas-dashboard dépend.
#
#   docker build -f apps/atlas-dashboard/Dockerfile -t atlas-atlas-dashboard .
#
# Image multi-stage : un `builder` lourd (toolchain pnpm + devDeps) produit
# `build/`, puis un `runner` léger ne garde que le runtime Node, le build et
# un node_modules de prod élagué.

# Aligné sur .nvmrc (Node 24.18.0, figé au patch — parité dev/prod,
# facteur X). Alpine pour une image runtime légère.
ARG NODE_VERSION=24.18.0
ARG ALPINE_VERSION=3.24

# ──────────────────────────────────────────────────────────────────────
# Base — active corepack/pnpm à la version pinnée dans package.json.
# ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ──────────────────────────────────────────────────────────────────────
# Deps — installe TOUTES les deps du workspace (devDeps incluses : le build
# SvelteKit a besoin de vite/svelte-kit). Le store pnpm est mis en cache.
# Le `prepare` racine (lefthook install) se neutralise sans git (cf. son
# garde dans le package.json racine), donc `pnpm install` passe en conteneur.
# ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────
# Builder — build l'app atlas-dashboard + élague un node_modules de prod isolé.
# ──────────────────────────────────────────────────────────────────────
FROM deps AS builder

# Cette app ne lit pas de $env/static/public (aucune variable PUBLIC_* à
# inliner au build) : toute sa config arrive à l'exécution.

# Compile atlas-dashboard ET ses dépendances workspace d'abord : turbo respecte
# `dependsOn: ["^build"]`, donc le `--filter` tire toute la chaîne amont.
RUN pnpm turbo build --filter=@univ-lehavre/atlas-dashboard

# `pnpm deploy` matérialise un node_modules de PROD autonome (deps workspace
# résolues, devDeps écartées). --legacy : pnpm 10 l'exige pour cibler un
# filtre depuis la racine.
RUN pnpm --filter=@univ-lehavre/atlas-dashboard --prod --legacy deploy /prod

# ──────────────────────────────────────────────────────────────────────
# Runner — image finale minimale : runtime Node, build/ et node_modules
# de prod élagué. Pas de pnpm, pas de sources, pas de devDeps.
# ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
# adapter-node lit PORT/HOST à l'exécution.
ENV PORT=3000 \
    HOST=0.0.0.0

COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /repo/apps/atlas-dashboard/build ./build
COPY --from=builder /repo/apps/atlas-dashboard/package.json ./package.json

# Sécurité : ne pas tourner en root. L'image node fournit l'user `node` (uid 1000).
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Healthcheck léger : l'app SSR répond-elle sur `/` ? wget vient de busybox/alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "build/index.js"]
