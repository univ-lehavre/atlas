---
title: Plan — Code-location « scholar-network » (profils de chercheurs d'un réseau)
---

> **Date du plan : 2026-07-13.** Socle décisionnel : [ADR 0103](/atlas/decisions/0103-code-location-profils-chercheurs-reseau/) (cette code-location, algo 2 passes + cache), [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (autonomie des code-locations Python), [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)/[ADR 0022](/atlas/decisions/0022-naming-convention/) (neutralité de domaine), [ADR 0057](/atlas/decisions/) (déterminisme), [ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/) (transport `persistence.mode` par env, Voie A), [ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md) (le curseur), [ADR cluster 0111](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0111-atlas-instancie-application-argocd.md) (atlas instancie l'Application).
>
> **Ce document est un PLAN, pas une implémentation.** L'ADR 0103 tranche la conception ; ce plan la **découpe** en 5 lots, suivis dans une **issue unique** (#632) et livrés par des PR séparées (une par lot). Chaque lot liste ses fichiers, ses invariants et ses critères « done ». `citation` reste **inchangé** ; tout code réutilisé est **copié** (ADR 0055), jamais importé.

## 1. Contexte et thèse

Cartographier l'**alliance EUNICoast comme un réseau de chercheurs** : identifier ses chercheurs (par l'affiliation), élargir à toute leur production récente (par le co-autorat), profiler chacun par un embedding sémantique. C'est un produit **distinct** de l'uplift FWCI de `citation` (ADR 0067), avec un **algorithme de sélection en deux passes** que la logique mono-passe de `citation` ne porte pas. D'où une **code-location autonome**, `scholar-network-dagster` (nom neutre, ADR 0022 — EUNICoast en description).

Deux idées structurent le pipeline (ADR 0103) :

- **Deux passes sur un brut pré-filtré.** Le brut pré-filtré (`≥2016 ∧ type=article`, projeté) est le **prédicat commun** des deux passes. Passe 1 → table des chercheurs (affiliés EUNICoast) ; passe 2 → tous les articles ≥2016 de ces chercheurs (semi-jointure). Recompute **intégral mensuel**, **sans watermark** (l'ensemble des chercheurs n'est pas monotone dans le temps → l'incrémental serait faux).
- **`persistence.mode` = un cache du brut pré-filtré.** `full` le garde entre runs, `bounded` le temps du run, `ephemeral` jamais. Purement une optimisation d'egress : la correction ne dépend jamais du mode.

## 2. Architecture cible

```
OpenAlex (externe, jamais persisté)
  → [brut pré-filtré : ≥2016 ∧ article, projeté]        ← cache full/bounded/ephemeral
      → passe 1 : filtre ROR EUNICoast → table chercheurs (author_id)
      → passe 2 : semi-join chercheurs → périmètre works final (tous articles ≥2016)
          → embedding par article (topics+keywords, MiniLM 384)
              → profil chercheur = mean(articles) + L2 → pgvector
```

Assets Dagster : `prefiltered_raw` (brut pré-filtré + cache), `researchers` (passe 1), `scholar_works` (passe 2), `scholar_profiles` (embedding + pgvector). Un `ingestion_job` les enchaîne dans un même run (mêmes ressources/spilling DuckDB, patron `citation`).

## 3. Réutilisation (par COPIE — ADR 0055)

| Copié de `citation`                                                | Vers                                      | Adapté                                         |
| ------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------------- |
| `_filter_sql` / `_dedup_sql` / `plan_batches` (batch_eunicoast.py) | `assets/prefilter.py`, `assets/passes.py` | + critère `type='article'` ; semi-join passe 2 |
| `embedding.py` (work_to_text, Embedder, aggregate_author)          | `embedding.py`                            | tel quel (parité stricte)                      |
| `lakehouse.py`, `resources.py`, `lineage.py`                       | idem                                      | endpoints/bucket de la nouvelle instance       |
| `index_load` (charge pgvector)                                     | `assets/index_load.py`                    | schéma profils chercheurs                      |
| gabarit `deploy/` (kustomize base+overlays, validate.sh)           | `deploy/`                                 | noms `scholar-network`                         |

Un test anti-drift garde `_EUNICOAST_ROR` aligné sur le seed dbt (comme `citation`).

## 4. Phasage — 5 lots (issue unique #632), une PR par lot

### Lot 1 — Squelette de code-location

**But.** Une code-location **chargeable** et **inerte** : structure conforme, aucun asset métier encore.

**Fichiers.** `dataops/scholar-network-dagster/` : `pyproject.toml`, `package.json` (`@univ-lehavre/atlas-scholar-network-dagster`, scripts lint/test/manifests — gabarit `citation`), `.python-version`, `README.md`, `code-location.manifest.yaml`, `src/scholar_network_dagster/{__init__,definitions,resources,lakehouse,lineage}.py`, `src/…/assets/__init__.py`, `tests/{__init__,conftest,test_definitions}.py`, `deploy/{base,overlays/prod}/…` (kustomize + `validate.sh`). Ajout à `pnpm-workspace.yaml` (liste explicite des `*-dagster`). Recensement au contrat [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (nouveau point de contact) **dans la même PR**.

**Invariants.** `pnpm audit:structure` vert (catégorie dataops, naming `@univ-lehavre/atlas-*`). `definitions.py` charge sans asset métier. Le scope commitlint `scholar-network-dagster` devient valide **par** l'ajout du `package.json` dans le même commit.

**Done.** `uv run pytest` (au moins le test de chargement de `definitions`), `ruff check/format`, `deploy/validate.sh` (manifestes prod rendus, kubeconform), `pnpm audit:structure`, `pnpm audit:docs` verts.

### Lot 2 — Brut pré-filtré + gradient de cache

**But.** L'asset `prefiltered_raw` : produire le brut pré-filtré (`≥2016 ∧ type=article`, projeté) et implémenter le gradient de cache `full`/`bounded`/`ephemeral`.

**Fichiers.** `src/…/assets/prefilter.py` (filtre DuckDB projeté), `src/…/cache.py` (lecture du curseur `SCHOLAR_NETWORK_PERSISTENCE_MODE` — Voie A env, patron ADR 0102 ; résolution `full`/`bounded`/`ephemeral` → stratégie de matérialisation), `tests/test_prefilter.py`, `tests/test_cache.py`.

**Invariants.** Le mode se lit d'une **seule** variable d'env, défaut `full`, défensif (mode inconnu/vide → `full` fail-safe). `full` = brut pré-filtré écrit sur S3 (Parquet projeté) et relu tel quel au run suivant ; `bounded` = écrit dans un stockage éphémère (temp_directory/emptyDir ou préfixe S3 purgé en fin de run) ; `ephemeral` = non matérialisé (relecture à la volée). La **projection stricte** (colonnes utiles seulement) est vérifiée par test. Résultat du filtre **identique** quel que soit le mode (byte/ensembliste).

**Done.** Tests des trois modes (matérialisation attendue par mode, filtre identique), lint/format, audits verts.

### Lot 3 — Passe 1 : table des chercheurs

**But.** L'asset `researchers` : sur le brut pré-filtré, filtre ROR EUNICoast → table des `author_id` affiliés.

**Fichiers.** `src/…/assets/passes.py` (`researchers`), `src/…/ref_eunicoast.py` (les 14 ROR, copie + test anti-drift), `tests/test_researchers.py`.

**Invariants.** Extraction de `authorships[].author.id` restreinte aux works à ≥1 ROR EUNICoast (`list_has_any`, patron `citation`). Table **distincte** (un author_id une fois). Déterminisme (ordre stable, ADR 0057). Anti-drift ROR ↔ seed dbt.

**Done.** Test : jeu de works synthétique → ensemble d'author_id attendu ; anti-drift ROR ; lint/audits.

### Lot 4 — Passe 2 : périmètre works final

**But.** L'asset `scholar_works` : sur le brut pré-filtré, semi-jointure contre la table des chercheurs → tous les articles ≥2016 de ces chercheurs.

**Fichiers.** `src/…/assets/passes.py` (`scholar_works`), `tests/test_scholar_works.py`.

**Invariants.** Semi-jointure **par hachage** (UNNEST `authorships` → `author.id`, join sur la table chercheurs matérialisée ; table ~10⁴–10⁵ ids en RAM), **par lots** (patron `_WORKS_PER_BATCH`, spill DuckDB) — jamais tout le brut en mémoire. Un work est retenu **ssi** ≥1 co-auteur ∈ table chercheurs, **indépendamment** de son affiliation (works hors EUNICoast inclus). Dédup par récence (patron `_dedup_sql`). Déterminisme.

**Done.** Test : work co-écrit par un chercheur **sans** affiliation EUNICoast → **retenu** (cœur de la passe 2) ; work sans aucun chercheur → exclu ; lint/audits.

### Lot 5 — Profils chercheurs → pgvector

**But.** L'asset `scholar_profiles` : embedding par article, moyenne + L2 par chercheur, chargement pgvector.

**Fichiers.** `embedding.py` (copie), `src/…/assets/profiles.py` (agrégation par author_id), `src/…/assets/index_load.py` (copie adaptée, écrit pgvector), migration `deploy/base/migrations/0001_scholar_profiles_index.sql`, `tests/test_profiles.py`, `tests/test_index_load.py`.

**Invariants.** Embedding = texte thématique (topics score ≥ 0,3 + keywords), MiniLM 384, parité stricte `citation`. Profil = **moyenne non pondérée** des articles du **périmètre final** (post-passe-2) **puis L2**. Chargement pgvector idempotent (patron `index_load`). Déterminisme (onnxruntime 1 thread).

**Done.** Test : chercheur à 2 articles → vecteur = L2(mean) attendu ; parité embedding avec `citation` sur un texte fixe ; chargement pgvector (fixture) ; lint/audits.

## 5. Validation — deux étages (banc logique + intégration réelle)

Deux niveaux de preuve, complémentaires (doctrine « preuve deux étages », ADR cluster 0104) :

- **Banc logique — hermétique, à chaque lot (fait).** Tests unitaires (SQL pur, agrégation) +
  tests d'**intégration conteneurisés** : DuckDB↔**MinIO** (brut pré-filtré, passes 1/2) et
  **Postgres/pgvector** (chargement de l'index), images épinglées par digest, self-skip sans
  Docker (ADR 0057). Ils prouvent la **correction** sur données synthétiques (grain auteur,
  élargissement, unicité des work_id, dédup déterministe, parité embedding, idempotence) —
  déterministes, sans réseau, dans la CI.
- **Intégration réelle — jalon manuel, sur données OpenAlex réelles.** Une fois la
  code-location déployée (node1 k8s monté par nestor, toutes couches), un run de
  l'`ingestion_job` sur un **échantillon réel** puis à l'échelle valide ce que le banc logique
  ne peut pas : le **dimensionnement** (taille du brut pré-filtré, de la table chercheurs, du
  périmètre final ; coût/perf du semi-join passe 2 à l'échelle), la **résolution DNS réelle**
  (RGW Ceph, CNPG — piège FQDN prod, cf. `_short_incluster_host`), et l'accès **source
  OpenAlex** (secret DuckDB sur le bucket public). **Geste HUMAIN** (aucun agent ne déclenche
  un run/déploiement réel, ADR 0033) ; les ressources du `code-location.manifest.yaml` sont
  ajustées d'après les volumes mesurés à ce jalon, pas figées d'avance.

## 6. Critères de fin de plan

Le pipeline est **complet** quand les 5 lots sont mergés : la code-location charge, produit le brut pré-filtré caché selon le mode, identifie les chercheurs (passe 1), élargit à leur production (passe 2), et sert leurs profils en pgvector — recompute intégral mensuel, déterministe, `citation` inchangé. Le banc logique conteneurisé prouve la correction ; le **jalon d'intégration réelle** (§5, sur node1) prouve le dimensionnement et clôt le plan.
