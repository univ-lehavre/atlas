---
title: "0081 — Modèle de prévision du volume d'articles par université (mediawatch)"
---

## Contexte

`mediawatch` ([ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)) produit le mart
`marts_university_timeline` : une **série temporelle journalière** `(university_id, event_date,
n_articles)` du volume d'articles de presse (GKG/GDELT) mentionnant chaque université. Jusqu'ici, ce
chronogramme est **descriptif** (ce qui s'est passé). Nouvelle finalité : **prévoir** le volume futur —
à horizon **semaine, mois, trimestre** — par université.

`citation` a posé le **patron maison** d'un modèle prédictif dans un pipeline DataOps : module pur,
asset Dagster, **validation honnête**, **porte de décision** prédictif/descriptif, suivi MLflow, drift
Evidently, contrat Parquet + manifest ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/),
[ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/),
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)). `mediawatch`, lui, n'a
**aucune instrumentation MLOps** (ni MLflow, ni Evidently, ni modèle). On réplique le patron, en
l'adaptant à une tâche de **prévision de série temporelle**, et on instrumente `mediawatch` au même
niveau que `citation`.

Deux contraintes cadrent la conception :

- **Échelle.** En production, le référentiel ROR (type _education_) compte des **milliers**
  d'universités. Un modèle de série indépendant par université (ARIMA/ETS/Prophet ×N) ne **scale pas**.
- **Honnêteté temporelle.** Une série temporelle ne se valide pas par validation croisée aléatoire :
  tester un modèle sur du **passé** alors qu'il a vu le **futur** est une **fuite**. Le découpage doit
  respecter l'ordre du temps.

## Décision

> **`mediawatch` gagne un modèle de prévision du volume d'articles par université, à horizon semaine /
> mois / trimestre. C'est UN modèle GLOBAL de gradient boosting (scikit-learn), où l'identité de
> l'université est une _feature_ catégorielle — jamais un modèle par série. Il est validé
> _honnêtement_ par découpage TEMPOREL contre une baseline saisonnière, avec la même porte de décision
> prédictif/descriptif que l'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/), et
> instrumenté en MLOps complet (MLflow + drift Evidently) au niveau de `citation`.**

### Un modèle global, pas un modèle par série

Le modèle est un **`HistGradientBoostingRegressor`** unique pour toutes les universités. L'identité de
l'université entre comme **feature catégorielle** (`univ_code`, encodage ordinal stable), que le
gradient boosting traite nativement — il apprend un niveau par université **sans** exploser la dimension
(un one-hot de milliers de colonnes serait non-scalable). Un seul `fit`, une seule version à suivre :
**O(1) modèle** quel que soit le nombre d'universités.

### Multi-horizon par un seul modèle, agrégation en aval

Le modèle est **direct multi-step** : l'**horizon `h` (en jours) est une feature**. Il prédit le volume
journalier à `t+h` pour chaque `h`, puis les trois horizons métier sont obtenus par **agrégation aval**
(somme sur 7 / ~30 / ~92 jours). Avantage : **cohérence interne** (la prévision « mois » est la somme
des jours qui le composent) et un seul artefact. Le _recursive multi-step_ (réinjecter la prédiction
comme lag) est **écarté** : il propage l'erreur et transforme un fait passé en prédiction (fuite).

### Features anti-fuite et baseline exigeante

Les features sont **calendaires** (jour de semaine, mois, semaine ISO en sin/cos ; week-end) de la date
**cible**, des **lags** et **moyennes mobiles** strictement **passés** (jamais une date `> t`), une
tendance, et `univ_code`. Les jours sans article sont **comblés à 0** (sinon un lag sauterait des trous
et lirait le futur). La **baseline** est le **saisonnier naïf hebdomadaire** (S=7, repli persistance) —
la baseline « difficile à battre » d'une série à fort creux week-end ; battre la simple moyenne ne
prouverait rien.

### Validation honnête et porte de décision

