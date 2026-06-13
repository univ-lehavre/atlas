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

## Topics par œuvre (provenance `curated_work_topics`, lot 1)

Grain publication `(work_id, topic_id)`, provenance **complète** (aucun filtre de
score — le seuil ≥ 0,3 est au mart par author_id, lot 2). `T20001` est **partagé**
par W101 et W102 (Alice) : une seule ligne par work après DISTINCT, et poids ×2 à
l'agrégat author_id du lot 2.

| work_id | topic_id | display_name                             | score  | subfield / field / domain                                                   |
| ------- | -------- | ---------------------------------------- | ------ | --------------------------------------------------------------------------- |
| W101    | T20001   | Magnetic confinement fusion research     | 0.9991 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W101    | T20002   | Fusion materials and technologies        | 0.9982 | Materials Chemistry / Materials Science / Physical Sciences                 |
| W102    | T20001   | Magnetic confinement fusion research     | 0.9876 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W201    | T20003   | Glycosylation and Glycoproteins Research | 0.9678 | Molecular Biology / Biochemistry… / Life Sciences                           |
| W202    | T20004   | Muscle metabolism and nutrition          | 0.9510 | Cell Biology\* / Biochemistry… / Life Sciences                              |

→ **5 lignes** `curated_work_topics` (4 topic_id distincts ; T20001 sur 2 works). \* le subfield de W202 réutilise `_BIO` (Molecular Biology) dans generate.py.

## Keywords par œuvre (provenance `curated_work_keywords`, lot 1)

Provenance complète : `shield` (0.2103) et `reagent` (0.1138) sont **< 0,3** et
restent dans la provenance lot 1 — ils seront coupés par le seuil d'agrégation du
lot 2, prouvant que le filtre vit au mart et non au grain publication.

| work_id | keyword_id | display_name | score  |
| ------- | ---------- | ------------ | ------ |
| W101    | plasma     | Plasma       | 0.5598 |
| W101    | shield     | Shield       | 0.2103 |
| W102    | plasma     | Plasma       | 0.4471 |
| W201    | chemistry  | Chemistry    | 0.8414 |
| W201    | reagent    | Reagent      | 0.1138 |
| W202    | chemistry  | Chemistry    | 0.6627 |

→ **6 lignes** `curated_work_keywords`. (`keyword_id` ci-dessus = slug ; l'id réel
est l'URL `https://openalex.org/keywords/<slug>`.)

## Agrégat par author_id (mart `researchers`, lot 2)

Grain `(author_id, kind, label_id)`. `weight` = somme des scores des publications du
chercheur portant le label (au-dessus du seuil) ; `freq` = nombre de ces publications.
Seuils **différenciés** : topic ≥ 0,5, keyword ≥ 0,2. `reagent` (0,1138 < 0,2) est
**rejeté** ; `shield` (0,2103 ≥ 0,2) passe ; tous les topics (0,95–0,999) passent.

| author_id (auteur)  | kind    | label_id  | weight                   | freq |
| ------------------- | ------- | --------- | ------------------------ | ---- |
| A1000000001 (Alice) | topic   | T20001    | 1,9867 (0,9991 + 0,9876) | 2    |
| A1000000001 (Alice) | topic   | T20002    | 0,9982                   | 1    |
| A1000000001 (Alice) | keyword | plasma    | 1,0069 (0,5598 + 0,4471) | 2    |
| A1000000001 (Alice) | keyword | shield    | 0,2103                   | 1    |
| A1000000002 (Bob)   | topic   | T20003    | 0,9678                   | 1    |
| A1000000002 (Bob)   | topic   | T20004    | 0,9510                   | 1    |
| A1000000002 (Bob)   | keyword | chemistry | 1,5041 (0,8414 + 0,6627) | 2    |

→ **7 lignes** `marts_researchers`. `reagent` absent (coupé par le seuil keyword 0,2),
ce qui prouve que le filtre vit au mart et non au grain publication (provenance lot 1
complète, ADR 0059). `label_id` = id OpenAlex pour les topics, URL `keywords/<slug>`
pour les keywords.

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
