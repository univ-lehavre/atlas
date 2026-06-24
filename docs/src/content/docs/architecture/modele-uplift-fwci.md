---
title: "Modèle d'uplift de FWCI : qualités, précautions et tests"
---

## De quoi parle cette page

**En une phrase.** Le pipeline `citation` produit, pour le réseau EUNICoast, un
modèle qui **prédit la valeur ajoutée d'une collaboration** entre deux chercheurs —
et cette page explique ce que le modèle garantit, les précautions prises pour qu'il
ne se trompe pas en se croyant juste, et les tests qui le prouvent.

Elle s'adresse à un lecteur **non développeur** (déployeur, relecteur, responsable de
traitement) : la décision structurante vit dans
l'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) ; ici on décrit le
**comportement servi** et les **garde-fous vérifiables**.

### Glossaire express

- **FWCI** (_Field-Weighted Citation Impact_) : indice d'impact d'une publication,
  **normalisé par domaine et par année**. Un FWCI de 1,0 = impact moyen du champ ; 2,0 =
  deux fois plus cité que la moyenne du domaine. Il vient de la source OpenAlex, capté
  par publication tout au long du pipeline.
- **Uplift** : la **valeur ajoutée** d'une collaboration = FWCI obtenu **ensemble** moins
  le FWCI **solo** habituel des deux auteurs. C'est une mesure « 1 + 1 > 2 », pas l'impact
  absolu. Un uplift positif = la paire publie mieux ensemble que séparément.
- **EUNICoast** : alliance européenne de **13 universités** côtières et insulaires (dont
  Le Havre). Le périmètre du modèle se limite aux publications dont **au moins un auteur**
  y est affilié, et **datant de moins de dix ans**.
- **Subfield** : sous-domaine thématique d'une publication (taxonomie OpenAlex). Un auteur
  est représenté par la **distribution pondérée** des subfields qu'il a traités.
- **MAE** (_Mean Absolute Error_, erreur absolue moyenne) : moyenne des écarts (en valeur
  absolue) entre l'uplift prédit et l'uplift réel. Plus elle est basse, mieux c'est ; on la
  compare à une **baseline** triviale (prédire la moyenne) pour juger si le modèle apprend.
- **R²** (coefficient de détermination) : part de la variance de l'uplift expliquée par le
  modèle. 0 = le modèle ne fait pas mieux que prédire la moyenne ; 1 = prédiction parfaite.

## Ce que le modèle produit

À chaque exécution, le modèle sert **deux jeux de données immuables** (Parquet, sous
`dt=…/run=…`) :

- **`marts/pair_uplift_predictions`** : pour des **paires de chercheurs** (y compris des
  paires qui **n'ont jamais collaboré** — c'est tout l'intérêt), l'uplift prédit.
- **`marts/author_recommendations`** : pour chaque chercheur, son **top-10 de partenaires**
  à fort uplift (la recommandation de _thématiques_ se dérive ensuite du profil du
  partenaire).

Chaque jeu porte un `served_mode` qui dit **comment** il a été produit — c'est le cœur des
précautions ci-dessous.

## Précaution n°1 — Une personne n'est jamais une variable du modèle

**Le principe.** Pour l'entraînement, on n'utilise **jamais l'identité** d'un chercheur
(son identifiant). Un chercheur entre dans le modèle **uniquement par ses thématiques**,
via **deux familles de features** :

1. le **vecteur de subfields** (sa distribution pondérée de sous-domaines) — le socle,
   toujours présent et interprétable ;
2. l'**embedding sémantique** (un vecteur de 384 dimensions issu du texte de ses
   publications, `researcher_embeddings`) — qui capte une proximité thématique **fine**,
   au-delà des catégories. Quand un chercheur n'a pas d'embedding utilisable, cette
   famille est **neutralisée** pour la paire (et un indicateur le signale au modèle), sans
   jamais faire disparaître la paire ni écraser le socle thématique.

