-- Référentiel d'universités normalisé (vue de session). L'autorité de la
-- classification « université » (ADR 0065) : une organisation est retenue si sa clé
-- normalisée apparie une ligne d'ici. La clé est calculée par la MÊME macro que les
-- mentions GKG (stg_gkg_mentions) — condition de l'appariement.
--
-- SOURCE configurable (var `ref_source`, ADR 0065) :
--   - `seed`     : le seed CSV versionné (exemple minimal, défaut — tests hermétiques) ;
--   - `ingested` : le référentiel ROR ingéré dans le lakehouse par
--     ref_universities_snapshot (autonome en prod). La prod surcharge à `ingested`.
-- Les deux branches produisent EXACTEMENT les mêmes colonnes (contrat aval inchangé).
{% if var('ref_source') == 'ingested' %}
select
    university_id,
    name                                  as university_name,
    country,
    {{ normalize_org_key('name') }}       as org_key
from {{ source('mediawatch_ref', 'universities') }}
order by university_id
{% else %}
select
    university_id,
    name                                  as university_name,
    country,
    {{ normalize_org_key('name') }}       as org_key
from {{ ref('ref_universities') }}
order by university_id
{% endif %}
