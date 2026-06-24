---
title: Plan — Modèle d'uplift FWCI sur EUNICoast (pipeline citation)
---

> Date du plan : 2026-06-24. Socle décisionnel :
> [ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) (réoriente la finalité
> de `citation` : prédire l'uplift de FWCI d'une paire d'auteurs depuis leurs
> thématiques, périmètre EUNICoast), qui amende
> [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) et s'appuie sur
> [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) (brut S3),
> [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (DataOps Python),
> [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) (reproductibilité),
> [ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/) (grain author_id,
> embedding), [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) (MLOps).
> Reconnaissance préalable :
> [audit 2026-06-24](/atlas/audit/2026-06-24-uplift-fwci-eunicoast/) (verdict GO).
> Ce plan développe le **quoi/comment** ; l'ADR 0067 porte le **pourquoi**.

## Objectif

Produire, pour un auteur, des **recommandations d'auteurs ou de thématiques à fort
potentiel de FWCI**, via un modèle **prédictif d'uplift** (FWCI collab − solo) entraîné
sur les **profils thématiques** des auteurs (jamais leur identité), sur le périmètre
**EUNICoast** (≥ 1 auteur affilié, < 10 ans).

## Ce que ce plan n'est pas

- **La désambiguïsation `author_id → personne`** : hors périmètre (le profil s'ancre sur
  l'`author_id` imparfait, [ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)).
- **L'interface de recommandation** (PWA) : ce plan livre le **mart servi** ; la
  consommation côté application est un autre chantier.
- **Le branchement RGPD** (registre d'opposition) : décision du déployeur
  ([ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)) ; le mécanisme de
  purge au grain `(author_id, work_id)` existe déjà et est réutilisé.

## Modèle de données

```
raw/works.authorships[].institutions[]     (brut, déjà ingéré ; institutions PAS projetées)
seeds/ref_eunicoast.csv                     (13 ROR + alias legacy — NOUVEAU seed)
        │  staging : UNNEST institutions + jointure seed
        ▼
stg_citation_author_institutions            (grain (work_id, author_id, ror) — NOUVEAU)
curated_eunicoast_works                      (works avec ≥1 auteur EUNICoast ∩ <10 ans — NOUVEAU)
        │  profils : réutilise topics + embedding existants, restreints au périmètre
        ▼
marts_author_profiles                        (grain author_id : vecteur subfields + emb 384 — NOUVEAU)
curated_pair_uplift_labels                   (grain (author_a, author_b) : uplift observé — NOUVEAU)
        │  modèle : asset Python (gradient boosting + MLflow)
        ▼
marts_pair_uplift_predictions                (grain (author_a, author_b) : uplift prédit — SERVI)
marts_author_recommendations                 (grain author_id : top auteurs/thématiques — SERVI)
        + manifest.json (contrat Parquet, ADR 0029)
```

Invariant transverse ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)) :
**aucune feature du modèle ne porte l'identité d'un auteur** — uniquement des vecteurs
thématiques (subfields + embedding 384) et leurs combinaisons symétriques.

## Lots

Chaque lot = une PR, scope `dataops`. Validation par lot : `pnpm dataops:check` vert +
test hermétique sur fixtures ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).

### Lot 1 — Affiliations + filtre EUNICoast (fondation)

