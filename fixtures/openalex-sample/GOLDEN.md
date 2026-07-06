# Valeurs golden — fixtures openalex-sample

Valeurs **attendues** dérivées à la main du graphe synthétique du **mart EUNICoast**,
pour les tests déterministes du pipeline (co-autorat, agrégats lexicaux, uplift). Si le
pipeline calcule autre chose que ces valeurs, c'est lui qui a tort. Les valeurs chiffrées
sont **confirmées par un `dbt build` réel** (smoke MinIO hermétique).

La fixture EST le mart EUNICoast (ADR 0105) : déjà filtré au périmètre (works ayant ≥1
auteur affilié EUNICoast ET publiés depuis 2016). Les trois auteurs sont donc TOUS
affiliés Le Havre (ROR EUNICoast `https://ror.org/05v509s40`) et tous les works ≥ 2016.

## Graphe (co-autorat + baseline d'uplift)

Le graphe porte DEUX intentions simultanées : (1) un co-autorat contrôlé (paires) et
(2) des publications SOLO ANTÉRIEURES aux co-pubs, qui donnent une baseline d'uplift
dérivable **sans fuite temporelle** (ADR 0067). W6..W10 (2016/2017) sont strictement
avant les co-pubs (2018..2021).

| Work | Auteur(s)           | Année | fwci | Rôle                                        |
| ---- | ------------------- | ----- | ---- | ------------------------------------------- |
| W6   | Alice (solo)        | 2016  | 0.5  | baseline solo Alice                         |
| W7   | Alice (solo)        | 2017  | 0.6  | baseline solo Alice                         |
| W8   | Bob (solo)          | 2016  | 0.4  | baseline solo Bob                           |
| W9   | Bob (solo)          | 2017  | 0.5  | baseline solo Bob                           |
| W10  | Carol (solo)        | 2017  | 0.7  | baseline solo Carol                         |
| W1   | Alice + Bob         | 2018  | 0.5  | co-pub (paire Alice-Bob)                    |
| W2   | Alice + Bob         | 2019  | 1.2  | co-pub (paire Alice-Bob)                    |
| W3   | Alice + Carol       | 2020  | 0.8  | co-pub (paire Alice-Carol)                  |
| W4   | Alice + Bob + Carol | 2021  | 1.5  | co-pub TRIO (3 paires en une publication)   |
| W5   | Alice (solo)        | 2022  | 0.3  | solo POSTÉRIEURE (jamais dans une baseline) |

- Alice = `A1000000001`, Bob = `A1000000002`, Carol = `A1000000003`.
- W4 est le **trio** (3 paires en une publication). W5 (solo, 2022) enrichit le profil
  d'Alice **sans** créer de paire et, étant postérieure, n'entre dans aucune baseline.
- Tri des lignes du Parquet par `work_id` (chaîne) : `W1 < W10 < W2 < … < W9`.

## Co-autorat par paire de chercheurs (mart `marts_collab_pairs`)

Une ligne par paire non orientée (author_a < author_b) ;
`co_publications` = nombre de works co-signés par les deux (count distinct work_id). Les
solo W6..W10 ne créent AUCUNE paire → co-autorat INCHANGÉ.

| author_a            | author_b            | works co-signés | co_publications |
| ------------------- | ------------------- | --------------- | --------------- |
| A1000000001 (Alice) | A1000000002 (Bob)   | W1, W2, W4      | **3**           |
| A1000000001 (Alice) | A1000000003 (Carol) | W3, W4          | **2**           |
| A1000000002 (Bob)   | A1000000003 (Carol) | W4              | **1**           |

→ **3 paires** `marts_collab_pairs`.

## Topics par œuvre (provenance `curated_work_topics`, lot 1)

Grain publication `(work_id, topic_id)`, provenance **complète** (aucun filtre de
score — le seuil ≥ 0,5 est au mart par author_id, lot 2). `T20001` est **partagé**
par W1, W2, W6 (Alice) et W8 (Bob) ; `T20005` par W4 (trio) et W9 (Bob) ; `T20002` par
W1 et W7 ; `T20003` par W3 et W10.

