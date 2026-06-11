# Image de la code-location Dagster « citation » (ADR 0055).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m citation_dagster.definitions`).
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Les images officielles
# Dagster sont amd64-only ; cette image se construit trivialement en arm64 pour le
# banc Lima (Dagster est du pur Python).
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/citation-dagster/`) : l'image embarque
# la code-location ET le projet dbt frère (`citation-dbt/`), requis depuis l'étape 3.2
# (assets dbt). D'où le `-f` explicite :
#   docker buildx build --platform linux/arm64 \
#     -f dataops/citation-dagster/Dockerfile \
#     -t registry:80/citation-dagster:dev --push dataops/
#
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'asset de sync
# l'invoque en sous-processus.
#
# duckdb/dbt-duckdb/dagster-dbt sont tirés par le pyproject (wheels arm64 dispo, dont
# duckdb manylinux aarch64). Le manifest dbt est généré AU BUILD (`dbt parse`, sans
# réseau) et packagé dans l'image : `@dbt_assets` le lit à l'import sans parse runtime.
FROM python:3.10-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# Installe les dépendances + le paquet (chemin reproductible via uv.lock).
# Contexte = dataops/ → les chemins sont préfixés par `citation-dagster/`.
COPY citation-dagster/pyproject.toml citation-dagster/uv.lock citation-dagster/README.md ./
COPY citation-dagster/src ./src
RUN python -m uv pip install --system .

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
