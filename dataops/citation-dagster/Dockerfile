# Image de la code-location Dagster « citation » (ADR 0055).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m citation_dagster.definitions`).
#
# ── Découpage pré-image de build : UN fichier, DEUX cibles (ADR cluster 0110) ────
# Ce Dockerfile décrit DEUX images au cycle de vie disjoint, en deux étages ciblables :
#
#   • cible `deps`  → la pré-image LOURDE `citation-deps-base` : TOUT ce qui touche
#     Internet (deps système, wheels du lock, extensions DuckDB, modèle ONNX). Build
#     RARE (bump `uv.lock`), là où le réseau est disponible (poste de contrôle).
#         docker buildx build --platform linux/arm64,linux/amd64 --target deps \
#           -f dataops/citation-dagster/Dockerfile \
#           -t registry:80/citation-deps-base:<hash> --push dataops/
#
#   • cible `code` (défaut) → l'image de CODE : COPY src frais + install --no-deps +
#     dbt parse. AUCUN accès réseau. Build FRÉQUENT (chaque merge), reproductible
#     hors-ligne — donc IN-POD (buildkit rootless). Elle NE reconstruit PAS la base :
#     `FROM ${DEPS_REF}` PULL la pré-image publiée depuis le registre (par digest),
#     l'étage `deps` de ce fichier n'est alors PAS exécuté.
#         docker buildx build --platform linux/arm64 \
#           -f dataops/citation-dagster/Dockerfile \
#           --build-arg DEPS_REF=registry:80/citation-deps-base@sha256:… \
#           -t registry:80/citation-dagster:<sha> --push dataops/
#
# Les deux cibles vivent dans UN fichier (lisibilité, source unique), mais restent
# DEUX builds indépendants poussés séparément — c'est ce qui préserve la disjonction
# des cycles (base rare / code fréquent) et rend le build de code air-gappé.
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/citation-dagster/`) : l'image embarque
# la code-location ET le projet dbt frère (`citation-dbt/`), requis depuis l'étape 3.2
# (assets dbt). D'où le `-f` explicite (chemins préfixés par `citation-dagster/`).

# ARG GLOBAL (déclaré AVANT tout FROM, sinon invisible dans le `FROM ${DEPS_REF}` de la
# cible `code` — règle Dockerfile). Référence la pré-image PUBLIÉE que la cible `code`
# consomme ; le défaut `:dev` sert le banc local. Injecté au build par --build-arg
# (idéalement un digest `@sha256:…` immuable en prod).
ARG DEPS_REF=registry:80/citation-deps-base:dev

# ══════════════════════════════════════════════════════════════════════════════
# CIBLE `deps` — pré-image LOURDE, à egress, buildée rarement (hors cluster)
# ══════════════════════════════════════════════════════════════════════════════
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Les images officielles
# Dagster sont amd64-only ; cette image se construit trivialement en arm64 pour le
# banc Lima (Dagster est du pur Python).
#
# Image de base épinglée par digest (immuable), tag conservé pour la lisibilité.
# Maintenu par Dependabot (écosystème docker), ADR 0084 — MAIS la *minor* Python
# est verrouillée sur 3.10 (parité cluster, ADR cluster 0006 ; `requires-python
# >=3.10,<3.11`). Un bump Dependabot qui change le tag (3.10 -> 3.x) DOIT être
# refusé : ne mettre à jour que le digest d'un `python:3.10-slim`.
FROM python:3.10-slim@sha256:e5300dc020a26a34a19337a57602955a2510e22abeb176edd6de6cd2cc927dd4 AS deps

# ── Étape egress 1/5 : dépendances système (apt) ────────────────────────────────
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'asset de sync
# l'invoque en sous-processus.
RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Étape egress 2/5 : uv (gestionnaire de paquets) ─────────────────────────────
RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# ── Étape egress 3/5 : dépendances Python (wheels du lock) ──────────────────────
# duckdb/dbt-duckdb/dagster-dbt sont tirés par le pyproject (wheels arm64 dispo, dont
# duckdb manylinux aarch64).
# Installe les dépendances en HONORANT le lock (chemin reproductible).
# Contexte = dataops/ → les chemins sont préfixés par `citation-dagster/`.
COPY citation-dagster/pyproject.toml citation-dagster/uv.lock citation-dagster/README.md ./
# `uv pip install .` (sans lock) RÉSOUT À NEUF depuis pyproject → il ignore uv.lock et prend
# les dernières versions compatibles des transitives NON épinglées. Constaté en prod (build
# 2026-07-06) : grpcio-health-checking a floté de 1.81.0 (lock) à 1.82.0, dont le gencode
# protobuf 7.35.0 est INCOMPATIBLE avec le runtime protobuf 6.33.6 → le serveur gRPC dagster
# crashe au démarrage (VersionError). On installe donc les dépendances EXACTES du lock
# (`uv export --frozen`) : le build reflète EXACTEMENT uv.lock (drift D-parité TS↔lock : le
# lock fait autorité, pas la résolution du jour). `--frozen` échoue si le lock est périmé vs
# pyproject (garde-fou). Le PAQUET applicatif lui-même (`--no-deps .`) est installé FRAIS
# dans la cible `code`, PAS ici : seules ses dépendances figées vivent ici.
RUN python -m uv export --frozen --no-dev --no-emit-project -o /tmp/requirements.txt \
    && python -m uv pip install --system -r /tmp/requirements.txt