Une paire est décrite par la **combinaison** de ces vecteurs (leur proximité, leur
complémentarité), pas par « qui » sont les deux personnes.

**Pourquoi.** Deux raisons.

1. **Généralisation.** Si le modèle apprenait par identité, il ne saurait rien dire d'une
   paire jamais vue. En apprenant sur les **thématiques**, il peut prédire l'uplift de deux
   chercheurs qui n'ont jamais collaboré — l'objectif même du produit.
2. **Protection des personnes.** L'identifiant sert de **clé de jointure** technique, jamais
   de variable explicative. Le modèle raisonne sur des domaines de recherche, pas sur des
   individus. Cela limite l'exposition au sens du RGPD (le code _permet_ ce traitement ; il
   ne décide pas de sa licéité à la place du responsable — l'établissement déployeur).

**Les features sont symétriques.** Une paire n'est pas orientée : la description de
(Alice, Bob) est **identique** à celle de (Bob, Alice). C'est garanti par construction
(cosinus, différence absolue, produit terme à terme — tous symétriques).

## Précaution n°2 — Jamais regarder le futur (anti-fuite temporelle)

**Le principe.** L'uplift compare le FWCI d'une collaboration au FWCI **solo habituel** de
chaque auteur. Ce « solo habituel » est calculé **uniquement sur les publications
ANTÉRIEURES** à la collaboration. On ne laisse **jamais** une publication postérieure
gonfler la baseline — sinon on tricherait en utilisant l'avenir pour expliquer le passé.

**Un exemple chiffré (refaisable à la main).** Soit une paire avec deux co-publications :

| Co-publication | Année | FWCI ensemble | Baseline solo (pubs **antérieures** seulement) | Uplift |
| -------------- | ----- | ------------- | ---------------------------------------------- | ------ |
| W10            | 2018  | 10,0          | (1,5 + 4,0) / 2 = 2,75                         | 7,25   |
| W11            | 2019  | 6,0           | (2,0 + 3,5) / 2 = 2,75                         | 3,25   |

Uplift moyen de la paire = (7,25 + 3,25) / 2 = **5,25**.

Si une publication **postérieure** très citée (disons un FWCI de 100 en 2020) avait été
intégrée à tort dans la baseline, le « solo habituel » exploserait et l'uplift
s'effondrerait artificiellement. Le test
[`test_uplift_anti_temporal_leakage`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/tests/test_uplift_labels.py)
vérifie exactement ce scénario : la valeur attendue est **5,25**, et la publication future
**ne doit pas** y figurer.

**Une paire doit avoir au moins deux co-publications** avec une baseline des deux côtés
(`HAVING count(*) >= 2`), sinon elle est écartée — un seul point ne fait pas une tendance.

## Précaution n°3 — La validation est honnête (et on le prouve par l'absurde)

C'est la précaution la plus importante, et la plus facile à négliger.

**Validation groupée par auteur.** Pour mesurer le pouvoir prédictif, on découpe les
données de sorte qu'**un même chercheur ne soit jamais à la fois dans l'échantillon
d'entraînement et de test** (technique _GroupKFold_). Sans cela, un chercheur « vu » à
l'entraînement fuiterait via ses autres paires, et le R² serait **faussement optimiste**.

**La preuve par l'absurde (le garde-fou falsifiable).** Documenter une vertu ne prouve
rien. On la **teste à l'envers** :

