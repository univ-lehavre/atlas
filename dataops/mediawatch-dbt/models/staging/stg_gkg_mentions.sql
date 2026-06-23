-- Mentions d'organisations typées/normalisées depuis le brut JSONL.gz (vue de
-- session `:memory:`). Projection EXPLICITE (jamais SELECT *). On dérive :
--   - event_date : la date civile (YYYY-MM-DD) extraite du timestamp GKG, axe du
--     chronogramme (le mart agrège par jour) ;
--   - org_name   : le nom d'organisation nettoyé (trim) ;
--   - org_key    : une clé de rapprochement normalisée (minuscule, accents retirés,
--     espaces compactés) pour la jointure au référentiel (ADR 0065).
--
-- DÉDUPLICATION (dernier run gagne, ADR 0064) : la source glob `run=*` couvre les
-- multiples re-matérialisations 15 min d'une même partition journalière. Un même
-- document (record_id) y apparaît plusieurs fois ; le contenu PROJETÉ d'un record
-- étant déterministe (mêmes 6 champs), garder UNE occurrence par (record_id,
-- org_name) suffit — on évite ainsi de compter N fois le même article dans le
-- chronogramme. row_number sur la colonne `filename` (chemin du run) départage de
-- façon stable et déterministe.
with deduped as (
    select
        *,
        row_number() over (
            partition by record_id, organization
            order by filename desc
        ) as _rn
    from {{ source('mediawatch_raw', 'gkg') }}
    where nullif(trim(organization), '') is not null
)
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
from deduped
where _rn = 1
order by record_id, org_name
