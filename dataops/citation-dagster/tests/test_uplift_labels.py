"""Test hermétique de la logique d'UPLIFT avec ANTI-FUITE TEMPORELLE (ADR 0067, lot 3).

Le modèle dbt `curated_pair_uplift_labels` calcule l'uplift d'une paire = FWCI des
co-publications moins la baseline solo ANTÉRIEURE de chaque auteur. Le garde-fou
critique (ADR 0067) est qu'une publication POSTÉRIEURE aux co-publications ne doit
JAMAIS gonfler la baseline (pas de fuite du futur vers le passé).

Ce test reproduit la logique SQL du modèle sur DuckDB avec un scénario contrôlé où la
fuite, si elle existait, changerait le résultat — et fige le GOLDEN attendu. Pas de
Docker requis (DuckDB en mémoire) : toujours exécuté.
"""

import duckdb

# Logique du modèle (CTE de calcul, identiques à curated_pair_uplift_labels.sql), sur
# une table author_work (author_id, work_id, year, fwci) au lieu des refs dbt.
_UPLIFT_SQL = """
with copubs as (
    select x.author_id as a, y.author_id as b, x.work_id, x.year, x.fwci as copub_fwci
    from author_work x
    join author_work y on x.work_id = y.work_id and x.author_id < y.author_id
),
solo_a as (
    select c.a, c.b, c.work_id, avg(aw.fwci) as solo_fwci_a
    from copubs c
    join author_work aw on aw.author_id = c.a and aw.year < c.year
    where not exists (
        select 1 from author_work bw where bw.work_id = aw.work_id and bw.author_id = c.b
    )
    group by c.a, c.b, c.work_id
),
solo_b as (
    select c.a, c.b, c.work_id, avg(bw.fwci) as solo_fwci_b
    from copubs c
    join author_work bw on bw.author_id = c.b and bw.year < c.year
    where not exists (
        select 1 from author_work aw where aw.work_id = bw.work_id and aw.author_id = c.a
    )
    group by c.a, c.b, c.work_id
),
copub_uplift as (
    select c.a, c.b,
           c.copub_fwci - (sa.solo_fwci_a + sb.solo_fwci_b) / 2.0 as uplift
    from copubs c
    join solo_a sa on sa.a = c.a and sa.b = c.b and sa.work_id = c.work_id
    join solo_b sb on sb.a = c.a and sb.b = c.b and sb.work_id = c.work_id
)
select a, b, avg(uplift) as uplift, count(*) as n_copubs
from copub_uplift
group by a, b
having count(*) >= 2
order by a, b
"""


def _con_with(rows):
    con = duckdb.connect()
    con.execute(
        "CREATE TABLE author_work(author_id VARCHAR, work_id VARCHAR, year INT, fwci DOUBLE)"
    )
    con.executemany("INSERT INTO author_work VALUES (?, ?, ?, ?)", rows)
    return con


def test_uplift_anti_temporal_leakage() -> None:
    # A solo : W1(2015,1.0), W2(2016,2.0) → baseline antérieure = 1.5
    # B solo : W3(2016,4.0)               → baseline antérieure = 4.0
    # co-pub : W10(2018,10.0), W11(2019,6.0)
    # PIÈGE : A a W4(2020,100.0) APRÈS les co-pubs → NE doit PAS entrer dans la baseline.
    rows = [
        ("A", "W1", 2015, 1.0),
        ("A", "W2", 2016, 2.0),
        ("A", "W4", 2020, 100.0),  # futur — ne doit pas fuir
        ("B", "W3", 2016, 4.0),
        ("A", "W10", 2018, 10.0),
        ("B", "W10", 2018, 10.0),
        ("A", "W11", 2019, 6.0),
        ("B", "W11", 2019, 6.0),
    ]
    res = _con_with(rows).execute(_UPLIFT_SQL).fetchall()
    assert len(res) == 1
    a, b, uplift, n = res[0]
    assert (a, b, n) == ("A", "B", 2)
    # W10: 10 − (1.5+4)/2 = 7.25 ; W11: 6 − (1.5+4)/2 = 3.25 ; moyenne = 5.25.
    # Si W4 (100) avait fui, la baseline de A monterait et l'uplift s'effondrerait.
    assert abs(uplift - 5.25) < 1e-9


def test_pair_needs_two_copubs_with_baseline() -> None:
    # Une seule co-pub → exclue (having >= 2).
    rows = [
        ("A", "W1", 2015, 1.0),
        ("B", "W2", 2015, 2.0),
        ("A", "W10", 2018, 8.0),
        ("B", "W10", 2018, 8.0),
    ]
    assert _con_with(rows).execute(_UPLIFT_SQL).fetchall() == []


def test_copub_without_prior_solo_dropped() -> None:
    # Aucune publication antérieure pour A → pas de baseline → co-pub écartée.
    rows = [
        ("A", "W10", 2018, 8.0),
        ("B", "W10", 2018, 8.0),
        ("A", "W11", 2019, 6.0),
        ("B", "W11", 2019, 6.0),
        ("B", "W3", 2016, 4.0),  # B a un solo antérieur, mais A n'en a aucun avant 2018
    ]
    # W10 : A sans baseline → écarté ; W11 : A a W10(2018) mais c'est une co-pub avec B,
    # exclue du solo → A toujours sans baseline → écarté. Donc aucune paire ≥2.
    assert _con_with(rows).execute(_UPLIFT_SQL).fetchall() == []
