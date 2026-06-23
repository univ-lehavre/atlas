"""Assets DataOps de la code-location « mediawatch ».

Vide au scaffold (ADR 0064, PR 1). Les assets sont ajoutés par lots :
- ``raw_gkg`` — ingestion du brut GKG par pull HTTP incrémental (PR 2) ;
- modèles dbt ``staging`` → ``curated`` → ``marts`` (PR 3) ;
- ``timeline_manifest`` — contrat Parquet du mart servi (PR 4).
"""
