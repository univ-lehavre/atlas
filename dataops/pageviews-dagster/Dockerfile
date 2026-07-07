# Image de la code-location Dagster « pageviews » (ADR 0055, ADR 0098).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m pageviews_dagster.definitions`).
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Les images officielles
# Dagster sont amd64-only ; cette image se construit trivialement en arm64 pour le
# banc Lima (Dagster est du pur Python).
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/pageviews-dagster/`) : l'image
# embarque le projet dbt frère (`pageviews-dbt/`). D'où le `-f` explicite :
#   docker buildx build --platform linux/arm64 \
#     -f dataops/pageviews-dagster/Dockerfile \
#     -t registry:80/pageviews-dagster:dev --push dataops/
#
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'écriture
# lakehouse l'invoque en sous-processus. ca-certificates est requis pour le pull
# HTTPS des sources HTTP (httpx) : dumps mensuels `pageview_complete` de Wikimedia,
# API REST Pageviews, SPARQL Wikidata, API OpenAlex.
# Image de base épinglée par digest (immuable), tag conservé pour la lisibilité.
# Maintenu par Dependabot (écosystème docker), ADR 0084 — MAIS la *minor* Python
# est verrouillée sur 3.10 (parité cluster, ADR cluster 0006 ; `requires-python
# >=3.10,<3.11`). Un bump Dependabot qui change le tag (3.10 -> 3.x) DOIT être
# refusé : ne mettre à jour que le digest d'un `python:3.10-slim`.
FROM python:3.10-slim@sha256:5f9928ea39771e8ddf4fb9a96ab24f65f087793635614405a1dc9384f040852e

RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# Installe les dépendances + le paquet en HONORANT le lock (chemin reproductible).
# Contexte = dataops/ → les chemins sont préfixés par `pageviews-dagster/`.
COPY pageviews-dagster/pyproject.toml pageviews-dagster/uv.lock pageviews-dagster/README.md ./
COPY pageviews-dagster/src ./src
# `uv pip install .` (sans lock) RÉSOUT À NEUF depuis pyproject → il ignore uv.lock et prend
# les dernières versions compatibles des transitives NON épinglées. Constaté en prod : comme
# pour citation, grpcio-health-checking a floté (1.81→1.82), dont le gencode protobuf 7.35.0
# est INCOMPATIBLE avec le runtime protobuf 6.33.6 → le serveur gRPC dagster crashe au
# démarrage (VersionError, CrashLoopBackOff). On installe donc d'abord les dépendances EXACTES
# du lock (`uv export --frozen`), PUIS le paquet sans re-résoudre ses deps (`--no-deps`) : le
# build reflète EXACTEMENT uv.lock. `--frozen` échoue si le lock est périmé vs pyproject.
RUN python -m uv export --frozen --no-dev --no-emit-project -o /tmp/requirements.txt \
    && python -m uv pip install --system -r /tmp/requirements.txt \
    && python -m uv pip install --system --no-deps .

# Extensions DuckDB cuites HORS-LIGNE dans l'image (ADR 0055/0059 : aucune I/O
# réseau au runtime). DuckDB télécharge sinon ses extensions au premier usage →
# casse le hors-ligne. `httpfs` suffit (lecture/écriture Parquet sur S3 path-style ;
# PAS d'index Postgres — pageviews ne matérialise aucun index vectoriel, donc pas
# d'extension `postgres`, contrairement à citation). Le répertoire est figé et
# exporté par DUCKDB_EXTENSION_DIRECTORY, lu par lakehouse.connect().
ENV DUCKDB_EXTENSION_DIRECTORY=/opt/dagster/duckdb_extensions
RUN python -c "import duckdb; c=duckdb.connect(config={'extension_directory': '$DUCKDB_EXTENSION_DIRECTORY'}); c.execute('INSTALL httpfs')"

# Projet dbt frère (`pageviews-dbt/`) copié hors de l'arbre du paquet ; son chemin
# est découplé du layout du dépôt via PAGEVIEWS_DBT_PROJECT_DIR (lu par
# pageviews_dagster.dbt).
COPY pageviews-dbt /opt/dagster/pageviews-dbt
ENV PAGEVIEWS_DBT_PROJECT_DIR=/opt/dagster/pageviews-dbt

# Génère le manifest dbt DANS l'image (hermétique : `parse` ne fait aucune I/O S3).
# Des identifiants S3 factices suffisent à satisfaire le rendu de profiles.yml.
# Mêmes valeurs que `_DUMMY_PARSE_ENV` dans pageviews_dagster.dbt (parse paresseux
# CI) : garder les deux chemins de parse en phase.
RUN AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=x BUCKET_HOST=x BUCKET_PORT=0 \
    dbt parse --project-dir /opt/dagster/pageviews-dbt \
              --profiles-dir /opt/dagster/pageviews-dbt --target dev

# Exécution en utilisateur non privilégié (jamais root, contrat ADR cluster 0033).
RUN useradd --create-home --uid 1000 dagster \
    && chown -R dagster:dagster /opt/dagster
USER dagster

EXPOSE 4000

CMD ["dagster", "api", "grpc", "-h", "0.0.0.0", "-p", "4000", "-m", "pageviews_dagster.definitions"]
