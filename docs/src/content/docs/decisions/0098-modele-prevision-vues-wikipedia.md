---
title: "0098 — Modèle de prévision des vues Wikipédia des établissements (pageviews)"
---

## Contexte

La source `pageviews` ([ADR 0095](/atlas/decisions/0095-source-pageviews-universites/))
produit une **série temporelle mensuelle** `(university_id, month, views)` : les
consultations de la page Wikipédia de chaque établissement d'enseignement supérieur,
toutes langues confondues. L'[ADR 0096](/atlas/decisions/0096-modele-explicatif-trafic-universites/)
visait un **modèle explicatif causal** (panel à effets fixes) pour _conseiller_ un
établissement sur les leviers de son trafic. Le proto a montré que cette ambition
causale est fragile sur données observationnelles (l'effet de la longueur de page,
après tests de robustesse, se réduit à une association ~+10-15 % transitoire, non
causale nette). On **réduit l'ambition** à une tâche mieux posée et directement utile :
**prévoir** le volume de vues à horizon **1 mois, 3 mois, 1 an**.

Le dépôt a déjà un **patron maison** de modèle de prévision de série temporelle dans un
pipeline DataOps : `mediawatch` ([ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/))
prévoit le volume d'articles de presse par université. On **réplique ce patron** —
module pur, asset Dagster, validation honnête, porte de décision prédictif/descriptif,
suivi MLflow, drift Evidently, contrat Parquet + manifest — en l'adaptant à notre série.

Deux contraintes cadrent la conception (identiques à l'ADR 0081) :

- **Échelle.** Le référentiel compte ~19 000 établissements couverts ([ADR 0095]). Un
  modèle de série indépendant par établissement (ARIMA/ETS/Prophet ×N) ne **scale pas**.
- **Honnêteté temporelle.** Une série ne se valide pas par validation croisée aléatoire :
  tester sur du passé un modèle qui a vu le futur est une **fuite**.

## Décision

### Statut de l'ADR 0096

Le modèle explicatif causal de l'[ADR 0096](/atlas/decisions/0096-modele-explicatif-trafic-universites/)
est **superseded** par le présent ADR. Le travail causal (posture « associations
honnêtes », tests de robustesse within-page) reste une **référence méthodologique
valable** — il documente _pourquoi_ on n'a pas retenu la voie explicative — mais n'est
plus le modèle cible du pipeline.

### Algorithme et échelle

**Un modèle GLOBAL unique** = `HistGradientBoostingRegressor` (scikit-learn), jamais un
modèle par série. L'identité de l'établissement est une **feature catégorielle**
(`univ_code`, encodage ordinal stable par tri lexical, déterminisme ADR 0057) traitée
nativement par le gradient boosting — coût **O(1) modèle**, pas O(N).

### Granularité et horizons — le point d'adaptation vs mediawatch

`mediawatch` est **journalier** (saisonnalité hebdomadaire, S=7). Notre source
`pageview_complete` est **mensuelle** → la série est mensuelle, à saisonnalité
**annuelle** (cycle universitaire : rentrée, examens, creux estival). D'où :

- lags et moyennes mobiles en **mois** (`lag_1/2/3/12`, `roll_3/12` ; `lag_12` = même
  mois l'an dernier, capte la saison) ;
- saisonnalité encodée par `month_sin/cos` (S=12) ;
- **baseline** = saisonnier naïf **annuel** (recule de k×12 mois), repli persistance.

Les trois horizons métier demandés — « 1 semaine / 1 mois / 1 an » — sont réexprimés à
la **granularité mensuelle** de la donnée : `month_1` (1 mois), `month_3` (3 mois),
`year_1` (12 mois). « 1 semaine » n'a pas de sens sur une série mensuelle ; l'horizon
court servi est donc **1 mois**. Approche **direct multi-step** : l'horizon `h` (mois)
est une feature, le modèle prédit le volume mensuel à `t+h`, et les fenêtres métier
s'obtiennent par **agrégation aval** (somme des `h` premiers mois → cohérence interne
`year_1 ⊇ month_3 ⊇ month_1`). Le **recursive multi-step est écarté** (propage l'erreur).

### Anti-fuite et validation honnête

- Features strictement **passées** (lags/rolling ≤ mois d'origine `t`) ; mois sans vue
  **comblés à 0** (sinon un lag sauterait des trous et lirait un mauvais mois) ;
- **validation temporelle** (`TimeSeriesSplit` sur les mois d'origine distincts), jamais
  KFold aléatoire ;
- **embargo décisif** : le train ne voit aucune ligne dont la _date cible_
  (`origine + horizon`) est ≥ la plus précoce cible du test. Sans lui, le modèle « bat »
  la baseline même sur du bruit i.i.d. (faux pouvoir prédictif). Prouvé par un **contrôle
  négatif** (série de bruit → mode descriptif, R² ≤ 0).

### Porte de décision (parité ADR 0081/0067)

`R² honnête > 0,05` **ET** `MAE < MAE_baseline` → mode **prédictif** (modèle servi) ;
sinon **repli descriptif** (baseline saisonnière servie). Le `served_mode` est porté sur
chaque ligne servie — le drift le lit.

### Contrat de sortie et MLOps

Mart servi `marts/views_forecast/` (Parquet + `manifest.json` atomique, contrat
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) : `(university_id,
horizon_label, window_start, window_end, views_pred, served_mode)`. Prévision **jamais
négative** (clip ≥ 0), déterminisme figé (`RANDOM_STATE=42`, ADR 0057). Runs MLflow
best-effort (no-op sans serveur) + drift Evidently avec **bascule `predictive →
descriptive` BLOQUANTE**. Piège ADR 0086 : `MLFLOW_TRACKING_URI` réinjecté au **niveau du
run**, pas seulement sur le Deployment gRPC.

## Conséquences

- **Positif** : tâche bien posée et directement utile (prévoir ≠ prétendre expliquer
  causalement) ; réplique un patron déjà éprouvé (`mediawatch`) → cohérence et
  réutilisation ; un seul modèle scalable ; validation honnête à contrôle négatif.
- **Coût** : abandon de l'ambition « conseiller les leviers » (l'explicatif causal exige
  une variation exogène absente, cf. ADR 0096 superseded).
- **Limite assumée** : la prévision à **1 an** demande un historique suffisant et une
  saisonnalité stable — fiable pour les établissements à trafic net (cycle universitaire
  marqué), plus fragile sur la longue traîne clairsemée (médiane 3 langues, [ADR 0095]) ;
  la porte de décision rabat proprement ces séries en descriptif.
- **Frontière cluster** : aucun point de contact nouveau instancié ici (proto) ; le
  branchement S3 réel relève de la Phase 5 (garde-fou « même PR » de l'
  [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) au moment du déploiement).
