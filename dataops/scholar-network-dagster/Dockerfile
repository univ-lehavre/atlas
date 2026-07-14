# Image de la code-location Dagster « scholar-network » (ADR 0055).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m scholar_network_dagster.definitions`).
#
# ── Découpage pré-image de build : UN fichier, DEUX cibles (ADR cluster 0110) ────
# Ce Dockerfile décrit DEUX images au cycle de vie disjoint, en deux étages ciblables :
#
#   • cible `deps`  → la pré-image LOURDE `scholar-network-deps-base` : TOUT ce qui
#     touche Internet (deps système, wheels du lock, extensions DuckDB, modèle ONNX).
#     Build RARE (bump `uv.lock`), là où le réseau est disponible (poste de contrôle).
#         docker buildx build --platform linux/arm64,linux/amd64 --target deps \
#           -f dataops/scholar-network-dagster/Dockerfile \
#           -t registry:80/scholar-network-deps-base:<hash> --push dataops/
#
#   • cible `code` (défaut) → l'image de CODE : COPY src frais + install --no-deps.
#     AUCUN accès réseau. Build FRÉQUENT (chaque merge), reproductible hors-ligne —
#     donc IN-POD (buildkit rootless). Elle NE reconstruit PAS la base :
#     `FROM ${DEPS_REF}` PULL la pré-image publiée depuis le registre (par digest),
#     l'étage `deps` de ce fichier n'est alors PAS exécuté.
#         docker buildx build --platform linux/arm64 \
#           -f dataops/scholar-network-dagster/Dockerfile \
#           --build-arg DEPS_REF=registry:80/scholar-network-deps-base@sha256:… \
#           -t registry:80/scholar-network-dagster:<sha> --push dataops/
#
# Les deux cibles vivent dans UN fichier (lisibilité, source unique), mais restent
# DEUX builds indépendants poussés séparément — c'est ce qui préserve la disjonction
# des cycles (base rare / code fréquent) et rend le build de code air-gappé.
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/scholar-network-dagster/`) : cohérence
# avec les autres code-locations (chemins `-f` préfixés). Contrairement à citation,
# scholar-network N'EMBARQUE PAS de projet dbt (pas de couche de transformation
# dimensionnelle : chaîne linéaire brut→passes→profil, produit = vecteur pgvector,
# ADR 0103) — d'où l'ABSENCE de tout bloc dbt (COPY d'un sibling, `dbt parse`).

# ARG GLOBAL (déclaré AVANT tout FROM, sinon invisible dans le `FROM ${DEPS_REF}` de la
# cible `code` — règle Dockerfile). Référence la pré-image PUBLIÉE que la cible `code`
# consomme ; le défaut `:dev` sert le banc local. Injecté au build par --build-arg
# (idéalement un digest `@sha256:…` immuable en prod).
ARG DEPS_REF=registry:80/scholar-network-deps-base:dev

# ══════════════════════════════════════════════════════════════════════════════
# CIBLE `deps` — pré-image LOURDE, à egress, buildée rarement (hors cluster)
# ══════════════════════════════════════════════════════════════════════════════
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Dagster étant du pur
# Python, l'image se construit trivialement en arm64 pour le banc Lima.
#
# Image de base épinglée par digest (immuable), tag conservé pour la lisibilité.
# Maintenu par Dependabot (écosystème docker) — MAIS la *minor* Python est verrouillée
# sur 3.10 (parité cluster ; `requires-python >=3.10,<3.11`). Un bump qui change le tag
# (3.10 -> 3.x) DOIT être refusé : ne mettre à jour que le digest d'un `python:3.10-slim`.
FROM python:3.10-slim@sha256:e5300dc020a26a34a19337a57602955a2510e22abeb176edd6de6cd2cc927dd4 AS deps

# ── Étape egress 1/5 : dépendances système (apt) ────────────────────────────────
# rclone (MIT) est un binaire système (pas une dépendance pip) : disponible pour un
# éventuel sync (parité outillage des autres code-locations). ca-certificates pour TLS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Étape egress 2/5 : uv (gestionnaire de paquets) ─────────────────────────────
RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# ── Étape egress 3/5 : dépendances Python (wheels du lock) ──────────────────────
# Contexte = dataops/ → chemins préfixés par `scholar-network-dagster/`.
# On installe les dépendances EXACTES du lock (`uv export --frozen`) plutôt que `uv pip
# install .` (qui RÉSOUT À NEUF depuis pyproject en ignorant uv.lock → drift de transitives
# non épinglées, ex. grpcio-health-checking floté → VersionError protobuf du gRPC dagster).
# `--frozen` échoue si le lock est périmé vs pyproject (garde-fou). Le PAQUET applicatif
# lui-même (`--no-deps .`) est installé FRAIS dans la cible `code`, pas ici.
COPY scholar-network-dagster/pyproject.toml scholar-network-dagster/uv.lock scholar-network-dagster/README.md ./
RUN python -m uv export --frozen --no-dev --no-emit-project -o /tmp/requirements.txt \
    && python -m uv pip install --system -r /tmp/requirements.txt