**Quoi** : projeter les affiliations institutionnelles (aujourd'hui exclues) et
restreindre le périmètre.

- **Seed** `dataops/citation-dbt/seeds/ref_eunicoast.csv` : `ror,name,country` — les 13
  membres + alias legacy Antilles (`017nssj40`). Identifiants ROR figés.
- **Staging** `stg_citation_author_institutions.sql` : `UNNEST(authorships)` puis
  `UNNEST(ash.institutions)` → grain `(work_id, author_id, ror)`. Le brut porte
  `authorships[].institutions[].ror` (confirmé au spike).
- **Curated** `curated_eunicoast_works.sql` : works ayant **≥ 1 auteur affilié EUNICoast**
  (jointure au seed sur `ror`) **ET** `publication_year ≥ extract(year from now()) − 10`.
  Materialisé external (Parquet immuable).
- **Tests** : test dbt (le périmètre n'est pas vide ; tout work retenu a ≥1 ROR
  EUNICoast). Fixture étendue avec quelques works portant des affiliations contrôlées.

**Done** : `curated_eunicoast_works` produit le bon périmètre sur fixture ; `dataops:check`
vert. **Issue dédiée** (extraction affiliations).

### Lot 2 — Profils thématiques par auteur (double représentation)

**Quoi** : pour chaque auteur du périmètre, ses deux représentations thématiques.

- **Mart** `marts_author_profiles` :
  - **vecteur de subfields** (dbt) : distribution pondérée par auteur sur les subfields
    de ses works EUNICoast (réutilise `stg_citation_topics`, restreint au périmètre).
    Grain `(author_id, subfield_id, weight)` ou vecteur sérialisé — à trancher à
    l'implémentation selon le consommateur du modèle.
  - **embedding 384** : réutilise l'asset `researcher_embeddings` existant, restreint au
    périmètre EUNICoast (pas de recalcul du modèle ONNX).
- **GE bloquant** : profils non vides, vecteurs de dimension attendue.

**Done** : un auteur ⇒ un vecteur subfields + un embedding 384, sur fixture.

### Lot 3 — Labels d'uplift observé (cible d'entraînement)

**Quoi** : pour chaque paire ayant co-publié, l'uplift réel (cible du modèle).

- **Curated** `curated_pair_uplift_labels` :
  - paires `(author_a < author_b)` co-auteurs d'un même work EUNICoast, **≥ 2
    co-publications avec FWCI** ;
  - `copub_fwci` = moyenne du FWCI de leurs co-publications ;
  - `solo_fwci_a` / `solo_fwci_b` = FWCI de référence solo de chaque auteur
    (**fenêtre temporelle cohérente** — voir garde-fou) ;
  - `uplift = copub_fwci − avg(solo_fwci_a, solo_fwci_b)`.
- **Anti-fuite temporelle** ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/),
  garde-fou) : la baseline solo se calcule sur les publications **antérieures** aux
  co-publications de la paire ; ne jamais utiliser le futur. À cadrer précisément ici
  (c'est le point méthodologique le plus délicat du chantier).

**Done** : labels d'uplift produits, sans fuite temporelle, validés sur fixture.

### Lot 4 — Modèle ML d'uplift (asset Python + validation honnête)

**Quoi** : entraîner et valider le modèle ; **porte de décision** du chantier.

- **Asset Python** `pair_uplift_model` (sur le modèle de `researcher_embeddings`) :
  - features de paire = combinaisons **symétriques** des deux représentations
    thématiques (cosinus, |diff|, produit) — **jamais l'`author_id`** ;
  - modèle : gradient boosting (le R² = 0,50 du spike vient de la non-linéarité) ;
  - **validation GROUPÉE par auteur** (un auteur jamais à la fois en train et test) +
    anti-fuite temporelle (lot 3) → le R² honnête, attendu < 0,50 ;
  - provenance + métriques (R², MAE, vs baseline) loggées **MLflow**
    ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)).
- **Porte de décision** : si le R² honnête s'effondre vers 0, **rabattre** sur une
  sortie descriptive (lot 5 sert alors l'uplift observé, pas prédit) et le consigner.
  Sinon, on sert les prédictions.

**Done** : R² honnête mesuré et loggé ; décision servir-prédictif / rabattre-descriptif
tranchée et tracée.

### Lot 5 — Prédictions + recommandations servies (mart + manifest)

**Quoi** : produire la sortie consommable.

- **Mart** `marts_pair_uplift_predictions` : pour les paires candidates (y compris
  **inédites** — c'est l'intérêt du prédictif), l'uplift prédit.
- **Mart** `marts_author_recommendations` : par `author_id`, le top-N auteurs **et** le
  top-N thématiques (subfields) à fort uplift prédit.
- **Manifest** : `timeline`-style atomique (réutilise `manifest.py`,
  [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) — sha256,
  row_count, sentinelle.
- **GE bloquant** sur les marts servis.

**Done** : marts servis + manifest validés ; E2E hermétique vert (fixture → recommandations).

## Validation E2E (preuve par exécution, [ADR 0057])

`dbt build` local sur fixtures étendues (works EUNICoast contrôlés avec FWCI + topics +
affiliations) → vérifier : périmètre correct, profils non vides, labels d'uplift
attendus, prédictions produites, recommandations cohérentes avec un GOLDEN. Modèle ML
testé sur petit échantillon déterministe (graine figée). `pnpm dataops:check` vert.

## Issues liées

Findings actionnables ouverts en issues (label `enhancement`) :

- extraction des affiliations ROR (lot 1) ;
- seed référentiel EUNICoast (lot 1) ;
- **validation anti-fuite du pouvoir prédictif** (lot 4) — la plus à risque, à traiter
  tôt ;
- modèle ML + MLflow (lot 4) ;
- marts servis + recommandations (lot 5).

## Garde-fous

- **Jamais l'identité** comme feature (invariant ADR 0067) — vérifiable par revue des
  features.
- **Anti-fuite** (par auteur + temporelle) **avant** de servir le modèle ; repli
  descriptif documenté.
- Périmètre **borné** (EUNICoast, < 10 ans) — jamais un calcul sur toute la base.
- Contrat **Parquet + manifest** inchangé ; immutabilité `dt=…/run=…`.
- Reproductibilité : graine ML figée, tests hermétiques sur fixtures.
