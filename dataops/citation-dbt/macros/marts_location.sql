{#
  Chemin de sortie IMMUABLE d'un mart « servi » (étape 3.4).

  Forme : <marts_root>/<mart_name>/dt=<curated_dt>/run=<curated_run>/part.parquet
  Défaut : s3://citation/marts/<mart_name>/dt=…/run=…/part.parquet

  C'est le **contrat de sortie** du pipeline (ADR 0029) : un consommateur lit le
  `manifest.json` voisin (écrit en dernier par l'asset Dagster collab_manifest) puis
  valide chaque part par `sha256`/`bytes` avant de lire le Parquet. Le mart « servi »
  vit donc sous `marts/` (et non `curated/`, la couche réutilisable interne).

  `marts_root` est une var (défaut `s3://citation/marts`), surchargée en test vers le
  bucket MinIO épinglé. `curated_dt`/`curated_run` (vars Dagster) garantissent
  l'immutabilité : rejeu = nouveau `run=<id>/`, jamais d'écriture en place.

  Comme curated_location, la `location` nomme un FICHIER (`part.parquet`) — une
  location terminée par `/` ferait écrire un objet à clé terminée par `/` (drift D13).
#}
{% macro marts_location(mart_name) %}
{{ return(
    var("marts_root", "s3://citation/marts") ~ "/" ~ mart_name
    ~ "/dt=" ~ var("curated_dt")
    ~ "/run=" ~ var("curated_run") ~ "/part.parquet"
) }}
{% endmacro %}