# ── Étape egress 4/5 : extensions DuckDB cuites hors-ligne ──────────────────────
# Cuites HORS-LIGNE dans l'image (ADR 0055/0059 : aucune I/O réseau au runtime — DuckDB
# télécharge sinon ses extensions au premier usage). `httpfs` (lecture S3, brut pré-filtré
# + passes) + `postgres` (chargement de l'index pgvector via ATTACH, index_load). Répertoire
# figé, exporté par DUCKDB_EXTENSION_DIRECTORY, lu par lakehouse.connect().
ENV DUCKDB_EXTENSION_DIRECTORY=/opt/dagster/duckdb_extensions
RUN python -c "import duckdb; c=duckdb.connect(config={'extension_directory': '$DUCKDB_EXTENSION_DIRECTORY'}); c.execute('INSTALL httpfs'); c.execute('INSTALL postgres')"

# ── Étape egress 5/5 : modèle d'embedding ONNX cuit hors-ligne ──────────────────
# Modèle all-MiniLM-L6-v2 NON versionné dans git : téléchargé ICI à une révision HF figée
# + sha256 vérifié (scripts/fetch_model.py), puis figé dans l'image (« cuit hors-ligne »,
# aucune dépendance réseau au RUNTIME, ADR 0059). Pointé par ONNX_MODEL_DIR.
#
# `scripts/fetch_model.py` IMPORTE `scholar_network_dagster.model_provenance` (révision HF +
# sha256, source de vérité unique du package) → le paquet doit être installé AVANT le fetch.
# On installe le paquet EN L'ÉTAT (`--no-deps .`, aucun egress : les deps du lock sont déjà
# là). Ce `src` est un ARTEFACT DE BUILD TRANSITOIRE (juste pour faire tourner fetch_model) :
# le VRAI code frais est re-copié et RÉ-INSTALLÉ par-dessus dans la cible `code`.
COPY scholar-network-dagster/src ./src
RUN python -m uv pip install --system --no-deps .
COPY scholar-network-dagster/scripts ./scripts
ENV ONNX_MODEL_DIR=/opt/dagster/models/all-MiniLM-L6-v2
RUN python scripts/fetch_model.py "$ONNX_MODEL_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# CIBLE `code` (défaut) — image applicative, ZÉRO egress, buildée à chaque merge
# ══════════════════════════════════════════════════════════════════════════════
#
# `FROM ${DEPS_REF}` (l'ARG global) référence la pré-image PUBLIÉE (registre), PAS le
# stage `deps` ci-dessus : quand DEPS_REF pointe le registre, Docker PULL l'image figée et
# n'exécute PAS l'étage `deps` (aucun egress) — c'est ce qui rend ce build possible IN-POD,
# air-gappé. Le digest RÉEL est injecté au build (`--build-arg DEPS_REF=…@sha256:…`) ; le
# défaut `:dev` sert le banc local.
FROM ${DEPS_REF} AS code

# Ceinture-bretelles ZÉRO-egress : force uv en mode hors-ligne. Toute résolution/téléchargement
# réseau au build échoue au lieu de « réussir en trichant » (ADR cluster 0110). Les wheels des
# deps vivent déjà dans la pré-image.
ENV UV_OFFLINE=1

WORKDIR /opt/dagster/app

# Code applicatif FRAIS : re-copié et RÉ-INSTALLÉ par-dessus le paquet transitoire de la
# pré-image. `--no-deps` : les dépendances (EXACTES, du lock) sont déjà installées dans la
# pré-image → ne RIEN re-résoudre ni re-télécharger.
COPY scholar-network-dagster/pyproject.toml scholar-network-dagster/README.md ./
COPY scholar-network-dagster/src ./src
RUN python -m uv pip install --system --no-deps .

# Exécution en utilisateur non privilégié (jamais root, contrat ADR cluster 0033).
RUN useradd --create-home --uid 1000 dagster \
    && chown -R dagster:dagster /opt/dagster
USER dagster

EXPOSE 4000

CMD ["dagster", "api", "grpc", "-h", "0.0.0.0", "-p", "4000", "-m", "scholar_network_dagster.definitions"]
