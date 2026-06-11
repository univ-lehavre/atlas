---
title: Plan — Producteur de données par chercheur (mart `researchers`)
---

> Date du plan : 2026-06-11. Socle décisionnel : [ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)
> (ancrage `author_id`, purge au grain `(author_id, work_id)`), qui précise
> [ADR 0058](/atlas/decisions/0058-report-index-load/) (report de `index_load` faute de ce
> producteur) et s'appuie sur [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
> (plateforme DataOps, contrat Parquet), [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)
> (brut S3), [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (DataOps en Python),
> [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) (reproductibilité) et
> [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) (RGPD, opposition).
> Ce plan développe le **quoi/comment** ; l'ADR 0059 porte le **pourquoi**.

## Objectif

Livrer le **producteur de données par chercheur** que l'[ADR 0058](/atlas/decisions/0058-report-index-load/)
a désigné comme chemin critique : un **mart `researchers` servi**, contractualisé par un
`manifest.json`, dérivé du **seul brut S3** (reproductible), portant **par `author_id`** un
**vecteur(384)** sémantique et un **sac de labels** topics/mots-clés pondérés. Ce mart est
l'**entrée** qui réactive `index_load` (recherche FTS lexicale + kNN sémantique sur les
chercheurs, Phase 4).

Le mart vit au grain `author_id` mais **repose sur** une provenance au grain
`(author_id, work_id)` qui rend la **purge d'opposition chirurgicale** : une opposition ne
retire que le périmètre qu'une personne a revendiqué, jamais une publication d'autrui.

## Ce que ce plan n'est pas

- **La désambiguïsation** `author_id → personne` (plusieurs `author_id` par chercheur) —
  hors périmètre ; le mart s'ancre sur l'identifiant imparfait que le brut produit.
- **La validation par le chercheur** (qui produit l'identité `researcherId` et l'ensemble
  `(author_id, work_id)` reconnu comme sien) — relève du **déployeur** ; ce plan fournit la
  **mécanique** de purge, pas la liste d'opposition ni l'interface de validation.
