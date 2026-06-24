---
title: "0067 — Modèle prédictif d'uplift FWCI sur EUNICoast (réorientation du pipeline citation)"
---

## Contexte

L'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) a posé le
pipeline `citation` : ingérer OpenAlex et dériver un **signal de collaboration** par
**citations croisées** entre chercheurs (« qui cite qui » — mart
`marts_collab_pairs`). Une **nouvelle finalité métier** est demandée, distincte :
**pour un auteur donné, recommander des thématiques ou des auteurs à fort potentiel de
FWCI** — c'est-à-dire prédire la **valeur ajoutée** d'une collaboration, y compris
**entre auteurs qui n'ont jamais collaboré**.

Le **FWCI** (_Field-Weighted Citation Impact_) est l'indice d'impact d'une publication,
normalisé par domaine et année (1,0 = impact moyen du champ). L'objectif n'est pas
l'impact absolu mais l'**uplift** : le FWCI obtenu **ensemble** moins le FWCI **solo**
habituel des deux auteurs (« 1 + 1 > 2 »).

Cette réorientation a été **dé-risquée par une reconnaissance** (spike jetable sur
données OpenAlex réelles), consignée sous
[`docs/audit/2026-06-24-uplift-fwci-eunicoast`](/atlas/audit/2026-06-24-uplift-fwci-eunicoast/)
([ADR 0060](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/)). Faits
établis, verdict **GO** :

- le **FWCI**, les **thématiques** hiérarchisées (domain→field→subfield→topic), les
  **co-auteurs** et un **embedding** d'auteur (vecteur 384) sont **déjà** dans le
  pipeline `citation` ;
- **seul manque** : les **affiliations institutionnelles** (`authorships[].institutions[].ror`),
  aujourd'hui exclues du staging, nécessaires au filtre **EUNICoast** ;
- sur un **seul** établissement (Le Havre, 3 104 articles), **7 393 paires
  entraînables** et un uplift **apprenable** depuis les seules thématiques (R² = 0,50
  en validation croisée, gradient boosting, **sans jamais utiliser l'identité** des
  auteurs).

**EUNICoast** est une alliance de 13 universités côtières/insulaires (dont Le Havre),
identifiables par leur **ROR** (_Research Organization Registry_).

## Décision

> **Le pipeline `citation` gagne une seconde finalité : un modèle PRÉDICTIF d'uplift de
> FWCI sur le périmètre EUNICoast. On réutilise l'ingestion et les couches
> staging/curated existantes, on AJOUTE des modèles dbt et des assets Python dédiés (à
> côté de `marts_collab_pairs`, qui demeure). Un auteur est représenté UNIQUEMENT par
> ses thématiques (jamais son identité) ; le modèle estime l'uplift d'une paire, et la
> sortie sert des recommandations d'auteurs ou de thématiques.**

### Réutilisation, pas duplication

Les nouveaux livrables s'inscrivent **dans le code-location `citation` existant** et
réutilisent le brut OpenAlex, les modèles staging et la couche curated (FWCI, topics,
authorships). On n'ouvre **pas** un code-location séparé : la source et l'essentiel des
transformations sont identiques ; un pipeline distinct dupliquerait l'ingestion. L'[ADR
0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) est **amendé** : le
pipeline a désormais **deux finalités** (citations croisées ET uplift prédictif), pas
une.

### Périmètre EUNICoast + récence

Les publications retenues sont celles ayant **au moins un auteur affilié à un
établissement EUNICoast** (filtre sur une **liste de ROR** figée en seed, 13 membres +
un alias _legacy_ pour les Antilles) **ET** datant de **moins de 10 ans**
(`publication_year ≥ année courante − 10`). **Tous** les auteurs des publications
retenues sont profilés (pas seulement les EUNICoast) : un co-auteur externe est une
cible de recommandation légitime.

Le filtre par **ROR** (pas par nom) est retenu : précis, stable, neutre. Cela exige de
**projeter les affiliations** des authorships, exclues aujourd'hui du staging — seul
ajout d'ingestion du chantier.

### Représentation d'un auteur : thématiques, jamais l'identité

Un auteur est représenté par des vecteurs **thématiques**, **jamais** par son
`author_id` :

1. un **vecteur de subfields** (distribution pondérée sur les ~250 sous-domaines
   OpenAlex, interprétable — permet de recommander des **thématiques** explicites) :
   c'est la représentation **implémentée et testée** du modèle ;
2. l'**embedding 384** existant (`researcher_embeddings`, similarité sémantique fine) :
   seconde famille de features **prospective** — actée en intention, **pas encore
   branchée** au modèle (à ne pas présenter comme un appui existant).

Ce choix est **load-bearing** : raisonner sur des thématiques (et non des personnes)
est ce qui rend la prédiction **généralisable aux paires inédites** (une paire qui n'a
jamais collaboré a quand même deux profils thématiques) et **limite l'exposition
RGPD** (le modèle ne mémorise pas les individus). Alternative écartée : encoder
l'identité des auteurs comme feature — rejetée (pas de généralisation aux paires
nouvelles, _cold start_ total ; mémorisation d'individus).

### Cible : uplift (collab − solo), modèle prédictif

