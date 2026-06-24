---
title: "0068 — Suivi de dérive du modèle d'uplift FWCI (drift applicatif, porte de sécurité)"
---

## Contexte

L'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) a posé le modèle
prédictif d'**uplift** de FWCI (pipeline `citation`) : à chaque exécution, il entraîne un
modèle, mesure son pouvoir prédictif en **conditions honnêtes** (validation groupée par
auteur) et applique une **porte de décision** — servir des prédictions si le pouvoir est
confirmé, sinon **rabattre** sur une sortie descriptive.

Le pipeline dispose déjà d'un **suivi de dérive des embeddings d'entrée**
(`evidently_embedding_drift`, [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)) :
il compare la distribution des vecteurs du run N à celle du run N-1 (Evidently), de façon
**informative** (non bloquante), pour nourrir la décision de ré-entraînement.

Ce qui **manque** : un suivi de la dérive du **modèle d'uplift lui-même** — pas de ses
entrées, mais de ses **sorties et de sa qualité**. Le modèle peut se dégrader sans que les
embeddings d'entrée ne dérivent (changement des labels d'uplift, des co-publications, du
périmètre EUNICoast), et il faut le **voir**. La porte de décision protège déjà du pire
(un modèle sans pouvoir cesse de prédire), mais elle ne **trace pas la tendance** ni
n'alerte sur une bascule.

## Décision

On ajoute un **suivi de dérive du modèle d'uplift**, sur le modèle de l'existant
(`evidently_embedding_drift` : corps pur testable + wrapper `asset_check`, réutilisation
de `_list_runs` et du logging MLflow best-effort). Il surveille **quatre signaux**,
comparant le run courant (N) au run consigné précédent (N-1) :

1. **Distribution des uplift prédits** — dérive de la colonne `uplift` du mart
   `pair_uplift_predictions` (N vs N-1), via Evidently (`ColumnDriftMetric`). Détecte un
   **décalage** des prédictions, analogue direct du drift d'embeddings.
2. **Qualité honnête au fil des runs** — `r2` et le ratio `mae / baseline_mae` (déjà
   loggés dans MLflow, expérience `citation_uplift_fwci`). Détecte une **dégradation
   progressive** du pouvoir prédictif, avant même la bascule.
3. **Bascule `served_mode`** — passage `predictive → descriptive` entre N-1 et N. Signal
   binaire fort : **perte complète** du pouvoir prédictif honnête.
4. **Couverture embedding** — `embedding_coverage` (part d'auteurs disposant d'un
   embedding utilisable). Signal d'**entrée** explicatif : une chute affaiblit la 2ᵉ
   famille de features et peut expliquer une dérive des prédictions.

### Comportement : informatif, sauf bascule grave (porte de sécurité)

Contrairement au drift d'embeddings (purement informatif), ce check porte une **porte de
sécurité ciblée** :

- un **décalage** de distribution, une **dégradation** de R²/MAE ou une **baisse** de
  couverture sont **informatifs** (check marqué, loggé MLflow, run **non interrompu**) —
  ils nourrissent la décision de ré-entraînement, comme le drift d'embeddings ;
- une **bascule `predictive → descriptive`** est **bloquante** (`blocking=True` sur ce
  motif précis) : le run **échoue**. _Pourquoi ?_ Cette bascule signifie que le modèle a
  **perdu tout pouvoir prédictif honnête** ce run-là ; servir silencieusement une sortie
  descriptive là où l'on servait du prédictif est un changement de contrat **majeur** qui
  doit **arrêter** le pipeline et forcer une intervention, pas passer inaperçu. Un simple
  décalage, lui, est attendu et bénin. _Contre l'alternative_ « tout informatif » (comme
  l'embedding) : elle laisserait une dégradation grave filer en production. _Contre
  l'alternative_ « tout bloquant » : elle ferait échouer le pipeline sur un décalage
  normal entre deux exécutions. La porte ciblée capture le seul cas qui justifie un arrêt.

Le **premier run** (pas de N-1) passe sans comparaison. MLflow et Marquez restent
**best-effort** (no-op hors cluster), comme partout dans le pipeline.

## Statut

Accepted.

## Conséquences

- **Visibilité** : la tendance de qualité du modèle (R², MAE, couverture) et la stabilité
  de ses sorties deviennent observables run après run (Dagster + MLflow + rapport
  Evidently), pas seulement au moment d'une panne.
- **Sécurité** : une perte totale de pouvoir prédictif (bascule) **arrête** le pipeline —
  un humain décide (ré-entraîner, élargir les données, revoir le périmètre) plutôt que de
  laisser servir un repli descriptif inattendu.
- **Réutilisation** : le check s'appuie sur l'infrastructure de drift existante (ADR 0062)
  et sur les métriques déjà exposées par l'asset `pair_uplift_model` (ADR 0067) — pas de
  nouveau stockage, pas de nouvelle dépendance.
- **Coût** : une lecture S3 supplémentaire (N-1) et un calcul Evidently par run ; les
  imports Evidently restent différés (démarrage Dagster non ralenti).
- **Limite assumée** : le seuil de drift de distribution est délégué à Evidently (pas de
  seuil maison), cohérent avec `evidently_embedding_drift`. Le suivi de tendance R²/MAE
  est exposé mais n'arme pas (encore) d'alerte à seuil — la bascule `served_mode` est le
  garde-fou dur ; affiner des seuils sur R²/MAE est une évolution possible.
