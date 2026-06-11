-- Auteurs typés/nettoyés depuis le brut JSONL.gz (vue de session).
-- `orcid` est NULLABLE (tous les auteurs n'en ont pas) : on le conserve tel quel,
-- sans not_null en aval.
select
    id                              as author_id,
    orcid,
    nullif(trim(display_name), '')  as display_name,
    cast(works_count as bigint)     as works_count,
    cast(cited_by_count as bigint)  as cited_by_count
from {{ source('citation_raw', 'authors') }}
order by author_id
