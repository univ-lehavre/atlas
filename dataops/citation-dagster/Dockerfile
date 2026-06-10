# Image de la code-location Dagster « citation » (ADR 0055).
#
# Sert le serveur gRPC que l'orchestrateur Dagster du cluster découvre via son
# workspace (`dagster api grpc -m citation_dagster.definitions`).
#
# Base python:3.10-slim : parité avec l'image Dagster du cluster (ADR cluster 0006,
# verrou chart Helm <-> paquet Python 1:1, dagster==1.13.7). Les images officielles
# Dagster sont amd64-only ; cette image se construit trivialement en arm64 pour le
# banc Lima (Dagster est du pur Python) :
#   docker buildx build --platform linux/arm64 \
#     -t registry:80/citation-dagster:dev --push dataops/citation-dagster/
#
# rclone (MIT) est un binaire système (pas une dépendance pip) : l'asset de sync
# l'invoque en sous-processus.
FROM python:3.10-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends rclone ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -U uv

WORKDIR /opt/dagster/app

# Installe les dépendances + le paquet (chemin reproductible via uv.lock).
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN python -m uv pip install --system .

# Exécution en utilisateur non privilégié (jamais root, contrat ADR cluster 0033).
RUN useradd --create-home --uid 1000 dagster \
    && chown -R dagster:dagster /opt/dagster
USER dagster

EXPOSE 4000

CMD ["dagster", "api", "grpc", "-h", "0.0.0.0", "-p", "4000", "-m", "citation_dagster.definitions"]