# ── Étape egress 4/5 : extensions DuckDB cuites hors-ligne ──────────────────────
# Extensions DuckDB cuites HORS-LIGNE dans l'image (ADR 0055/0059 : aucune I/O réseau
# au runtime). DuckDB télécharge sinon ses extensions au premier usage → casse le
# hors-ligne. `httpfs` (lecture S3, déjà utilisé) + `postgres` (chargement de l'index
# vers CNPG, étape 4 index_load via ATTACH). Le répertoire est figé et exporté par
# DUCKDB_EXTENSION_DIRECTORY, lu par lakehouse.connect().
ENV DUCKDB_EXTENSION_DIRECTORY=/opt/dagster/duckdb_extensions
RUN python -c "import duckdb; c=duckdb.connect(config={'extension_directory': '$DUCKDB_EXTENSION_DIRECTORY'}); c.execute('INSTALL httpfs'); c.execute('INSTALL postgres')"

# ── Étape egress 5/5 : modèle d'embedding ONNX cuit hors-ligne ──────────────────
# Modèle d'embedding (lot 3) NON versionné dans git : téléchargé ICI, à une
# révision HuggingFace figée + sha256 vérifié (scripts/fetch_model.py), puis figé
# dans l'image — « cuit hors-ligne », aucune dépendance réseau au RUNTIME
# (ADR 0059). Pointé par ONNX_MODEL_DIR (découplé du layout, comme le projet dbt).
#
# ── OPTION A (couplage minimal, comportement identique) ─────────────────────────
# `scripts/fetch_model.py` IMPORTE `citation_dagster.model_provenance` (révision HF +
# sha256, source de vérité unique dans le package). L'import exige donc que le paquet
# soit installé AVANT le fetch — invariant DOCUMENTÉ dans fetch_model.py lui-même
# (« Au build de l'image, le package est installé AVANT l'appel de ce script »).
#
# On honore cet invariant en installant le paquet EN L'ÉTAT (`--no-deps .`, aucun
# egress puisque les deps du lock sont déjà là). Ce `src` est un ARTEFACT DE BUILD
# TRANSITOIRE, présent uniquement pour faire tourner fetch_model.py : le VRAI code
# (frais) est re-copié et RÉ-INSTALLÉ par-dessus dans la cible `code`, qui écrase ce
# paquet transitoire. La fraîcheur du code applicatif livré ne dépend donc jamais de
# cette image figée.
#
# (Alternative Option B écartée : ne copier que `model_provenance.py` — module
# autonome « pur littéral » — imposerait de reconstruire à la main une arbo de paquet
# importable dans la deps-base, couplage plus FRAGILE aux chemins internes du package
# et divergent de l'invariant documenté de fetch_model.py. Option A retenue.)
COPY citation-dagster/src ./src
RUN python -m uv pip install --system --no-deps .
COPY citation-dagster/scripts ./scripts
ENV ONNX_MODEL_DIR=/opt/dagster/models/all-MiniLM-L6-v2
RUN python scripts/fetch_model.py "$ONNX_MODEL_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# CIBLE `code` (défaut) — image applicative, ZÉRO egress, buildée à chaque merge
# ══════════════════════════════════════════════════════════════════════════════
#
# `FROM ${DEPS_REF}` (DEPS_REF = l'ARG global déclaré en tête) référence la pré-image
# PUBLIÉE (registre), PAS le stage `deps` ci-dessus : quand DEPS_REF pointe le registre,
# Docker PULL l'image figée et n'exécute PAS l'étage `deps` (donc aucun egress) — c'est
# ce qui rend ce build possible IN-POD, air-gappé. Le tag/digest RÉEL est injecté au
# build (`--build-arg DEPS_REF=…@sha256:…`) ; le défaut `:dev` sert le banc local, où la
# pré-image vient d'être poussée sous ce tag.
FROM ${DEPS_REF} AS code

# Ceinture-bretelles ZÉRO-egress : force uv en mode hors-ligne. Toute tentative de
# résolution/téléchargement réseau au build échoue au lieu de « réussir en trichant »
# (ADR cluster 0110). Les wheels des deps vivent déjà dans la pré-image.
ENV UV_OFFLINE=1

WORKDIR /opt/dagster/app

# Code applicatif FRAIS : re-copié et RÉ-INSTALLÉ par-dessus le paquet transitoire de
# la pré-image (Option A). `--no-deps` : les dépendances (EXACTES, du lock) sont déjà
# installées dans la pré-image → ne RIEN re-résoudre ni re-télécharger (drift
# grpcio-health-checking 1.81→1.82, VersionError protobuf : cf. cible `deps`).
COPY citation-dagster/pyproject.toml citation-dagster/README.md ./
COPY citation-dagster/src ./src
RUN python -m uv pip install --system --no-deps .

# Projet dbt copié hors de l'arbre du paquet ; son chemin est découplé du layout du
# dépôt via CITATION_DBT_PROJECT_DIR (lu par citation_dagster.dbt).
COPY citation-dbt /opt/dagster/citation-dbt
ENV CITATION_DBT_PROJECT_DIR=/opt/dagster/citation-dbt

# Génère le manifest dbt DANS l'image (hermétique : `parse` ne fait aucune I/O S3).
# Des identifiants S3 factices suffisent à satisfaire le rendu de profiles.yml.
# Mêmes valeurs que `_DUMMY_PARSE_ENV` dans citation_dagster.dbt (parse paresseux CI) :
# garder les deux chemins de parse en phase (drift D14).
RUN AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=x BUCKET_HOST=x BUCKET_PORT=0 \
    dbt parse --project-dir /opt/dagster/citation-dbt \
              --profiles-dir /opt/dagster/citation-dbt --target dev

# Exécution en utilisateur non privilégié (jamais root, contrat ADR cluster 0033).
RUN useradd --create-home --uid 1000 dagster \
    && chown -R dagster:dagster /opt/dagster
USER dagster

EXPOSE 4000

CMD ["dagster", "api", "grpc", "-h", "0.0.0.0", "-p", "4000", "-m", "citation_dagster.definitions"]