| work_id | topic_id | display_name                             | score  | subfield / field / domain                                                   |
| ------- | -------- | ---------------------------------------- | ------ | --------------------------------------------------------------------------- |
| W1      | T20001   | Magnetic confinement fusion research     | 0.9991 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W1      | T20002   | Fusion materials and technologies        | 0.9982 | Materials Chemistry / Materials Science / Physical Sciences                 |
| W2      | T20001   | Magnetic confinement fusion research     | 0.9876 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W3      | T20003   | Glycosylation and Glycoproteins Research | 0.9678 | Molecular Biology / Biochemistry… / Life Sciences                           |
| W4      | T20005   | Tokamak plasma diagnostics               | 0.9500 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W5      | T20004   | Muscle metabolism and nutrition          | 0.9510 | Molecular Biology\* / Biochemistry… / Life Sciences                         |
| W6      | T20001   | Magnetic confinement fusion research     | 0.9100 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W7      | T20002   | Fusion materials and technologies        | 0.9200 | Materials Chemistry / Materials Science / Physical Sciences                 |
| W8      | T20001   | Magnetic confinement fusion research     | 0.8800 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W9      | T20005   | Tokamak plasma diagnostics               | 0.9100 | Nuclear and High Energy Physics / Physics and Astronomy / Physical Sciences |
| W10     | T20003   | Glycosylation and Glycoproteins Research | 0.9300 | Molecular Biology / Biochemistry… / Life Sciences                           |

→ **11 lignes** `curated_work_topics` (5 topic_id distincts).
\* le subfield de W5 réutilise `_BIO` (Molecular Biology) dans generate.py.

## Keywords par œuvre (provenance `curated_work_keywords`, lot 1)

Provenance complète : `shield` (0.2103) et `reagent` (0.1138) sont **< 0,3** et restent
dans la provenance lot 1 — ils seront coupés (ou non) par le seuil d'agrégation du lot 2.

| work_id | keyword_id | display_name | score  |
| ------- | ---------- | ------------ | ------ |
| W1      | plasma     | Plasma       | 0.5598 |
| W1      | shield     | Shield       | 0.2103 |
| W2      | plasma     | Plasma       | 0.4471 |
| W3      | chemistry  | Chemistry    | 0.8414 |
| W3      | reagent    | Reagent      | 0.1138 |
| W4      | fusion     | Fusion       | 0.8000 |
| W5      | chemistry  | Chemistry    | 0.6627 |
| W6      | plasma     | Plasma       | 0.6000 |
| W7      | shield     | Shield       | 0.3000 |
| W8      | plasma     | Plasma       | 0.5500 |
| W9      | fusion     | Fusion       | 0.7000 |
| W10     | chemistry  | Chemistry    | 0.8000 |