- **Le branchement RGPD** (registre d'opposition, `exclusion_set`, SLA) — décision du
  responsable de traitement (déployeur), cf. [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).

## Modèle de données

Le brut `raw/works` (copié verbatim du snapshot S3, [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/))
**porte déjà** les `topics[]` et `keywords[]` par publication — non projetés aujourd'hui.
Le pipeline se construit donc en trois grains, du fin au servi :

```
raw/works.topics[] / keywords[]            (brut, déjà ingéré)
        │  staging : UNNEST
        ▼
stg_citation_topics / stg_citation_keywords            (grain publication, vue)
        │  curated : distinct + provenance
        ▼
curated_work_topics / curated_work_keywords            (grain (work_id, label) — PROVENANCE)
curated_work_vectors  (= asset Python : vecteur(384) PAR publication)   (grain (work_id) — PROVENANCE)
        │  marts : agrégation par author_id (via curated_authorships)
        ▼
marts_researchers      (grain author_id : labels pondérés + vecteur(384) agrégé — SERVI)
        + manifest.json (schema_version, row_count, sha256 des parts)
```

- **Provenance grain-publication** (`curated_work_*`) : c'est la couche qui rend la purge
  chirurgicale possible. Le vecteur agrégé par `author_id` (`l2Normalize(meanPool(vecteurs
des publications))`) **n'est pas dé-poolable** publication par publication ; on le
  **re-dérive** depuis la provenance en excluant les couples opposés.
- **Agrégat lexical** : chaque `(author_id, label)` porte un **poids** = fonction de la
  fréquence d'apparition du label à travers les publications du chercheur-cluster et des
  scores du référentiel (seuil score ≥ 0,3, fidèle à l'extraction de référence). Aide le
  ranking FTS.
- **Embedding** : calculé en **Python** (`onnxruntime` MIT + `tokenizers` Apache-2.0) sur le
  **même** `model_quantized.onnx` (`all-MiniLM-L6-v2`) que le code TS — pas de Node, pas de
  `torch`, modèle cuit hors-ligne, déterministe **par architecture** ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/),
  [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
- **Clé / partition** : `author_id` ; coordonnées `(dt, run)` alignées sur le mart `pairs`
  (même run dbt/Dagster) pour que `index_load` et le masquage `atlas-api` partagent la
  sélection de partition courante.

## Découpage — un lot = une PR = une issue

Chaque lot est livrable et testable seul ; le point dur (vecteur Python) est isolé du
lexical (pur SQL). L'ordre est strict (chaque lot dépend du précédent), sauf le lexical
(lots 2-3) et le vecteur (lot 4) qui se rejoignent au lot 5.

| Lot   | Issue        | Nature             | Livrable                                                                                                                                                                                                                                                                          | Dépend de |
| ----- | ------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **0** | — (cette PR) | ADR + plan         | [ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/) + ce plan                                                                                                                                                                                                     | —         |
| **1** | _à créer_    | dbt (SQL)          | `stg_citation_topics`/`keywords` (UNNEST) + `curated_work_topics`/`keywords` (provenance grain publication) + tests dbt                                                                                                                                                           | Lot 0     |
| **2** | _à créer_    | dbt (SQL)          | `marts_researchers` (labels) : agrégat par `author_id`, union **pondérée** (fréquence × score) ; tests unicité + **invariant de provenance**                                                                                                                                      | Lot 1     |
| **3** | _à créer_    | Python/Dagster     | asset `researcher_embeddings` : embedding **par publication** (`onnxruntime`+`tokenizers`) → `curated_work_vectors` (provenance) → agrégat `author_id` (mean-pool + L2). Goldens déterministes                                                                                    | Lot 1     |
| **4** | _à créer_    | Python/Dagster     | contrat + qualité + lineage du mart `researchers` : **paramétrer** `manifest.py`/`quality.py`/`lineage.py` par `mart_subdir` (le mart `pairs` reste vert) + asset check GE bloquant + câblage                                                                                     | Lots 2-3  |
| **5** | _à créer_    | Python (mécanique) | **capacité de purge chirurgicale** `(author_id, work_id)` : filtre entre `curated` et `marts`, re-dérive l'agrégat lexical **et** re-mean-pool/re-L2 le vecteur sur les couples non opposés. Test prouvant qu'une opposition ne retire **jamais** une publication non revendiquée | Lot 4     |

### Critères d'acceptation transverses

- **Reproductibilité** : aucun test ne dépend d'une source live ; fixtures synthétiques
  figées portant `topics[]`/`keywords[]` ; `sha256` du mart stable par archi.
- **Qualité** : `pnpm dataops:check` (ruff + pytest ≥ 90 %) vert ; `dbt build` + tests dbt
  verts sur fixtures ; asset check GE bloquant échoue si le contrat est violé.
- **Non-régression `pairs`** : le refactor de paramétrisation Dagster (lot 4) ne casse ni le
  manifest, ni les checks, ni le lineage du mart `collab`.
- **Invariant RGPD** : test du lot 5 — une opposition d'une personne (un sous-ensemble de
  couples `(author_id, work_id)`) laisse intactes les publications non revendiquées et les
  `author_id` à publications résiduelles.
- **Frontière capacité/décision** : le code n'implémente ni la validation chercheur, ni la
  liste d'opposition, ni le SLA ; il expose la provenance et la mécanique paramétrée.

## Points durs anticipés

- **Schéma `topics[]`/`keywords[]` du brut** : confirmer la forme exacte (struct array
  `{id, display_name, score}` + hiérarchie subfield/field/domain pour les topics) sur un
  échantillon réel, et enrichir les **fixtures** synthétiques en conséquence (elles ne les
  portent pas aujourd'hui).
- **Déterminisme de l'embedding** : threads `onnxruntime` à 1 + exécution séquentielle ;
  `sha256` stable **par archi** seulement (bit-exact cross-archi non garanti — tolérance si
  nécessaire).
- **Cohérence avec le vecteur TS** : charger le **même** `model_quantized.onnx`, `max_length`
  identique, mean-pool pondéré par l'`attention_mask` **puis** L2, dans cet ordre.
- **Refactor Dagster paramétré** : `manifest.py`/`quality.py`/`lineage.py` sont codés en dur
  sur `marts/collab` ; les rendre paramétrables par `mart_subdir` touche du code prouvé →
  garde-fou de non-régression `pairs`.

## Vérification

- **Par lot** : tests dbt (unicité, provenance), pytest (goldens embedding + purge),
  asset check GE bloquant, `pnpm dataops:check`.
- **Doc** : `pnpm docs:build` + `pnpm audit:docs` verts (ADR 0059 + ce plan).
- **Jalon banc** : harnais cluster `#29` (run réel SeaweedFS + lineage Marquez visible) au
  moment où le mart `researchers` est scellé (fin lot 4).
- **Commit/PR** : merge commit, hooks non bypassés, sujet minuscule, pas de `Co-Authored-By`,
  scope `dataops`/`docs`.
