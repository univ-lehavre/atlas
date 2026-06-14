-- Document texte FTS par chercheur (étape 4, index_load) — SERVI et contractualisé.
--
-- Transforme le mart lexical long format `marts_researchers` (une ligne par
-- (author_id, kind, label_id)) en UN document texte par `author_id`, que index_load
-- chargera dans la colonne `fts` (tsvector) de l'index Postgres.
--
-- Pondération : chaque label est RÉPÉTÉ `freq` fois (nombre de publications du
-- chercheur portant le label) → un label fréquent pèse plus dans `ts_rank` même avec
-- `to_tsvector('simple')` qui ne pondère pas nativement. `freq` est un entier
-- déterministe (≥ 1), contrairement à `weight` (float) : répétition reproductible.
--
-- Ordre déterministe (ADR 0057) : labels concaténés par (weight desc, kind, label_id)
-- → même mart, même document, même tsvector. Hérite automatiquement de la purge
-- d'opposition RGPD (lot 5) et des seuils (lot 2), puisque la source est déjà filtrée.
--
-- Grain de sortie : une ligne par author_id (le mapping author_id → researcher_id se
-- fait au chargement, index_load). Le document est en minuscules de fait (les labels
-- OpenAlex le sont déjà majoritairement ; `to_tsvector('simple')` ne casse pas la casse
-- mais normalise les tokens).
{{ config(
    materialized='external',
    location=marts_location('researchers_fts'),
    options={'format': 'parquet'}
) }}

with expanded as (
    -- Chaque label répété `freq` fois (liste de `freq` copies du label), puis aplati.
    select
        author_id,
        weight,
        kind,
        label_id,
        unnest(repeat(["label"], freq)) as token
    from {{ ref('marts_researchers') }}
)

select
    author_id,
    string_agg(token, ' ' order by weight desc, kind, label_id) as doc_text
from expanded
group by author_id
order by author_id
