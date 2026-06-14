# syntax=docker/dockerfile:1
#
# apps/sillage/Dockerfile — image de l'app SvelteKit `sillage`.
#
# Build-once : compile l'app avec ses dépendances workspace
# (@univ-lehavre/atlas-*) puis l'expose via l'adapter Node sur :3000.
#
# Contexte de build : la RACINE du monorepo (pas apps/sillage), parce que
# le build a besoin du pnpm-lock.yaml, du pnpm-workspace.yaml et des
# package.json de tous les paquets workspace dont sillage dépend.
#
#   docker build -f apps/sillage/Dockerfile -t sillage-app .
#
# L'image est multi-stage : un stage `builder` lourd (toolchain pnpm +
# devDeps) produit le dossier `build/`, puis un stage `runner` léger ne
# garde que le runtime Node, le build et un node_modules de prod élagué.
#
# ── Variables PUBLIC_* (inlinées au build) ────────────────────────────
# sillage lit `$env/static/public` (PUBLIC_APPWRITE_ENDPOINT,
# PUBLIC_APPWRITE_PROJECT, PUBLIC_LOGIN_URL, PUBLIC_REDCAP_URL). En
# SvelteKit, `$env/static/public` est *figé au build* : ces valeurs
# doivent donc être fournies comme build-args, pas comme env runtime.
# Les valeurs par défaut ci-dessous pointent vers le sandbox local. Le
# docker-compose les passe en `args:`.
#
# Les variables PRIVÉES (`$env/static/private` : APPWRITE_KEY,
# REDCAP_API_TOKEN, ALLOWED_DOMAINS_REGEXP) sont lues à l'EXÉCUTION par
# l'adapter Node — elles arrivent via `environment:`/`.env` du compose,
# jamais en dur dans l'image.

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
# SvelteKit a besoin de vite/svelte-kit). Le store pnpm est mis en cache.
#
# On copie l'intégralité du contexte (node_modules exclus par
# .dockerignore) plutôt que d'énumérer chaque package.json : la chaîne de
# dépendances workspace de sillage est profonde (atlas-ui → auth → baas →
# errors → …) et une liste manuelle dériverait vite. `--frozen-lockfile`
# garantit qu'on installe exactement ce que le lockfile décrit. Le `prepare`
# racine (lefthook install) se neutralise sans git (garde dans le package.json
# racine), donc `pnpm install` passe en conteneur.
# ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────
# Builder — build l'app sillage + élague un node_modules de prod isolé.
# ──────────────────────────────────────────────────────────────────────
FROM deps AS builder

# Build-args → variables PUBLIC_* inlinées par vite/SvelteKit.
ARG PUBLIC_APPWRITE_ENDPOINT=http://localhost:8090/v1
ARG PUBLIC_APPWRITE_PROJECT=sillage
ARG PUBLIC_LOGIN_URL=http://localhost:5173/login
ARG PUBLIC_REDCAP_URL=http://localhost:8888/api/
ENV PUBLIC_APPWRITE_ENDPOINT=${PUBLIC_APPWRITE_ENDPOINT} \
    PUBLIC_APPWRITE_PROJECT=${PUBLIC_APPWRITE_PROJECT} \
    PUBLIC_LOGIN_URL=${PUBLIC_LOGIN_URL} \
    PUBLIC_REDCAP_URL=${PUBLIC_REDCAP_URL}

# Compile sillage ET ses dépendances workspace d'abord : turbo respecte
# `dependsOn: ["^build"]`, donc le `--filter` tire toute la chaîne amont
# (atlas-ui → auth → baas → …). Un simple `pnpm --filter … build` ne build
# QUE sillage et échouerait faute des `dist/` de ses dépendances.
RUN pnpm turbo build --filter=@univ-lehavre/atlas-sillage

# `pnpm deploy` matérialise un node_modules de PROD autonome (deps
# workspace résolues, devDeps écartées) hors du symlink-store, prêt à
# être copié seul dans le runner. --legacy : pnpm 10 hors workspace
# injecté exige ce flag pour cibler un filtre depuis la racine.
RUN pnpm --filter=@univ-lehavre/atlas-sillage --prod --legacy deploy /prod

# ──────────────────────────────────────────────────────────────────────
# Runner — image finale minimale : runtime Node, build/ et node_modules
# de prod élagué. Pas de pnpm, pas de sources, pas de devDeps.
# ──────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
# adapter-node lit PORT/HOST à l'exécution. On expose :3000 comme les autres
# images d'apps (atlas-dashboard, crf-dashboard) : le smoke de images.yml code
# le port en dur à 3000. Le :5173 dev (Vite) n'est qu'une convention locale, pas
# une contrainte de prod — la valeur runtime prime de toute façon.
ENV PORT=3000 \
    HOST=0.0.0.0

# node_modules de prod (pruné) + artefacts de build + package.json.
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /repo/apps/sillage/build ./build
COPY --from=builder /repo/apps/sillage/package.json ./package.json

# Sécurité : ne pas tourner en root. L'image node fournit déjà l'user
# `node` (uid 1000) — on lui donne la propriété puis on bascule dessus.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Healthcheck léger : l'app répond-elle ? (adapter-node sert le SSR sur
# `/`). wget est présent dans busybox/alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:3000/ || exit 1

# adapter-node : le serveur SSR est build/index.js.
CMD ["node", "build/index.js"]
