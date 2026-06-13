# Valeurs golden — fixtures openalex-sample

Valeurs **attendues** dérivées à la main du graphe synthétique, pour les tests
déterministes du pipeline (notamment l'étape 3.3, citations croisées). Si le
pipeline calcule autre chose que ces valeurs, c'est lui qui a tort.

## Graphe de citations

| Work | Auteur(s)              | Année | Cite (referenced_works) |
| ---- | ---------------------- | ----- | ----------------------- |
| W101 | Alice (A1000000001)    | 2018  | W201                    |
| W102 | Alice (A1000000001)    | 2019  | W201                    |
| W201 | Bob (A1000000002)      | 2017  | —                       |
| W202 | Bob (A1000000002)      | 2020  | W101                    |
| W303 | Alice + Bob (CO-écrit) | 2021  | — (aucune référence)    |

W303 est **co-écrit** par Alice et Bob, et **ne cite rien** : il sert le test de purge
RGPD (lot 5) sans perturber le graphe de citations.

## Arêtes article→référence (curated `edges`, étape 3.2)

Dédupliquées, une par couple (work citant, work cité) :

| citing | cited |
| ------ | ----- |
| W101   | W201  |
| W102   | W201  |
| W202   | W101  |

→ **3 arêtes** au total (W303 sans référence → n'ajoute aucune arête).

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
| W303    | T20005   | Tokamak plasma diagnostics               | 0.9500 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |

→ **6 lignes** `curated_work_topics` (5 topic_id distincts ; T20001 sur 2 works ; W303 co-écrit Alice+Bob). \* le subfield de W202 réutilise `_BIO` (Molecular Biology) dans generate.py.

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
| W303    | fusion     | Fusion       | 0.8000 |

→ **7 lignes** `curated_work_keywords`. (`keyword_id` ci-dessus = slug ; l'id réel
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
| A1000000001 (Alice) | topic   | T20005    | 0,9500 (W303)            | 1    |
| A1000000001 (Alice) | keyword | plasma    | 1,0069 (0,5598 + 0,4471) | 2    |
| A1000000001 (Alice) | keyword | shield    | 0,2103                   | 1    |
| A1000000001 (Alice) | keyword | fusion    | 0,8000 (W303)            | 1    |
| A1000000002 (Bob)   | topic   | T20003    | 0,9678                   | 1    |
| A1000000002 (Bob)   | topic   | T20004    | 0,9510                   | 1    |
| A1000000002 (Bob)   | topic   | T20005    | 0,9500 (W303)            | 1    |
| A1000000002 (Bob)   | keyword | chemistry | 1,5041 (0,8414 + 0,6627) | 2    |
| A1000000002 (Bob)   | keyword | fusion    | 0,8000 (W303)            | 1    |

→ **11 lignes** `marts_researchers`. `reagent` absent (coupé par le seuil keyword 0,2),
ce qui prouve que le filtre vit au mart et non au grain publication (provenance lot 1
complète, ADR 0059). `label_id` = id OpenAlex pour les topics, URL `keywords/<slug>`
pour les keywords. **T20005 et fusion viennent de W303 (co-écrit) → présents pour Alice
ET Bob** : c'est ce qui rend le test de purge RGPD (lot 5) probant.

## Vecteurs sémantiques (lot 3)

Calculés en Python (`onnxruntime` + `tokenizers`, modèle `all-MiniLM-L6-v2` téléchargé
hors git puis figé dans l'image, cf. `scripts/fetch_model.py`),
en parité stricte avec le code TS (`embedding-profile.ts` / `topic-extractor.ts`). Un
embedding n'est **pas figeable par valeurs** (384 floats, non bit-exact cross-archi —
ADR 0059) : le golden porte sur la **forme, les invariants et le déterminisme**.

**Texte source par publication** (topics score ≥ 0,3 puis keywords non filtrés, joints
par `, ` ; ordre `score desc, id`) :

| work_id | texte encodé                                                                              |
| ------- | ----------------------------------------------------------------------------------------- |
| W101    | `Magnetic confinement fusion research, Fusion materials and technologies, Plasma, Shield` |
| W102    | `Magnetic confinement fusion research, Plasma`                                            |
| W201    | `Glycosylation and Glycoproteins Research, Chemistry, Reagent`                            |
| W202    | `Muscle metabolism and nutrition, Chemistry`                                              |
| W303    | `Tokamak plasma diagnostics, Fusion`                                                      |

> Pour le texte, le seuil topic est 0,3 (parité TS), **pas** le 0,5 du mart lexical : le
> filtre du _texte_ et celui des _poids_ (lot 2) sont des décisions distinctes. Les
> keywords ne sont jamais filtrés pour le texte → `Reagent` (0,11) y figure, alors qu'il
> est absent du mart lexical.

**`curated_work_vectors`** (provenance, grain `work_id`) : **5 lignes**, vecteur(384)
`float32` **non normalisé** (re-poolable pour la purge chirurgicale, ADR 0059).

**`marts/researcher_vectors`** (servi, grain `author_id`) : **2 lignes** (Alice, Bob),
mean-pool non pondéré des vecteurs des publications **puis** un unique L2 → `‖v‖ ≈ 1`.
Alice agrège W101+W102+W303 ; Bob agrège W201+W202+W303.

Invariants vérifiés (pytest) : dimensions 384 ; `‖v_publication‖ ≠ 1` ; `‖v_auteur‖ ≈ 1`
(`abs=1e-5`) ; **déterminisme intra-archi** (2 runs → `sha256` canonique identique sur
les vecteurs arrondis à 6 décimales). Pas de comparaison bit-exact cross-archi.

## Purge chirurgicale RGPD (lot 5)

Une **opposition** est une liste de couples `(author_id, work_id)` (var dbt
`opposition_pairs` / env `OPPOSITION_PAIRS`, JSON ; **source unique** lue par le mart
lexical dbt ET l'asset vecteur Python). Défaut `[]` = **aucune opposition** = marts
**identiques au jour J** (capacité non actionnée, non-régression). Le code PERMET la
purge ; il ne DÉCIDE rien — la liste vient du déployeur (ADR 0059).

**Scénario A — opposition `(Alice, W303)` (anti-sur-effacement co-auteur).** Alice
s'oppose à sa participation au work co-écrit W303 :

- Alice **perd** `T20005` et `fusion` (ce que W303 lui apportait en propre) ;
- Bob **conserve** `T20005` (0,9500) et `fusion` (0,8000) — portés par SA participation
  à W303, non opposée. **Preuve : une opposition ne retire jamais la donnée d'autrui.**
- vecteur d'Alice re-dérivé sur {W101, W102} ; vecteur de Bob **byte-identique** au run
  sans opposition.

**Scénario B — opposition `(Alice, W101)` (label partagé).** `T20001` (sur W101 ET W102)
**survit via W102** : poids re-dérivé 0,9876, freq 1 (était 1,9867 / 2). `T20002` et
`shield` (portés par W101 seul) **disparaissent**. Bob totalement intact.

La **provenance** (`curated_work_*`, `curated_work_vectors`) n'est **jamais filtrée** :
elle reste complète et re-poolable. Seuls les **agrégats servis** (mart lexical + vecteur)
re-dérivent sur les couples non opposés. Un `author_id` dont tous les couples sont
opposés **disparaît** des marts servis (plus aucune donnée revendiquée).

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