→ **12 lignes** `curated_work_keywords`. (`keyword_id` ci-dessus = slug ; l'id réel est
l'URL `https://openalex.org/keywords/<slug>`.)

## Agrégat par author_id (mart `researchers`, lot 2)

Grain `(author_id, kind, label_id)`. `weight` = somme des scores des publications du
chercheur portant le label (au-dessus du seuil) ; `freq` = nombre de ces publications.
Seuils **différenciés** : topic ≥ 0,5, keyword ≥ 0,2. `reagent` (0,1138 < 0,2) est
**rejeté** ; `shield` (0,2103 / 0,3000 ≥ 0,2) passe. Chaque auteur hérite des labels de
SES works co-signés ET de ses solo. Les solo W6..W10 densifient les poids/freq.

| author_id (auteur)  | kind    | label_id  | weight                            | freq | provenance |
| ------------------- | ------- | --------- | --------------------------------- | ---- | ---------- |
| A1000000001 (Alice) | keyword | chemistry | 1.5041 (0.8414 + 0.6627)          | 2    | W3, W5     |
| A1000000001 (Alice) | keyword | fusion    | 0.8000                            | 1    | W4         |
| A1000000001 (Alice) | keyword | plasma    | 1.6069 (0.5598 + 0.4471 + 0.6000) | 3    | W1, W2, W6 |
| A1000000001 (Alice) | keyword | shield    | 0.5103 (0.2103 + 0.3000)          | 2    | W1, W7     |
| A1000000001 (Alice) | topic   | T20001    | 2.8967 (0.9991 + 0.9876 + 0.9100) | 3    | W1, W2, W6 |
| A1000000001 (Alice) | topic   | T20002    | 1.9182 (0.9982 + 0.9200)          | 2    | W1, W7     |
| A1000000001 (Alice) | topic   | T20003    | 0.9678                            | 1    | W3         |
| A1000000001 (Alice) | topic   | T20004    | 0.9510                            | 1    | W5         |
| A1000000001 (Alice) | topic   | T20005    | 0.9500                            | 1    | W4         |
| A1000000002 (Bob)   | keyword | fusion    | 1.5000 (0.8000 + 0.7000)          | 2    | W4, W9     |
| A1000000002 (Bob)   | keyword | plasma    | 1.5569 (0.5598 + 0.4471 + 0.5500) | 3    | W1, W2, W8 |
| A1000000002 (Bob)   | keyword | shield    | 0.2103                            | 1    | W1         |
| A1000000002 (Bob)   | topic   | T20001    | 2.8667 (0.9991 + 0.9876 + 0.8800) | 3    | W1, W2, W8 |
| A1000000002 (Bob)   | topic   | T20002    | 0.9982                            | 1    | W1         |
| A1000000002 (Bob)   | topic   | T20005    | 1.8600 (0.9500 + 0.9100)          | 2    | W4, W9     |
| A1000000003 (Carol) | keyword | chemistry | 1.6414 (0.8414 + 0.8000)          | 2    | W3, W10    |
| A1000000003 (Carol) | keyword | fusion    | 0.8000                            | 1    | W4         |
| A1000000003 (Carol) | topic   | T20003    | 1.8978 (0.9678 + 0.9300)          | 2    | W3, W10    |
| A1000000003 (Carol) | topic   | T20005    | 0.9500                            | 1    | W4         |

→ **19 lignes** `marts_researchers` (Alice 9, Bob 6, Carol 4). `reagent` absent (coupé par
le seuil keyword 0,2). Les solo densifient : T20001/plasma freq 3, T20002/shield freq 2
chez Alice ; T20001/plasma freq 3 et T20005/fusion freq 2 chez Bob ; T20003/chemistry
freq 2 chez Carol.

## Profil thématique par auteur (mart `marts_author_profiles`, lot 2)

Grain `(author_id, subfield_id)` ; `weight` = SUM(score) des topics du périmètre porté
par l'auteur pour ce subfield ; `freq` = nb de publications contributrices. Subfields :
`3106` (Nuclear/Physics) = T20001 + T20002 + T20005 ; `2505` (Materials) = T20002 ;
`1312` (Molecular Biology) = T20003 + T20004.

| author_id (auteur)  | subfield_id | subfield                        | weight                                 | freq |
| ------------------- | ----------- | ------------------------------- | -------------------------------------- | ---- |
| A1000000001 (Alice) | 1312        | Molecular Biology               | 1.9188 (T20003 0.9678 + T20004 0.9510) | 2    |
| A1000000001 (Alice) | 2505        | Materials Chemistry             | 1.9182 (T20002 W1 0.9982 + W7 0.9200)  | 2    |
| A1000000001 (Alice) | 3106        | Nuclear and High Energy Physics | 3.8467 (T20001 2.8967 + T20005 0.9500) | 4    |
| A1000000002 (Bob)   | 2505        | Materials Chemistry             | 0.9982 (T20002 W1)                     | 1    |
| A1000000002 (Bob)   | 3106        | Nuclear and High Energy Physics | 4.7267 (T20001 2.8667 + T20005 1.8600) | 5    |
| A1000000003 (Carol) | 1312        | Molecular Biology               | 1.8978 (T20003 W3 0.9678 + W10 0.9300) | 2    |
| A1000000003 (Carol) | 3106        | Nuclear and High Energy Physics | 0.9500 (T20005 W4)                     | 1    |

→ **7 lignes** `marts_author_profiles`. (Le profil n'a pas de filtre de score.)

## Document FTS par auteur (mart `marts_researchers_fts`)

Une ligne par author_id ; `doc_text` = labels de `marts_researchers` répétés `freq`
fois, concaténés par (weight desc, kind, label_id). **3 lignes** (Alice, Bob, Carol).
`Reagent` n'y figure pas (coupé au lot 2). Longueurs `doc_text` : Alice 340, Bob 240,
Carol 135 caractères.

- Alice : `Magnetic confinement fusion research` ×3, `Fusion materials and technologies`
  ×2, `Plasma` ×3, `Chemistry` ×2, `Glycosylation and Glycoproteins Research`,
  `Muscle metabolism and nutrition`, `Tokamak plasma diagnostics`, `Fusion`, `Shield` ×2.
- Bob : `Magnetic confinement fusion research` ×3, `Tokamak plasma diagnostics` ×2,
  `Plasma` ×3, `Fusion` ×2, `Fusion materials and technologies`, `Shield`.
- Carol : `Glycosylation and Glycoproteins Research` ×2, `Chemistry` ×2,
  `Tokamak plasma diagnostics`, `Fusion`.

Tokens FTS discriminants (index `to_tsvector('simple', …)`) : `shield` ne concerne
QU'Alice et Bob (Carol n'a pas shield) ; **`materials`** ne concerne qu'Alice et Bob ;
**`muscle`/`metabolism`/`nutrition`** ne concernent QU'Alice (W5 solo) ;
**`glycosylation`/`glycoproteins`** ne concernent Qu'Alice et Carol.

## Labels d'uplift par paire (`curated_pair_uplift_labels`, lot 3)

**2 lignes.** L'uplift exige une paire ayant ≥ 2 co-publications AVEC une baseline solo
**antérieure des deux côtés** (anti-fuite temporelle, ADR 0067). Le graphe fournit
désormais des solo antérieures (W6..W10) → les baselines sont dérivables.

Baselines solo ANTÉRIEURES (année < année de la co-pub, hors works partagés avec le
partenaire) :

- **(Alice, Bob)** — 3 co-pubs (W1, W2, W4) :
  - W1 (2018) : solo_Alice = avg(W6 0.5, W7 0.6) = 0.55 ; solo_Bob = avg(W8 0.4, W9 0.5) = 0.45.
    uplift = 0.5 − (0.55 + 0.45)/2 = **0.0**.
  - W2 (2019) : mêmes baselines (0.55 / 0.45). uplift = 1.2 − 0.5 = **0.7**.
  - W4 (2021) : solo_Alice = avg(W6 0.5, W7 0.6, W3 0.8) = 0.6333 (W3 est co-écrit avec
    Carol, PAS avec Bob → compte comme solo côté Alice-Bob) ; solo_Bob = avg(W8 0.4, W9 0.5)
    = 0.45. uplift = 1.5 − (0.6333 + 0.45)/2 = **0.9583**.
  - label = moyenne(0.0, 0.7, 0.9583) = **0.552778** (199/360), `n_copubs = 3`.
- **(Alice, Carol)** — 2 co-pubs (W3, W4) :
  - W3 (2020) : solo_Alice = avg(W6 0.5, W7 0.6, W1 0.5, W2 1.2) = 0.70 (W1/W2 co-écrits
    avec Bob, PAS Carol → solo côté Alice-Carol) ; solo_Carol = W10 0.7. uplift =
    0.8 − 0.70 = **0.1**.
  - W4 (2021) : solo_Alice = avg(W6, W7, W1, W2) = 0.70 (W3 co-écrit avec Carol → exclu) ;
    solo_Carol = W10 0.7. uplift = 1.5 − 0.70 = **0.8**.
  - label = moyenne(0.1, 0.8) = **0.45** (9/20), `n_copubs = 2`.
- **(Bob, Carol)** : une SEULE co-pub (W4) → écartée (`having count(*) >= 2`).

| author_a            | author_b            | uplift                 | n_copubs |
| ------------------- | ------------------- | ---------------------- | -------- |
| A1000000001 (Alice) | A1000000002 (Bob)   | **0.552778** (199/360) | **3**    |
| A1000000001 (Alice) | A1000000003 (Carol) | **0.450000** (9/20)    | **2**    |

## Vecteurs sémantiques (lot 3)

Calculés en Python (`onnxruntime` + `tokenizers`, modèle `all-MiniLM-L6-v2` figé dans
l'image), en parité stricte avec le code TS. Un embedding n'est **pas figeable par
valeurs** (384 floats, non bit-exact cross-archi — ADR 0059) : le golden porte sur la
**forme, les invariants et le déterminisme**.

**Texte source par publication** (topics score ≥ 0,3 puis keywords non filtrés, joints
par `, ` ; ordre `score desc, id`) :

| work_id | texte encodé                                                                              |
| ------- | ----------------------------------------------------------------------------------------- |
| W1      | `Magnetic confinement fusion research, Fusion materials and technologies, Plasma, Shield` |
| W2      | `Magnetic confinement fusion research, Plasma`                                            |
| W3      | `Glycosylation and Glycoproteins Research, Chemistry, Reagent`                            |
| W4      | `Tokamak plasma diagnostics, Fusion`                                                      |
| W5      | `Muscle metabolism and nutrition, Chemistry`                                              |
| W6      | `Magnetic confinement fusion research, Plasma`                                            |
| W7      | `Fusion materials and technologies, Shield`                                               |
| W8      | `Magnetic confinement fusion research, Plasma`                                            |
| W9      | `Tokamak plasma diagnostics, Fusion`                                                      |
| W10     | `Glycosylation and Glycoproteins Research, Chemistry`                                     |

> Pour le texte, le seuil topic est 0,3 (parité TS), **pas** le 0,5 du mart lexical. Les
> keywords ne sont jamais filtrés pour le texte → `Reagent` (0,11) figure pour W3.

**`curated_work_vectors`** (provenance, grain `work_id`) : **10 lignes** (W1..W10),
vecteur(384) `float32` **non normalisé** (re-poolable, ADR 0059).

**`marts/researcher_vectors`** (servi, grain `author_id`) : **3 lignes** (Alice, Bob,
Carol), mean-pool non pondéré des vecteurs des publications **puis** un unique L2 →
`‖v‖ ≈ 1`. Alice agrège W1,W2,W3,W4,W5,W6,W7 ; Bob agrège W1,W2,W4,W8,W9 ; Carol agrège
W3,W4,W10.

Invariants vérifiés (pytest) : dimensions 384 ; `‖v_publication‖ ≠ 1` ; `‖v_auteur‖ ≈ 1`
(`abs=1e-5`) ; **déterminisme intra-archi** (2 runs → `sha256` canonique identique sur
les vecteurs arrondis à 6 décimales). Pas de comparaison bit-exact cross-archi.

## Purge chirurgicale RGPD (lot 5)

Une **opposition** est une liste de couples `(author_id, work_id)` (var dbt
`opposition_pairs` / env `OPPOSITION_PAIRS`, JSON ; **source unique** lue par le mart
lexical dbt ET l'asset vecteur Python). Défaut `[]` = **aucune opposition** = marts
**identiques au jour J** (capacité non actionnée, non-régression).

**Scénario A — opposition `(Alice, W4)` (anti-sur-effacement co-auteur).** W4 est le
trio Alice+Bob+Carol. Alice s'oppose à sa participation à W4 :

- Alice **perd** `T20005` et `fusion` (ce que W4 lui apportait en propre — elle n'a pas
  d'autre source pour eux) → total marts_researchers passe de 19 à **17 lignes** ;
- Bob **conserve** `T20005` (**1.8600, freq 2** — via W4 ET W9) et `fusion` (**1.5000,
  freq 2** — via W4 ET W9) ; Carol **conserve** `T20005` (0.9500, freq 1) et `fusion`
  (0.8000, freq 1). **Preuve : une opposition ne retire jamais la donnée d'autrui.**

**Scénario B — opposition `(Alice, W1)` (label partagé).** Total reste **19 lignes**
(rien ne disparaît d'Alice : chaque label de W1 a une AUTRE source) :

- `T20001` (W1 + W2 + W6) → re-dérivé 1.8976 / freq 2 (via W2 + W6) ;
- `plasma` (W1 + W2 + W6) → re-dérivé 1.0471 / freq 2 (via W2 + W6) ;
- `T20002` (W1 + W7) → **survit via W7** : 0.9200 / freq 1 ;
- `shield` (W1 + W7) → **survit via W7** : 0.3000 / freq 1 ;
- Bob totalement intact (`T20001` 2.8667/3, `shield` 0.2103/1).

La **provenance** (`curated_work_*`, `curated_work_vectors`) n'est **jamais filtrée** :
elle reste complète et re-poolable. Seuls les **agrégats servis** re-dérivent sur les
couples non opposés.

## Affiliations EUNICoast (ADR 0105)

Le mart EST le périmètre déjà filtré : **tous** les auteurs sont affiliés Le Havre
(`INST_LH`, ROR EUNICoast `https://ror.org/05v509s40`) et **tous** les works ≥ 2016. Le
filtre ROR/année vit dans l'asset `mart_eunicoast`. `curated_eunicoast_works` = une simple
projection de `curated_works` (**10 works** : W1..W10), ancre nommée pour l'uplift et les
profils.
