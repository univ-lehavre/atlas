{#
  Chemin de sortie IMMUABLE d'un modèle curated.

  Forme : <curated_root>/<model>/dt=<curated_dt>/run=<curated_run>/part.parquet
  Défaut : s3://mediawatch/curated/<model>/dt=…/run=…/part.parquet

  `curated_dt` (YYYY-MM) et `curated_run` (id de run) sont des vars injectées par
  Dagster au run (`dbt build --vars …`). Comme `curated_run` change à chaque run
  (context.run_id), un rejeu écrit un NOUVEAU préfixe run=<id>/ : l'ancien reste
  intact (immutabilité par construction du chemin, jamais d'écriture en place).

  `curated_root` est une var (défaut `s3://mediawatch/curated`) : le smoke hermétique
  la surcharge vers le bucket MinIO épinglé (ou un chemin local) sans toucher au SQL.

  IMPORTANT : la `location` désigne un FICHIER (`part.parquet`), pas un dossier. Une
  location terminée par `/` ferait écrire dbt-duckdb un unique objet dont la CLÉ se
  termine par `/` (pas un dossier de `*.parquet`) — un glob `**/*.parquet` ne le
  retrouverait pas. On nomme donc explicitement le fichier ; le préfixe
  `dt=…/run=…/` reste l'unité immuable relisable via `read_parquet('…/run=<id>/*.parquet')`.
#}
{% macro curated_location(model_name) %}
{{ return(
    var("curated_root", "s3://mediawatch/curated") ~ "/" ~ model_name
    ~ "/dt=" ~ var("curated_dt")
    ~ "/run=" ~ var("curated_run") ~ "/part.parquet"
) }}
{% endmacro %}
