# Valeurs golden — fixtures openalex-sample

Valeurs **attendues** dérivées à la main du graphe synthétique, pour les tests
déterministes du pipeline (notamment l'étape 3.3, citations croisées). Si le
pipeline calcule autre chose que ces valeurs, c'est lui qui a tort.

## Graphe de citations

| Work | Auteur              | Année | Cite (referenced_works) |
| ---- | ------------------- | ----- | ----------------------- |
| W101 | Alice (A1000000001) | 2018  | W201                    |
| W102 | Alice (A1000000001) | 2019  | W201                    |
| W201 | Bob (A1000000002)   | 2017  | —                       |
| W202 | Bob (A1000000002)   | 2020  | W101                    |

## Arêtes article→référence (curated `edges`, étape 3.2)

Dédupliquées, une par couple (work citant, work cité) :

| citing | cited |
| ------ | ----- |
| W101   | W201  |
| W102   | W201  |
| W202   | W101  |

→ **3 arêtes** au total.

## Citations croisées par paire de chercheurs (mart, étape 3.3)

Paire (Alice, Bob) — une citation croisée = une arête entre un work d'Alice et un
work de Bob, dans un sens ou l'autre :

| Sens                                              | Arêtes               | Compte |
| ------------------------------------------------- | -------------------- | ------ |
| Alice → Bob (un work d'Alice cite un work de Bob) | W101→W201, W102→W201 | **2**  |
| Bob → Alice (un work de Bob cite un work d'Alice) | W202→W101            | **1**  |
| **Total croisé (non orienté)**                    |                      | **3**  |

**Attendu du modèle `marts_collab_pairs` pour la paire (A1000000001, A1000000002) :**
`cross_citations = 3` (avec `a_to_b = 2`, `b_to_a = 1` si la direction est exposée).

## Authors

| id                  | orcid   | works_count |
| ------------------- | ------- | ----------- |
| A1000000001 (Alice) | présent | 2           |
| A1000000002 (Bob)   | `null`  | 2           |

## merged_ids

| merge_date | id         | merge_into_id |
| ---------- | ---------- | ------------- |
| 2022-07-15 | W900000900 | W101          |

→ après application (étape 3, en aval), `W900000900` redirige vers `W101`.
