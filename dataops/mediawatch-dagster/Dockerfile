# Image de la code-location Dagster « mediawatch » (ADR 0055, ADR 0064).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m mediawatch_dagster.definitions`).
#
# ── Découpage pré-image de build : UN fichier, DEUX cibles (ADR cluster 0110) ────
# Ce Dockerfile décrit DEUX images au cycle de vie disjoint, en deux étages ciblables :
#
#   • cible `deps`  → la pré-image LOURDE `mediawatch-deps-base` : TOUT ce qui touche
#     Internet (deps système, wheels du lock, extensions DuckDB). Build RARE (bump
#     `uv.lock`), là où le réseau est disponible (poste de contrôle).
#         docker buildx build --platform linux/arm64,linux/amd64 --target deps \
#           -f dataops/mediawatch-dagster/Dockerfile \
#           -t registry:80/mediawatch-deps-base:<hash> --push dataops/
#
#   • cible `code` (défaut) → l'image de CODE : COPY src frais + install --no-deps +
#     dbt parse. AUCUN accès réseau. Build FRÉQUENT (chaque merge), reproductible
#     hors-ligne — donc IN-POD (buildkit rootless). Elle NE reconstruit PAS la base :
#     `FROM ${DEPS_REF}` PULL la pré-image publiée depuis le registre (par digest),
#     l'étage `deps` de ce fichier n'est alors PAS exécuté.
#         docker buildx build --platform linux/arm64 \
#           -f dataops/mediawatch-dagster/Dockerfile \
#           --build-arg DEPS_REF=registry:80/mediawatch-deps-base@sha256:… \
#           -t registry:80/mediawatch-dagster:<sha> --push dataops/
#
# Les deux cibles vivent dans UN fichier (lisibilité, source unique), mais restent
# DEUX builds indépendants poussés séparément — c'est ce qui préserve la disjonction
# des cycles (base rare / code fréquent) et rend le build de code air-gappé.
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/mediawatch-dagster/`) : l'image embarque
# la code-location ET le projet dbt frère (`mediawatch-dbt/`), requis par les assets
# dbt. D'où le `-f` explicite (chemins préfixés par `mediawatch-dagster/`).

# ARG GLOBAL (déclaré AVANT tout FROM, sinon invisible dans le `FROM ${DEPS_REF}` de la
# cible `code` — règle Dockerfile). Référence la pré-image PUBLIÉE que la cible `code`
# consomme ; le défaut `:dev` sert le banc local. Injecté au build par --build-arg
# (idéalement un digest `@sha256:…` immuable en prod).
ARG DEPS_REF=registry:80/mediawatch-deps-base:dev

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

# ── Étape egress 1/4 : dépendances système (apt) ────────────────────────────────
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'écriture
# lakehouse l'invoque en sous-processus. ca-certificates est requis pour le pull
# HTTPS de la source GDELT (httpx).
RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Étape egress 2/4 : uv (gestionnaire de paquets) ─────────────────────────────
RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# ── Étape egress 3/4 : dépendances Python (wheels du lock) ──────────────────────
# Installe les dépendances en HONORANT le lock (chemin reproductible).
# Contexte = dataops/ → les chemins sont préfixés par `mediawatch-dagster/`.
COPY mediawatch-dagster/pyproject.toml mediawatch-dagster/uv.lock mediawatch-dagster/README.md ./
# `uv pip install .` (sans lock) RÉSOUT À NEUF depuis pyproject → il ignore uv.lock et prend
# les dernières versions compatibles des transitives NON épinglées. Constaté en prod : comme
# pour citation, grpcio-health-checking a floté (1.81→1.82), dont le gencode protobuf 7.35.0
# est INCOMPATIBLE avec le runtime protobuf 6.33.6 → le serveur gRPC dagster crashe au
# démarrage (VersionError, CrashLoopBackOff). On installe donc les dépendances EXACTES du
# lock (`uv export --frozen`) : le build reflète EXACTEMENT uv.lock. `--frozen` échoue si le
# lock est périmé vs pyproject (garde-fou). Le PAQUET applicatif lui-même (`--no-deps .`) est
# installé FRAIS dans la cible `code`, PAS ici : seules ses dépendances figées vivent ici.
RUN python -m uv export --frozen --no-dev --no-emit-project -o /tmp/requirements.txt \
    && python -m uv pip install --system -r /tmp/requirements.txt

# ── Étape egress 4/4 : extensions DuckDB cuites hors-ligne ──────────────────────
# Extensions DuckDB cuites HORS-LIGNE dans l'image (ADR 0055/0059 : aucune I/O
# réseau au runtime). DuckDB télécharge sinon ses extensions au premier usage →
# casse le hors-ligne. `httpfs` suffit en v1 (lecture/écriture S3 ; pas d'index
# Postgres, donc pas d'extension `postgres`). Le répertoire est figé et exporté
# par DUCKDB_EXTENSION_DIRECTORY, lu par lakehouse.connect().
ENV DUCKDB_EXTENSION_DIRECTORY=/opt/dagster/duckdb_extensions
RUN python -c "import duckdb; c=duckdb.connect(config={'extension_directory': '$DUCKDB_EXTENSION_DIRECTORY'}); c.execute('INSTALL httpfs')"

# (Pas d'étape « modèle ONNX », contrairement à citation : mediawatch n'embarque
# aucun modèle d'embedding — la cible `deps` s'arrête aux extensions DuckDB, sans
# COPY src ni install transitoire du paquet applicatif.)

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

# Code applicatif FRAIS : première (et seule) installation du paquet — la pré-image ne
# contient AUCUN paquet applicatif transitoire (pas de fetch_model, contrairement à
# citation). `--no-deps` : les dépendances (EXACTES, du lock) sont déjà installées dans
# la pré-image → ne RIEN re-résoudre ni re-télécharger (drift grpcio-health-checking
# 1.81→1.82, VersionError protobuf : cf. cible `deps`).
COPY mediawatch-dagster/pyproject.toml mediawatch-dagster/README.md ./
COPY mediawatch-dagster/src ./src
RUN python -m uv pip install --system --no-deps .

# Projet dbt frère (`mediawatch-dbt/`) copié hors de l'arbre du paquet ; son chemin
# est découplé du layout du dépôt via MEDIAWATCH_DBT_PROJECT_DIR (lu par
# mediawatch_dagster.dbt).
COPY mediawatch-dbt /opt/dagster/mediawatch-dbt
ENV MEDIAWATCH_DBT_PROJECT_DIR=/opt/dagster/mediawatch-dbt

# Génère le manifest dbt DANS l'image (hermétique : `parse` ne fait aucune I/O S3).
# Des identifiants S3 factices suffisent à satisfaire le rendu de profiles.yml.
# Mêmes valeurs que `_DUMMY_PARSE_ENV` dans mediawatch_dagster.dbt (parse paresseux
# CI) : garder les deux chemins de parse en phase.
RUN AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=x BUCKET_HOST=x BUCKET_PORT=0 \
    dbt parse --project-dir /opt/dagster/mediawatch-dbt \
              --profiles-dir /opt/dagster/mediawatch-dbt --target dev

# Exécution en utilisateur non privilégié (jamais root, contrat ADR cluster 0033).
RUN useradd --create-home --uid 1000 dagster \
    && chown -R dagster:dagster /opt/dagster
USER dagster

EXPOSE 4000

CMD ["dagster", "api", "grpc", "-h", "0.0.0.0", "-p", "4000", "-m", "mediawatch_dagster.definitions"]
