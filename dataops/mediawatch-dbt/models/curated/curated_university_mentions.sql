-- Mentions d'organisations QUALIFIÉES « université » (ADR 0065). Matérialisé en
-- Parquet external immuable dt=…/run=…/ (cf. macro curated_location).
--
-- Règle de qualification (ADR 0065) : le RÉFÉRENTIEL fait foi. Une mention est
-- RETENUE ici si sa clé normalisée apparie une université du référentiel
-- (jointure sur org_key). L'heuristique de nom (regex multilingue) n'est PAS un
-- critère de rétention à elle seule : elle est calculée comme drapeau
-- `name_looks_university` (observabilité + signal d'enrichissement traité ailleurs).
--
-- Grain : une ligne par mention retenue (record_id × université). Le mart (PR 4)
-- agrège ensuite par (université, jour) pour le chronogramme.
{{ config(
    materialized='external',
    location=curated_location('curated_university_mentions'),
    options={'format': 'parquet'}
) }}
select
    m.record_id,
    m.event_date,
    r.university_id,
    r.university_name,
    r.country,
    m.org_name                                              as matched_org_name,
    m.source_name,
    m.document_url,
    m.translated,
    -- Drapeau d'aspect universitaire (heuristique de nom, ADR 0065) : informatif.
    -- Toujours vrai ici par construction (le référentiel ne contient que des
    -- universités), mais conservé pour homogénéité avec le signal d'enrichissement.
    regexp_matches(m.org_name, '{{ var("university_name_regex") }}') as name_looks_university
from {{ ref('stg_gkg_mentions') }} m
inner join {{ ref('stg_ref_universities') }} r
    on m.org_key = r.org_key
order by m.event_date, r.university_id, m.record_id
