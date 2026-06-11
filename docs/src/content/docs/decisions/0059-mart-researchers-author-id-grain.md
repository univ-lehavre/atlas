---
title: "0059 — Producteur de données par chercheur : ancrage author_id, purge d'opposition au grain (author_id, work_id)"
---

## Contexte

L'[ADR 0058](/atlas/decisions/0058-report-index-load/) a reporté l'asset `index_load`
faute d'un **producteur de données par chercheur servi** : la capacité (schéma de l'index,
chargeurs FTS/kNN) est livrée, mais la **source** — un jeu de données _par chercheur_,
servi et contractualisé — n'est produite nulle part. Ce producteur est désormais le
chemin critique. Sa conception a buté sur trois écarts qu'il faut trancher **avant** le
code, car ils déterminent la clé, la reproductibilité et la sémantique RGPD du mart.

### Trois écarts révélés à la conception

1. **Source.** Les embeddings et labels par chercheur sont aujourd'hui produits par
   `researcher-profiles` (TypeScript), qui tourne sur des sources **live** (un registre
   externe de chercheurs + l'API publique du référentiel bibliométrique). Un mart servi
   doit être **reproductible** ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) :
   même entrée → même sortie, jusqu'au `sha256` du contrat. Une source live est
   rédhibitoire. Or le **brut déjà ingéré** (`raw/works`, copié verbatim du snapshot S3,
   [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)) **porte déjà** les
   `topics[]` et `keywords[]` par publication — ils sont simplement non projetés par les
   modèles dbt actuels.

2. **Clé.** Le mart par chercheur doit être ancré sur une clé que le brut reproductible
   sait produire. La seule disponible est l'**identifiant d'auteur du référentiel
   bibliométrique** (ci-après `author_id`). Cet identifiant est **imparfait à deux
   niveaux** :
   - un même chercheur (personne réelle) peut avoir **plusieurs** `author_id` (clusters,
     sous-clusters, homonymes mal séparés) ;
   - un `author_id` agrège des publications qui ne sont **pas toutes** réellement de la
     personne (co-auteurs mal attribués, homonymes fusionnés dans le même cluster).

   La **désambiguïsation** `author_id → personne` n'existe nulle part dans le pipeline :
   `merged_ids` n'est pas appliqué et ne concerne que les publications, jamais les auteurs ;
   le seul rapprochement multi-`author_id` est un acte **manuel** hors lakehouse.

3. **RGPD — le grain de l'opposition.** La [spec de ré-dérivabilité](/atlas/architecture/re-derivabilite-mart-index/)
   décrit une purge en clé chercheur (`DELETE … WHERE researcher_id = ANY(exclusion_set)`),
   mais ne modélise ni `author_id` ni le grain publication. Compte tenu de l'imperfection
   ci-dessus, une purge « en bloc par `author_id` » **sur-effacerait** (elle ôterait les
   publications d'un vrai co-auteur ou d'un homonyme qui ne s'est pas opposé), et une purge
   « par personne » présuppose une identité de personne qu'on **n'a pas**. L'identité de
   personne (`researcherId`) ne peut naître que d'une **validation par le chercheur**, qui
   confirme conjointement (a) « ces `author_id` sont les miens » **et** (b) « parmi leurs
   publications, **celles-ci** sont réellement de moi ». Ce mécanisme de validation
   n'existe pas encore.

## Décision

> **Le producteur `researchers` est un mart servi, reproductible, ancré sur `author_id`,
> dérivé du seul brut S3. La purge d'opposition est définie au grain `(author_id, work_id)`
> validé — chirurgicale, jamais en bloc. Le mart conserve une provenance au grain
> publication, qui en fournit la capacité ; il n'implémente pas la validation ni la liste
> d'opposition, qui relèvent du déployeur.**

En conséquence :

- **Source = brut S3, jamais live.** Le mart se dérive de `raw/works.topics[]/keywords[]`
  (déjà ingérés) via dbt-duckdb, comme le mart `pairs`. Aucune dépendance au registre
  externe de chercheurs ni à l'API live ; l'invariant de reproductibilité ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/))
  tient jusqu'au `sha256`.
- **Clé d'ancrage = `author_id`.** Le mart vit au grain `author_id` (un vecteur agrégé +
  un sac de labels pondérés par chercheur-cluster). C'est l'instanciation, pour cette
  source, du `researcherId` que la spec appelle « identifiant d'auteur du référentiel ».
  La **fusion** `author_id → personne`, si elle advient un jour, sera une **couche
  au-dessus** du mart (via la table de validation), jamais une réécriture de sa clé.
- **Grain de purge = `(author_id, work_id)` validé.** S'opposer retire du mart et de
  l'index **uniquement** le périmètre que la personne a reconnu comme sien. Une publication
  **non revendiquée** (vrai co-auteur, homonyme non opposé) **reste présente** ; un
  `author_id` qui conserve des publications non opposées **reste visible** pour celles-ci.
  C'est le seul grain réglementairement correct : l'opposition d'Alice retire les données
  d'Alice, jamais celles de Bob qui partage par erreur un cluster.
