"""Point d'entrée de la code-location Dagster « scholar-network ».

Chargé par le serveur gRPC (``dagster api grpc -m scholar_network_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

SQUELETTE (lot 1, plan 2026-07-13-scholar-network) : la code-location est **chargeable et
inerte** — elle expose des ``Definitions`` VALIDES mais AUCUN asset métier. Les assets du
pipeline arriveront aux lots suivants (ADR 0103 §1–2, plan §4) :

- ``prefiltered_raw`` — brut pré-filtré (``≥2016 ∧ type=article``, projeté) + cache (lot 2) ;
- ``researchers`` — passe 1, table des chercheurs affiliés au réseau (lot 3) ;
- ``scholar_works`` — passe 2, semi-jointure → tous les articles ≥2016 des chercheurs (lot 4) ;
- ``scholar_profiles`` — embedding + moyenne L2 par chercheur → pgvector (lot 5).

Tant qu'aucun asset n'est câblé, ``defs`` reste un point d'entrée gRPC valide et vide.
"""

from dagster import Definitions

# Aucun asset métier au squelette (liste vide) : la code-location charge, se valide
# (`dagster definitions validate`) et se découvre par l'orchestrateur, sans rien exécuter.
# Les assets seront ajoutés ici (via `scholar_network_dagster.assets`) aux lots 2–5.
defs = Definitions(assets=[])
