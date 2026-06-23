-- Invariant ADR 0065 : un « candidat » à l'enrichissement ne doit JAMAIS être déjà
-- dans le référentiel (sinon il serait compté comme université, pas candidat). Ce
-- test échoue s'il existe un candidat dont la clé apparie le référentiel — preuve
-- d'une fuite logique entre les deux modèles.
select c.org_key
from {{ ref('curated_university_candidates') }} c
inner join {{ ref('stg_ref_universities') }} r
    on c.org_key = r.org_key