La validation est **temporelle** (`TimeSeriesSplit` sur les dates d'origine distinctes) : chaque pli
s'entraîne sur le passé et teste sur le futur immédiat. **Jamais** de découpage aléatoire. La **porte de
décision** est identique à l'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) :
`R² honnête > 0,05` **ET** `MAE < MAE_baseline` → le modèle est servi en mode **prédictif** ; sinon
**repli descriptif** (la baseline saisonnière est servie). La porte est **explicite**, pas un doute.

### Instrumentation MLOps complète sur mediawatch

`mediawatch` est aligné sur `citation` : runs **MLflow** (best-effort, no-op sans serveur — le serveur
est fourni par le socle via `MLFLOW_TRACKING_URI`, [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
Le **piège connu** (documenté côté `cluster`) : les variables posées sur le _Deployment_ de la
code-location gRPC **ne se propagent pas** aux pods de run du `K8sRunLauncher` ; `MLFLOW_TRACKING_URI`
doit donc être réinjecté **au niveau du run** (comme `OPENLINEAGE_URL` l'est déjà), sinon le suivi tombe
en no-op silencieux dans le pod de run. **Drift Evidently** sur la distribution prédite, **asset check**
dont la seule bascule **`predictive → descriptive` est BLOQUANTE** (parité
[ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/) : une perte de pouvoir prédictif est un
changement de contrat majeur).

### Un asset Python, un contrat de sortie

Le modèle vit dans un **asset Python** (comme `pair_uplift_model`), **pas** un modèle dbt : le pouvoir
prédictif vient du gradient boosting non linéaire, qu'une approximation SQL abandonnerait. dbt reste la
couche `staging → curated → marts_university_timeline` (la **source**) ; le forecast est **en aval**. La
sortie est un mart **servi** `marts/university_timeline_forecast/` (Parquet + `manifest.json` atomique),
sous le **contrat** [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/). Prévision
**jamais négative** (clip ≥ 0). Déterminisme figé (`RANDOM_STATE`, [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).

## Alternatives écartées

- **Un modèle de série par université (ARIMA/ETS/Prophet).** Écartée : ne **scale pas** à des milliers
  de séries (coût CPU × N), et certaines universités ont trop peu d'historique. Le modèle global capte
  la saisonnalité partagée et un niveau par université à coût constant.
- **Trois modèles, un par horizon.** Écartée : triple le coût (entraînement, drift, manifest) et risque
  l'**incohérence** (prévision « semaine » non incluse dans « mois »). Un modèle multi-step + agrégation
  garantit la cohérence.
- **Recursive multi-step** (réinjecter la prédiction comme lag). Écartée : propage l'erreur sur
  l'horizon et **casse l'anti-fuite** (un lag devient une prédiction).
- **Modèle dbt (SQL).** Écartée : abandonne le non-linéaire — même raison que l'ADR 0067 pour l'uplift.
- **Validation croisée aléatoire (KFold).** Écartée : **fuite temporelle** (tester sur du passé avec un
  modèle ayant vu le futur). Le `TimeSeriesSplit` est obligatoire.

## Statut

Accepted (2026-06-26). **Réplique** le patron de l'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)
(module pur + porte prédictif/descriptif) et de l'[ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)
(drift, bascule bloquante), appliqué à une **prévision de série temporelle**. **S'appuie sur**
l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) (contrat Parquet + manifest),
l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) (reproductibilité, graine figée),
l'[ADR 0072](/atlas/decisions/0072-property-based-testing-dataops-python/) (tests basés sur les
propriétés), l'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) (MLOps niveau 2) et
l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (`MLFLOW_TRACKING_URI` réinjecté au pod
de run). **Étend** l'[ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/) : `mediawatch` passe de la
description à la **prévision**, et reçoit sa première instrumentation MLOps. Nouvelles dépendances
`dataops/mediawatch-dagster` (scikit-learn, Evidently, mlflow-skinny), aux **mêmes versions** que
`citation`.

## Conséquences

**Bénéfices.** `mediawatch` devient **prospectif** (prévoir, pas seulement décrire). L'instrumentation
MLOps devient **homogène** entre les deux pipelines DataOps. Le modèle scale en **O(1) modèle**. En
gagnant un modèle — donc un **signal de dérive** —, `mediawatch` devient éligible au **CT autonome**
([ADR 0079](/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/)), jusqu'ici impossible
faute de mesure de dérive.

**Prix à payer.** Trois dépendances de plus dans `dataops/mediawatch-dagster` (image ~+50–80 Mo, aligné
sur `citation`). Un modèle de plus à surveiller. En **banc** (échantillon de jours borné), l'historique
est souvent trop court pour un pouvoir prédictif honnête → **repli descriptif fréquent** — ce qui est le
comportement **correct** (la porte ne sur-vend pas).

**Garde-fous.** **Anti-fuite temporelle** obligatoire (lags strictement passés, `TimeSeriesSplit`, jamais
KFold) — éprouvée par des tests de propriété. **Porte de décision** explicite (repli descriptif si le
modèle ne bat pas la baseline). **Drift bloquant** sur la seule bascule `predictive → descriptive`.
**Jamais de prévision négative**. **Déterminisme** (graine figée). **MLflow best-effort** (no-op sans
serveur, hermétique en test). **Neutralité** : expériences MLflow et identifiants nommés `mediawatch_*`,
jamais une marque ([ADR 0022](/atlas/decisions/0022-naming-convention/)).
