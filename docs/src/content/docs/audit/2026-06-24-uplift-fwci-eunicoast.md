---
title: "Reconnaissance — Modèle d'uplift FWCI EUNICoast (pipeline citation) — 2026-06-24"
---

> Reconnaissance pré-implémentation ([ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/))
> d'une **réorientation du modèle métier** du pipeline `citation` : passer des
> citations croisées ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/))
> à un modèle **prédictif** d'_uplift_ de FWCI entre auteurs, restreint au réseau
> EUNICoast. Conduite par spike jetable (script hors dépôt) sur **données OpenAlex
> réelles**. Trace point-in-time : décrit le terrain au 2026-06-24.

## Glossaire express

- **FWCI** (_Field-Weighted Citation Impact_) : indice d'impact d'une publication,
  normalisé par domaine et année — un FWCI de 1,0 = impact moyen du champ. Champ porté
  par chaque `work` du snapshot OpenAlex.
- **EUNICoast** : alliance européenne de 13 universités côtières/insulaires (dont
  l'Université Le Havre Normandie). Identifiables par leur **ROR** (_Research
  Organization Registry_, identifiant ouvert d'établissement).
- **Uplift** : valeur ajoutée d'une collaboration = FWCI obtenu **ensemble** moins le
  FWCI **solo** habituel des deux auteurs. Mesure « 1 + 1 > 2 », pas l'impact absolu.
- **Spike** : exploration jetable visant à **dé-risquer** une décision par des faits,
  avant tout engagement de code (ici : un modèle ML a-t-il du signal ?).

## Objectif

Le modèle métier actuel du pipeline `citation` produit des **paires de chercheurs par
citations croisées** ([`marts_collab_pairs.sql`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/marts/marts_collab_pairs.sql) :
« qui cite qui »). La nouvelle cible métier est différente : **pour un auteur donné,
recommander des thématiques ou des auteurs à fort potentiel de FWCI** — c'est-à-dire
prédire l'_uplift_ d'une collaboration, **y compris pour des paires qui n'ont jamais
collaboré**, sur le périmètre EUNICoast (≥ 1 auteur affilié) et récent (< 10 ans).

La reconnaissance répond à **deux questions de faisabilité**, dans l'ordre où elles
peuvent tuer le chantier :

1. **Données** : le pipeline dispose-t-il (ou peut-il disposer) du FWCI, des
   affiliations institutionnelles, des thématiques et des co-auteurs nécessaires ?
2. **Signal ML** : l'uplift de FWCI est-il **apprenable** depuis une représentation
   **thématique** des auteurs (jamais leur identité), au-delà d'une baseline triviale ?

## Agents lancés

- **Axe données** : inventaire de ce qui est déjà ingéré/transformé dans `citation`
  (FWCI, topics hiérarchisés, authorships, embeddings) vs ce qui manque.
- **Axe EUNICoast** : liste des 13 établissements membres et résolution de leur ROR
  (site officiel + registre ROR, croisement multi-sources).
- **Axe accès API** : le client OpenAlex existant (`citation-fetch`) expose-t-il les
  champs requis (FWCI, `institutions.ror`) ? Sinon, par quel chemin.
- **Spike (3 scripts jetables, hors dépôt)** : `fetch.py` (tirage API réel),
  `analyze.py` (mesure du signal), `predict.py` (test d'apprenabilité). Le verdict
  complet et les scripts ne sont pas versionnés (exploration jetable, [ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)).

## Constats (prouvés par le code)

**Déjà disponible dans le pipeline `citation`** — l'essentiel du modèle est servi par
l'existant :

- **FWCI** : capté par work, de bout en bout —
  [`stg_citation_works.sql:15`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/staging/stg_citation_works.sql)
  (`cast(fwci as double)`) puis
  [`curated_works.sql:19`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/curated/curated_works.sql).
- **Thématiques hiérarchisées** (domain→field→subfield→topic, avec score) :
  [`stg_citation_topics.sql:12-22`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/staging/stg_citation_topics.sql).
- **Co-auteurs** : `authorships` explosé en (work_id, author_id) —
  [`stg_citation_authorships.sql:5-18`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/staging/stg_citation_authorships.sql) ;
  deux auteurs d'un même `work_id` sont co-auteurs.
- **Embedding thématique par auteur** (vecteur 384, agrégat des topics/keywords) : déjà
  construit par
  [`researcher_embeddings.py`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/src/citation_dagster/assets/researcher_embeddings.py)
  — réutilisable comme l'une des deux représentations d'auteur.
- **Année de publication** (filtre « < 10 ans ») :
  [`stg_citation_works.sql:8`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/staging/stg_citation_works.sql).

**Manque identifié (unique, bloquant le filtre EUNICoast)** : les **institutions des
authorships** sont **explicitement exclues** du staging —
[`stg_citation_authorships.sql:2-3`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dbt/models/staging/stg_citation_authorships.sql)
(« Les institutions (double imbrication) sont HORS périmètre »). Le brut OpenAlex porte
pourtant `authorships[].institutions[].ror` (confirmé sur données réelles au spike). Il
faut projeter ce champ pour filtrer sur les ROR EUNICoast.

**Référentiel EUNICoast** : 13 ROR résolus (haute confiance), dont Le Havre
(`05v509s40`) ; un alias _legacy_ pour les Antilles (`017nssj40`, prédécesseur de
`02ryfmr77`) à inclure pour les publications anciennes.

## Mesures (spike sur données réelles)

Échantillon : Université Le Havre Normandie (ROR `05v509s40`), articles ≥ 2015, tirés
via l'API OpenAlex (**3 104 works**). Un **seul** établissement sur les 13.

| Mesure                               | Valeur            | Lecture                                                       |
| ------------------------------------ | ----------------- | ------------------------------------------------------------- |
| FWCI absent (NULL)                   | 0,6 %             | le FWCI **n'est pas** un trou de données                      |
| FWCI (méd. / moy. / max)             | 0,36 / 1,76 / 292 | longue traîne → des collaborations à fort impact à distinguer |
| Auteurs distincts                    | 8 117             |                                                               |
| Paires de co-auteurs                 | 109 476           |                                                               |
| Paires ≥ 2 co-publications avec FWCI | 15 482            | signal d'entraînement brut abondant                           |
| **Paires entraînables (uplift)**     | **7 393**         | les deux auteurs ont une baseline solo (≥ 3 works avec FWCI)  |
| Subfields distincts                  | 209               | features thématiques denses et lisibles                       |

**Test d'apprenabilité** (`predict.py`) : représentation d'un auteur = **vecteur de
subfields** TF-pondéré, L2-normalisé (**jamais l'`author_id`**). Cible = uplift réel des
7 393 paires. Régression en validation croisée 5-fold contre une baseline triviale
(prédire la moyenne) :

| Modèle                | R² (validation croisée) | MAE               |
| --------------------- | ----------------------- | ----------------- |
| Baseline (moyenne)    | −0,00                   | 0,393             |
| Régression linéaire   | +0,12                   | 0,381             |
| **Gradient boosting** | **+0,50**               | **0,258** (−34 %) |

→ **R² = 0,50 sur les seuls subfields, sans identité d'auteur.** La relation est
**non-linéaire** (le _gradient boosting_ dépasse largement la régression linéaire), ce
qui est cohérent avec l'intuition « certaines combinaisons thématiques se complètent ».
L'embedding 384, l'historique et les 13 établissements (~100 k paires) ne feront
qu'enrichir ce signal.

## Hypothèses non confirmables depuis le repo

- **Généralisation aux 13 établissements** : le spike ne couvre que Le Havre. Le volume
  et le signal des autres membres EUNICoast restent à confirmer (le tirage prod le
  fera). Hypothèse raisonnable mais non prouvée ici.
- **Pouvoir prédictif réel en conditions honnêtes** : le spike a fait un split aléatoire
  **par paire** et n'a pas isolé les fenêtres temporelles. Deux biais optimistes à
  corriger en prod, qui **abaisseront** le R² mesuré :
  - **fuite par auteur** : la validation doit **grouper par auteur** (un auteur ne peut
    être à la fois en entraînement et en test) ;
  - **fuite temporelle** : la baseline solo et l'uplift doivent être calculés sur des
    fenêtres cohérentes (ne pas utiliser le futur pour prédire le passé).
    Le R² de prod sera donc inférieur à 0,50 ; reste à vérifier qu'il demeure nettement
    positif. C'est le premier risque à lever à l'implémentation.
- **Désambiguïsation des auteurs** : `author_id` reste imparfait (plusieurs par
  personne, [ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)) — non
  résolu, et hors périmètre du modèle (porte sur des profils thématiques, pas des
  personnes).

## Décisions tranchées (mainteneur)

- **Cible = uplift** (collab − solo), modèle **prédictif** (ML). Alternative écartée :
  modèle **descriptif** (FWCI observé des collaborations passées) — rejeté car il ne
  recommande que des collaborations **existantes**, alors que l'objectif est de proposer
  de **nouveaux** auteurs/thématiques.
- **Représentation d'un auteur = thématiques uniquement, jamais l'identité** : embedding
  384 (similarité fine) **+** vecteur de subfields (interprétabilité, recommandation de
  thématiques). C'est ce qui rend la prédiction généralisable aux paires inédites
  (raisonner sur des thématiques, pas des personnes) et limite le risque RGPD.
- **Périmètre** : works avec ≥ 1 auteur affilié EUNICoast (13 ROR) ∩ `publication_year`
  ≥ (année courante − 10). **Tous** les auteurs des works retenus sont profilés (pas
  seulement les EUNICoast).
- **Filtre EUNICoast par ROR** (liste figée en seed), pas par nom. Alternative écartée :
  match par nom d'établissement — rejeté (variantes de noms, moins précis) puisqu'une
  liste ROR fiable existe.
- **Démarrage par spike** avant tout engagement de code. Alternative écartée : écrire
  l'ADR + le plan directement — rejeté pour ne pas s'engager sur un modèle au pouvoir
  prédictif non démontré.

## Verdict

**GO.** Les deux questions de faisabilité sont levées par des faits : (1) les données
nécessaires sont disponibles ou récupérables (seul ajout d'ingestion : projeter
`authorships[].institutions[].ror`) ; (2) l'uplift de FWCI est **apprenable** depuis les
thématiques seules (R² = 0,50 en validation croisée, sur un seul établissement, sans
identité d'auteur). Le risque ML principal — un modèle sans pouvoir prédictif — est
écarté.

**Suite** : une **décision structurante** (réorienter le modèle métier de `citation`,
amender l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) →
**ADR** avant le code ; un **plan** de mise en œuvre (`docs/plans/`) ; et les findings
actionnables en **issues** (extraction des affiliations ; seed ROR EUNICoast ;
validation anti-fuite du pouvoir prédictif avant d'investir dans le modèle élaboré).