- **Sur un signal réel** (l'uplift dépend vraiment des thématiques), le modèle l'apprend :
  R² **> 0,2** en validation groupée
  ([`test_model_learns_thematic_signal`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/tests/test_uplift_model.py)).
- **Sur du bruit pur** (un uplift sans aucun lien aux thématiques), le modèle **n'apprend
  rien** : R² **< 0,05**
  ([`test_no_signal_gives_zero_r2`](https://github.com/univ-lehavre/atlas/blob/main/dataops/citation-dagster/tests/test_uplift_model.py)).

Ce **test négatif** est essentiel : il démontre que notre validation **ne se laisse pas
abuser** par un faux signal. Un modèle qui « apprendrait » du bruit serait en
sur-apprentissage ; le nôtre, validé groupé, ne le fait pas. C'est ce qui rend la première
mesure (R² > 0,2) crédible plutôt que décorative.

## La porte de décision — prédictif ou repli descriptif

Un modèle ne mérite d'être servi que s'il a un **pouvoir prédictif honnête**. À chaque
exécution, le pipeline applique une **porte de décision** :

- **Pouvoir confirmé** (R² honnête **> 0,05** _et_ MAE meilleure que la baseline) → on sert
  les **prédictions** du modèle, `served_mode = "predictive"`, y compris pour les paires
  inédites.
- **Pouvoir insuffisant** (R² qui s'effondre, ou trop peu de données) → **repli descriptif**,
  `served_mode = "descriptive"` : on sert l'uplift **observé** des paires connues, sans rien
  prédire d'inédit. Mieux vaut une description honnête qu'une prédiction creuse.

**Pourquoi le seuil à 0,05 ?** Un R² ≤ 0 signifie « pas mieux que prédire la moyenne » ; on
veut donc une marge **strictement positive et non triviale**. 0,05 est un plancher
volontairement **bas et prudent** : on n'exige pas une forte corrélation pour basculer en
prédictif, mais on **refuse** le bruit (le contrôle ci-dessus tombe sous ce seuil). Un seuil
plus haut (0,10) rejetterait des modèles faibles mais réels (plus de repli descriptif) ; un
seuil nul accepterait un modèle sans valeur. La condition jointe « **et** bat la baseline en
MAE » empêche un R² légèrement positif mais inutile de passer la porte. Ce choix est
révisable à la lumière des mesures de production.

> **Note sur les chiffres.** Le seuil **0,05** est la porte de production. Le **0,2** des
> tests est le seuil d'une _fixture_ synthétique (un signal fort par construction). Le
> **0,50** cité dans le rapport de reconnaissance est une mesure de **spike** ponctuelle et
> **optimiste** (script hors dépôt, échantillon Le Havre) : un indice de faisabilité, **pas**
> une garantie de performance en production. La performance réelle est ce que la porte de
> décision mesurera, honnêtement, à chaque exécution.

## Le contrat des données servies (qualité bloquante)

Deux contrôles **Great Expectations bloquants** valident les marts servis avant qu'ils ne
soient consommables (un échec fait échouer l'exécution) :

- **`ge_pair_uplift_predictions`** : clés non nulles, paire **canonique** (auteur A < auteur
  B, pas de doublon orienté), `served_mode` dans le domaine fermé `{predictive, descriptive}`.
- **`ge_author_recommendations`** : un chercheur **ne se recommande pas lui-même**, le rang
  est **≥ 1**, clés non nulles.

Chaque mart est en outre accompagné d'un **manifest** atomique (`sha256`, nombre de lignes,
sentinelle écrite en dernier) : le consommateur lit le manifest **à côté** du Parquet pour
savoir que l'écriture est complète et intègre.

## Les jeux de données utilisés

**En entrée :**

- **Snapshot OpenAlex** (works + authors) : la source ouverte, d'où viennent FWCI, auteurs,
  affiliations (`institutions.ror`) et thématiques (subfields).
- **Référentiel EUNICoast** (`seeds/ref_eunicoast.csv`, **14 lignes** : les 13 établissements
  membres + 1 alias historique pour l'Université des Antilles). Il sert à filtrer le
  périmètre par ROR (_Research Organization Registry_, l'identifiant institutionnel
  standard).

**Produits intermédiaires :**

- **`curated_eunicoast_works`** : les publications avec ≥ 1 auteur EUNICoast **et** datant de
  moins de dix ans, portant leur FWCI.
- **`marts_author_profiles`** : pour chaque chercheur, sa distribution pondérée de subfields
  (sa représentation thématique). L'identifiant n'y est qu'une **clé de jointure**.
- **`marts/researcher_vectors`** : pour chaque chercheur, son **embedding sémantique** (384
  dimensions, L2-normalisé) — la seconde famille de features. Un chercheur sans embedding
  utilisable (vecteur nul) est simplement traité avec la famille embedding neutralisée.
- **`curated_pair_uplift_labels`** : la cible d'apprentissage (l'uplift observé par paire),
  calculée avec l'anti-fuite temporelle décrite plus haut.

**Données de test (déterministes).** Les tests n'utilisent **aucune donnée personnelle
réelle** : ils s'appuient sur des **fixtures synthétiques** à graine figée — soit un signal
thématique construit de toutes pièces (pour vérifier que le modèle l'apprend), soit du bruit
pur (pour vérifier qu'il ne l'apprend pas), soit de petits scénarios SQL contrôlés (pour
l'anti-fuite). Cette reproductibilité est une exigence du dépôt.

## Récapitulatif des tests

| Test                                                            | Ce qu'il prouve                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `test_pair_features_symmetric`                                  | Une paire n'est pas orientée : f(A,B) = f(B,A).                                          |
| `test_author_vectors_l2_normalized`                             | La représentation thématique est normalisée (comparable par cosinus).                    |
| `test_model_learns_thematic_signal`                             | Sur un vrai signal, le modèle l'apprend (R² > 0,2, validation **groupée**).              |
| `test_no_signal_gives_zero_r2`                                  | Sur du **bruit pur**, le modèle n'apprend rien (R² < 0,05) — **anti-sur-apprentissage**. |
| `test_build_dataset_skips_pairs_without_profile`                | Une paire sans profil thématique des deux côtés est écartée.                             |
| `test_top_recommendations_per_author_ranked`                    | Les partenaires sont classés par uplift décroissant, top-N par auteur.                   |
| `test_top_recommendations_respects_top_n`                       | On ne garde que les N meilleurs partenaires.                                             |
| `test_train_final_predicts`                                     | Le modèle final prédit un uplift par paire.                                              |
| `test_asset_serves_predictive_on_signal`                        | Porte de décision : signal réel → mode **prédictif**, sert toutes les paires.            |
| `test_asset_falls_back_descriptive_on_noise`                    | Porte de décision : bruit → **repli descriptif** (paires connues seules).                |
| `test_uplift_anti_temporal_leakage`                             | L'anti-fuite : une publication future ne gonfle pas la baseline (uplift = 5,25).         |
| `test_pair_needs_two_copubs_with_baseline`                      | Une paire exige ≥ 2 co-publications avec baseline.                                       |
| `test_copub_without_prior_solo_dropped`                         | Une co-publication sans solo antérieur est écartée.                                      |
| `test_embedding_vectors_l2_normalized_and_skips_null`           | L'embedding par auteur est L2-normalisé ; un vecteur nul/absent est écarté.              |
| `test_pair_features_combined_symmetric_and_neutral_when_absent` | Features deux familles symétriques ; embedding neutralisé (+ drapeau) si absent.         |
| `test_combined_features_capture_embedding_signal`               | Un signal porté **uniquement** par l'embedding est appris (validation groupée).          |
| `test_combined_dataset_rejects_noise`                           | Contrôle négatif **avec** embedding : le bruit reste à R² < 0,05 (pas de faux signal).   |
| `test_asset_uses_embedding_family_when_available`               | L'asset branche l'embedding et expose sa **couverture** (part d'auteurs concernés).      |

## Ce qui n'est pas (encore) en place

Par honnêteté, ce que le modèle **ne fait pas encore**, malgré son intérêt :

- La **recommandation de thématiques explicites** (au-delà des partenaires) est dérivable du
  profil des partenaires recommandés, mais n'est pas un livrable distinct à ce stade.
- Le **suivi de dérive** (drift) du modèle relève du chantier MLOps de niveau 2 et n'est pas
  une garantie de ce modèle.

Ces points sont des perspectives, pas des promesses tenues — la distinction est faite ici
pour ne pas laisser croire à un appui qui n'existe pas dans le code.
