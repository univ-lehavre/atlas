-- Mentions d'organisations typées/normalisées depuis le brut JSONL.gz (vue de
-- session `:memory:`). Projection EXPLICITE (jamais SELECT *). On dérive :
--   - event_date : la date civile (YYYY-MM-DD) extraite du timestamp GKG, axe du
--     chronogramme (le mart agrège par jour) ;
--   - org_name   : le nom d'organisation nettoyé (trim) ;
--   - org_key    : une clé de rapprochement normalisée (minuscule, accents retirés,
--     espaces compactés) pour la jointure au référentiel (ADR 0065). La
--     normalisation est volontairement simple et déterministe.
select
    record_id,
    date                                              as gkg_timestamp,
    -- YYYYMMDDHHMMSS → DATE (les 8 premiers chiffres = YYYYMMDD).
    strptime(substr(date, 1, 8), '%Y%m%d')::date      as event_date,
    nullif(trim(organization), '')                    as org_name,
    -- Clé de rapprochement normalisée, IDENTIQUE à celle du référentiel
    -- (macro partagée) pour que l'appariement fonctionne (ADR 0065).
    {{ normalize_org_key('organization') }}           as org_key,
    nullif(trim(source_common_name), '')              as source_name,
    nullif(trim(document_identifier), '')             as document_url,
    coalesce(translated, false)                       as translated
from {{ source('mediawatch_raw', 'gkg') }}
where nullif(trim(organization), '') is not null
order by record_id, org_name