- **Provenance grain-publication conservée = capacité de purge.** Un embedding
  _mean-poolé_ + normalisé L2 par `author_id` n'est pas « dé-poolable » publication par
  publication (on ne peut pas soustraire la contribution d'une publication du vecteur
  agrégé). Pour rendre la purge chirurgicale **possible**, le mart repose sur une couche
  `curated` au grain `(author_id, work_id)` — vecteur-par-publication + labels-par-publication —
  dont l'agrégat par `author_id` (re-mean-pool + re-L2 pour le vecteur, union pondérée pour
  les labels) est **dérivé**. Le vecteur par publication est **déjà** calculé par
  l'algorithme de référence avant le _mean-pool_ : conserver cette provenance n'est pas un
  surcoût artificiel. Une opposition consiste alors à re-dériver l'agrégat en **excluant**
  les couples `(author_id, work_id)` opposés — pur SQL/NumPy déterministe, **sans recalcul
  d'embedding ni GPU** ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)).
  Le filtre s'applique au point unique entre `curated` et `marts`.
- **Embedding en Python, pas en Node.** Le vecteur(384) est calculé côté `dataops/`
  ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) avec `onnxruntime` (MIT) +
  `tokenizers` (Apache-2.0), sur le **même** `model_quantized.onnx` (`all-MiniLM-L6-v2`)
  que le code TS — sans `torch`, sans licence copyleft, modèle cuit hors-ligne dans l'image.
  Le déterminisme est figé par archi (threads à 1, exécution séquentielle) ; le `sha256` du
  Parquet est stable **par architecture** (le bit-exact cross-archi n'est pas garanti par
  `onnxruntime` — à traiter en tolérance si besoin).

### Frontière capacité / décision

Le dépôt **permet** la purge chirurgicale (provenance + recalcul paramétré par une liste
de couples) ; il ne **décide** rien à la place du déployeur. Restent du ressort du
**déployeur** (responsable de traitement, [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)) :
matérialiser la **validation par le chercheur** (qui produit l'identité `researcherId` et
l'ensemble `(author_id, work_id)` reconnu comme sien), brancher le **registre d'opposition**,
en dériver l'`exclusion_set` au grain couple, et fixer le **SLA** de propagation. Tant que
ces éléments manquent, le mart se produit normalement (capacité) et aucune opposition ne
s'applique (décision non actionnée) — sans contradiction.

## Statut

Accepted (2026-06-11). **Précise** la [spec de ré-dérivabilité](/atlas/architecture/re-derivabilite-mart-index/)
et l'[ADR 0058](/atlas/decisions/0058-report-index-load/) sur un point qu'ils laissaient
muet — la relation `author_id` ↔ personne et le grain de l'opposition — **sans les
contredire** : la spec reste vraie au niveau personne ; cet ADR instancie sa clé sur la
seule source reproductible et raffine le grain de purge. Ne remet en cause aucun ADR.
Débloque l'implémentation du producteur `researchers` (et, par lui, la réactivation de
`index_load`).

## Conséquences

**Bénéfices.** Le producteur `researchers` devient **reproductible** (brut S3, pas de live)
et **livrable** sans attendre la désambiguïsation ni la validation chercheur. La provenance
grain-publication rend la purge d'opposition **chirurgicale et déterministe** — elle honore
l'exigence RGPD (ne retirer que les données revendiquées par la personne) tout en
préservant les données d'autrui. Le mart fournit l'entrée que l'[ADR 0058](/atlas/decisions/0058-report-index-load/)
attendait pour réactiver `index_load`.

**Prix à payer.** Le mart est clé sur un identifiant **imparfait** (`author_id`), pas sur
une identité de personne ; la consolidation `author_id → personne` reste une dette amont
(désambiguïsation **et** validation chercheur), hors de ce mart. La provenance
grain-publication coûte du **stockage** (un vecteur(384) et des labels par publication, en
plus de l'agrégat servi). Le déterminisme du `sha256` de l'embedding est garanti **par
architecture**, pas cross-archi.

**Garde-fous.**

- Le mart ne dépend **jamais** d'une source live (registre externe, API) : uniquement du
  brut S3 reproductible. Un test non hermétique est un défaut de revue
  ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
- La purge est **chirurgicale** : aucune opposition ne retire une publication non
  revendiquée ni n'efface un `author_id` en bloc. Un test prouve qu'une opposition d'une
  personne ne supprime jamais les publications non revendiquées d'une autre.
- L'embedding est **Python-natif** (pas de Node, pas de `torch`, pas de copyleft), modèle
  cuit hors-ligne, déterministe par archi.
- Le mart **ne crée jamais** la table de validation ni la liste d'opposition : il expose la
  provenance et la mécanique de recalcul (**capacité**) ; le déployeur matérialise la
  validation, branche le registre et fixe le SLA (**décision**).
