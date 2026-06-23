-- Invariant de grain du mart servi : une seule ligne par (université, jour). Un
-- doublon signalerait une erreur d'agrégation (le chronogramme additionnerait deux
-- fois le même jour). Ce test échoue s'il existe un couple (university_id,
-- event_date) répété.
select university_id, event_date
from {{ ref('marts_university_timeline') }}
group by university_id, event_date
having count(*) > 1
