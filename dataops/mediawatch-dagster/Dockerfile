# Image de la code-location Dagster « mediawatch » (ADR 0055, ADR 0064).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m mediawatch_dagster.definitions`).
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Les images officielles
# Dagster sont amd64-only ; cette image se construit trivialement en arm64 pour le
# banc Lima (Dagster est du pur Python).
#
# CONTEXTE DE BUILD = `dataops/` (PAS `dataops/mediawatch-dagster/`) : l'image
# embarquera, dès l'ajout des assets dbt (PR 3), le projet dbt frère
# (`mediawatch-dbt/`). D'où le `-f` explicite :
#   docker buildx build --platform linux/arm64 \
#     -f dataops/mediawatch-dagster/Dockerfile \
#     -t registry:80/mediawatch-dagster:dev --push dataops/
#
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'écriture
# lakehouse l'invoque en sous-processus. ca-certificates est requis pour le pull
# HTTPS de la source GDELT (httpx).
# Image de base épinglée par digest (immuable), tag conservé pour la lisibilité.
# Maintenu par Dependabot (écosystème docker). ADR 0084.
FROM python:3.10-slim@sha256:5f9928ea39771e8ddf4fb9a96ab24f65f087793635614405a1dc9384f040852e

RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# Installe les dépendances + le paquet (chemin reproductible via uv.lock).
# Contexte = dataops/ → les chemins sont préfixés par `mediawatch-dagster/`.
COPY mediawatch-dagster/pyproject.toml mediawatch-dagster/uv.lock mediawatch-dagster/README.md ./
COPY mediawatch-dagster/src ./src
RUN python -m uv pip install --system .

# Extensions DuckDB cuites HORS-LIGNE dans l'image (ADR 0055/0059 : aucune I/O
# réseau au runtime). DuckDB télécharge sinon ses extensions au premier usage →
# casse le hors-ligne. `httpfs` suffit en v1 (lecture/écriture S3 ; pas d'index
# Postgres, donc pas d'extension `postgres`). Le répertoire est figé et exporté
# par DUCKDB_EXTENSION_DIRECTORY, lu par lakehouse.connect().
ENV DUCKDB_EXTENSION_DIRECTORY=/opt/dagster/duckdb_extensions
RUN python -c "import duckdb; c=duckdb.connect(config={'extension_directory': '$DUCKDB_EXTENSION_DIRECTORY'}); c.execute('INSTALL httpfs')"

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
