{#
  Relation des couples (author_id, work_id) OPPOSÉS — purge chirurgicale RGPD (lot 5).

  Dé-sérialise la var `opposition_pairs` (chaîne JSON `[{"author_id":..,"work_id":..}]`,
  défaut `[]`) en une relation à deux colonnes, via la fonction DuckDB `json_transform`
  + `unnest`. Centralise le parsing pour que le mart lexical (topics ET keywords) et
  tout futur consommateur partagent EXACTEMENT la même interprétation (DRY, déterminisme).

  Liste vide → relation vide → l'ANTI-JOIN en aval est un no-op : le mart est alors
  STRICTEMENT identique au jour J (non-régression, capacité non actionnée).

  Le code PERMET la purge ; il ne DÉCIDE rien : la liste vient du déployeur (ADR 0059).
#}
{% macro opposition_pairs_cte() %}
    select
        unnest.author_id as author_id,
        unnest.work_id   as work_id
    from (
        select unnest(
            from_json(
                '{{ var("opposition_pairs", "[]") }}',
                '[{"author_id": "VARCHAR", "work_id": "VARCHAR"}]'
            )
        ) as unnest
    )
{% endmacro %}
