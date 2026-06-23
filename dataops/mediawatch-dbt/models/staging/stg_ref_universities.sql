-- Référentiel d'universités normalisé (vue de session) depuis le seed CSV versionné.
-- L'autorité de la classification « université » (ADR 0065) : une organisation est
-- retenue si sa clé normalisée apparie une ligne d'ici. La clé est calculée par la
-- MÊME macro que les mentions GKG (stg_gkg_mentions) — condition de l'appariement.
select
    university_id,
    name                                  as university_name,
    country,
    {{ normalize_org_key('name') }}       as org_key
from {{ ref('ref_universities') }}
order by university_id