La cible est l'**uplift** : pour une paire ayant co-publié, FWCI moyen de leurs
co-publications moins la moyenne de leurs FWCI solo de référence. Le modèle apprend
`f(profil_thématique_A, profil_thématique_B) → uplift` sur les paires observées, puis
**extrapole** aux paires inédites. Alternative écartée : un modèle **descriptif** (FWCI
observé des seules collaborations passées) — rejeté car il ne recommande que des
collaborations **existantes**, alors que l'objectif est de proposer de **nouveaux**
partenaires.

### Le modèle vit dans un asset Python (socle MLOps existant)

L'entraînement (régression non linéaire — _gradient boosting_, le R² = 0,50 du spike
vient de la non-linéarité, vs 0,12 en linéaire) et la prédiction sont un **asset Python
Dagster**, sur le modèle de `researcher_embeddings` : provenance et métriques loggées
dans **MLflow**, drift suivi, sortie en **Parquet servi** sous contrat manifest. Cela
s'inscrit dans le socle MLOps acté ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)).
Une approximation purement SQL (dbt) est écartée : elle abandonnerait le pouvoir
prédictif non linéaire, cœur de la décision.

### Garde-fou de validation AVANT d'investir

Le R² de 0,50 du spike est **optimiste** : split aléatoire **par paire** et **sans**
fenêtre temporelle. Le premier lot d'implémentation **doit** mesurer le pouvoir
prédictif en **conditions honnêtes** — validation **groupée par auteur** (un auteur
jamais à la fois en entraînement et en test) et **anti-fuite temporelle** (baseline
solo et uplift sur des fenêtres cohérentes, ne pas prédire le passé avec le futur).
Si, en conditions honnêtes, le R² s'effondre vers 0, on **rabat** sur une sortie
descriptive plutôt que de servir un modèle sans pouvoir réel. C'est une **porte de
sortie explicite**, pas un doute sur le GO.

Le seuil opérationnel de la porte est **R² > 0,05 _et_ MAE meilleure que la baseline**
(prédire la moyenne). _Pourquoi 0,05 ?_ Un R² ≤ 0 ne fait pas mieux que la moyenne ; on
exige donc une marge **strictement positive et non triviale**. 0,05 est un plancher
**bas et prudent** : on ne réclame pas une forte corrélation pour servir du prédictif,
mais on **refuse le bruit** — le contrôle anti-sur-apprentissage (uplift = bruit pur)
tombe sous ce seuil, ce qui valide le choix. _Contre quelles alternatives ?_ Un seuil
plus haut (0,10) rejetterait des modèles faibles mais réels (plus de repli descriptif) ;
un seuil nul accepterait un modèle sans valeur. La condition jointe sur la MAE empêche un
R² légèrement positif mais inutile de passer la porte. Seuil **révisable** à la lumière
des mesures de production. La page de surface
[« Modèle d'uplift de FWCI »](/atlas/architecture/modele-uplift-fwci/) détaille ces
garde-fous et leurs tests (dont le contrôle sur bruit pur) pour un lecteur non développeur.

## Statut

Accepted (2026-06-24). **Amende** l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
sur la **finalité** : le pipeline `citation` produit désormais, en plus des citations
croisées, un modèle prédictif d'uplift de FWCI sur EUNICoast. Le reste de 0029 (contrat
Parquet + manifest, dbt, Dagster, lineage, déterminisme) demeure. S'appuie sur l'[ADR
0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) (snapshot S3 ; l'API REST
sert au tirage ciblé EUNICoast sous le plafond 10 000), l'[ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)
(grain `author_id` imparfait, profils thématiques) et l'[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)
(MLOps). Mise en œuvre détaillée dans un plan (`docs/plans/`).

## Conséquences

**Bénéfices.** Réutilisation maximale : l'ingestion, le FWCI, les topics et l'embedding
sont déjà là — le chantier ajoute surtout de la transformation et un modèle.
Recommandation **prospective** (de nouveaux partenaires/thématiques), pas seulement
rétrospective. Représentation par thématiques : généralisable et sobre en données
personnelles.

**Prix à payer.** Un **ajout d'ingestion** (projeter `authorships[].institutions[].ror`)
et un **seed** à maintenir (les 13 ROR EUNICoast évoluent si l'alliance change). Un
**modèle ML** à entraîner, valider et surveiller (drift), avec le risque que le pouvoir
prédictif baisse en conditions honnêtes (garde-fou ci-dessus). L'`author_id` reste
**imparfait** ([ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)) : un
auteur mal désambiguïsé brouille son profil — non résolu ici.

**Garde-fous.** Le modèle **n'utilise jamais l'identité** d'un auteur comme feature
(thématiques seules) — invariant de conception, vérifiable. Validation **anti-fuite**
(par auteur + temporelle) **obligatoire** avant de servir le modèle, avec repli
descriptif documenté. Sortie servie sous le **contrat Parquet + manifest** inchangé
([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)). Périmètre
**borné** (EUNICoast, < 10 ans) — pas un calcul sur toute la base. RGPD : la cible et
les features portent sur des **profils thématiques** et un **indicateur public**
(FWCI), pas sur des données personnelles ; le droit d'opposition existant
([ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)) s'applique au grain
`(author_id, work_id)`.
