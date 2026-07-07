---
title: "0097 — Génération des candidats du modèle d'uplift par plus-proches-voisins (kNN)"
---

## Contexte

L'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) a posé le **modèle
prédictif d'uplift FWCI** : pour un auteur, recommander des partenaires à fort potentiel
de collaboration, **y compris entre auteurs qui n'ont jamais collaboré**. L'implémentation
servait ces recommandations en **scorant toutes les paires** d'auteurs profilés : une
double boucle `(a < b)` sur l'ensemble des auteurs, chaque paire passée au modèle.

À l'échelle du banc (quelques dizaines d'auteurs synthétiques), c'était trivial. **À
l'échelle réelle du périmètre EUNICoast** — l'ingestion complète produit **~90 000
auteurs profilés** — l'exhaustivité devient **quadratique** : `C(90 000, 2) ≈ 4
milliards de paires`. Chacune génère un vecteur de features (thématique + embedding) puis
une prédiction, accumulés en mémoire. Résultat constaté en production le 2026-07-07
(**drift L89**, registre cluster) : le pod de run `transform_job` est **OOMKilled** dès le
démarrage de `pair_uplift_model`, alors que **tout l'amont** (dbt, co-autorat, embeddings)
était vert. Au-delà de la mémoire, le **temps** de 4 milliards d'inférences et la **taille**
du Parquet de sortie rendent l'exhaustivité intractable — quel que soit le dimensionnement
du pod.

C'est un **écart banc/prod invisible au banc** (trop peu d'auteurs pour que O(N²) fasse
mal) : la décision de conception « scorer toutes les paires » n'était pas soutenable à
l'échelle. Elle doit être **actée explicitement**, car elle change **ce que le modèle
recommande**.

## Décision

Le modèle d'uplift **ne score plus toutes les paires**, mais un ensemble de **candidats
générés par plus-proches-voisins (kNN)** — le patron standard des systèmes de
recommandation (« candidate generation » puis « ranking ») :

- **Voisinage** : pour chaque auteur, ses **k plus proches voisins** par **cosinus**, dont
  on prend l'**union symétrisée**. Le nombre de paires passe de `N²/2` à **~N·k** (borné,
  linéaire en N).
- **Espace du voisinage = le vecteur THÉMATIQUE** (distribution de subfields,
  `marts_author_profiles`), **pas** l'embedding sémantique. C'est le socle **universel** :
  tout auteur profilé possède un vecteur thématique (invariant fondateur d'ADR 0067 : « la
  paire entre par la **combinaison de ses profils thématiques**, jamais par l'identité »),
  donc **aucun auteur profilé n'est exclu** du candidate-generation. L'embedding — présent
  seulement pour une partie des auteurs — continue d'**enrichir les features** de chaque
  paire candidate (`pair_features_combined`), il ne **pilote pas** le voisinage.
- **Invariants préservés** : features symétriques, modèle et sorties inchangés
  (`pair_uplift_predictions`, `author_recommendations`, `top_recommendations`). Seul le
  **périmètre des candidats** change. Au **petit N** (`k ≥ N−1`) le kNN **dégénère
  exactement en toutes-les-paires**, ce qui préserve le comportement historique et les
  tests d'asset existants.
- **Déterminisme** ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) : le
  calcul par blocs + `argpartition` + les tris de sortie gardent un résultat reproductible.

Le défaut est **k = 50** (`KNN_DEFAULT`), avec `k ≥ TOP_N` (10) pour garantir assez de
partenaires par auteur après symétrisation.

## Alternatives écartées

- **Garder l'exhaustivité en la streamant** (scorer par lots, écrire au fil de l'eau) :
  résout l'OOM mais **pas** le temps (~4 milliards d'inférences) ni la taille de sortie.
  L'exhaustivité elle-même est le problème, pas seulement sa matérialisation.
- **Relever la limite mémoire du pod** : ne borne rien — O(N²) rattrape n'importe quelle
  limite dès que le corpus grandit.
- **Voisinage sur l'embedding sémantique** (384-dim) plutôt que thématique : plus « riche »
  mais **exclut les auteurs sans embedding** du candidate-generation (couverture partielle),
  et **couple** le modèle à l'index pgvector (`index_load`) — or celui-ci est un **frère
  indépendant** de `pair_uplift_model` dans le DAG (aucune arête de dépendance), donc
  l'ordre d'exécution ne garantit pas sa disponibilité au moment du scoring. Le voisinage
  **thématique in-memory** évite cette contrainte d'ordonnancement et couvre **tous** les
  auteurs.
- **Restreindre arbitrairement le périmètre** (top-K auteurs par volume) : rapide mais
  écarte des auteurs sans justification métier.

## Statut

Accepted.

## Conséquences

- **L'OOM disparaît** et le coût redevient linéaire (`~N·k`), à corpus EUNICoast comme au
  banc. Le `transform_job` peut prouver l'aval complet (uplift + index pgvector) à l'échelle
  réelle.
- **Sémantique assumée** : le modèle recommande désormais dans un **voisinage thématique**,
  pas dans l'espace exhaustif. C'est **cohérent** avec la finalité d'ADR 0067 (recommander
  des partenaires **pertinents**, y compris inédits) — un partenaire à fort uplift est, par
  construction du signal, thématiquement proche. Les paires très éloignées, qui
  n'auraient de toute façon quasi jamais remonté dans le top-N, ne sont plus scorées.
- **Métrique de suivi** : `n_pairs_served` (MLflow) devient un **nombre de candidats**
  (~N·k), plus un `C(N,2)`. À interpréter comme tel.
- **Repli descriptif inchangé** : quand la porte de décision (`has_predictive_power`) n'est
  pas franchie, on sert toujours l'uplift **observé** des paires connues — ce chemin ne
  passe pas par le candidate-generation.
- **Réglage** : `k` (`KNN_DEFAULT`) est un levier qualité/coût ; l'augmenter élargit le
  voisinage (plus de candidats, plus de coût), le baisser le resserre.
