---
title: "0099 — Déduplication du mart EUNICoast par récence (version la plus à jour)"
---

## Contexte

L'[ADR 0094](/atlas/decisions/0094-mart-eunicoast-parquet-co-autorat/) a fait du
**mart EUNICoast** — un Parquet produit par l'asset Dagster `mart_eunicoast` — la
source unique de la chaîne dbt du pipeline citation : il filtre le lac OpenAlex
(`raw/works`) au périmètre EUNICoast (works ayant au moins un auteur affilié à l'un
des 14 ROR — _Research Organization Registry_, l'identifiant pérenne d'un
établissement — et publiés depuis 2016) par lots bornés en mémoire. L'ADR 0094 fixe
le **filtrage** et la **projection** ; il ne dit rien de la **déduplication**. C'est
l'angle mort que le présent ADR comble.

Or OpenAlex **réédite** un `work_id` chaque fois qu'il le corrige (recalcul du FWCI —
_Field-Weighted Citation Impact_, l'impact de citation normalisé par champ ;
ajout/retrait d'une affiliation ; fusion). Chaque réédition paraît dans une
**partition `updated_date=YYYY-MM-DD` plus récente**. Trois faits, mesurés
directement sur la prod dirqual (bucket `citation-datalake`, juillet 2026), posent le
problème :

1. **Le lac accumule les versions.** `raw_snapshot` est **incrémental** : son
   filigrane (`raw/_watermark.json`) ne rapatrie que les partitions postérieures à la
   dernière vue, mais ne **supprime jamais** les partitions antérieures. Une œuvre
   corrigée `N` fois coexiste donc en `N` versions, réparties sur `N` des **482
   partitions `updated_date`** présentes.

2. **La déduplication vivait en aval, sur le mauvais critère.** Le seul dédoublonnage
   de la chaîne était dans le modèle dbt `stg_citation_works`, par
   `row_number() … order by fwci desc` — il gardait la version au **FWCI le plus
   élevé**, pas la plus récente. Une correction d'OpenAlex **à la baisse** (FWCI
   recalculé, affiliation retirée) était donc **ignorée** : le pipeline conservait une
   version périmée au FWCI gonflé. C'est un contresens, le FWCI étant précisément la
   cible du modèle d'uplift ([ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)).

3. **L'information de version était jetée trop tôt.** Les colonnes du mart (ADR 0094
   §4) n'incluent pas `updated_date`. Dès le filtrage, la récence est perdue — la
   dédup aval **ne pouvait pas** choisir la version la plus à jour, faute de la
   connaître.

À cela s'ajoutait un symptôme opérationnel : `mart_eunicoast` n'émet **aucune
sentinelle de complétude** et écrit un dossier `run=<id>/` immuable par exécution
([ADR 0054](/atlas/decisions/0054-immutabilite-artefacts-run/)). La source dbt lisait
`run=*` (tous les runs). Un run partiel ou d'un état antérieur du lac laisse un
dossier indistinguable d'un run complet ; deux runs coexistant sur la prod partageaient
ainsi **8 786 `work_id`** (le run le plus ancien était intégralement inclus dans le
plus récent), lus en double par dbt.

## Décision

La **déduplication remonte dans l'asset `mart_eunicoast`** et se fait **par récence**.
Le mart devient un artefact **dédupliqué et autoportant** : une inspection directe du
Parquet donne le résultat correct, sans dépendre d'un traitement aval.

1. **Dédupliquer après le filtre, jamais sur le lac brut.** Dédoublonner 250+ millions
   de works bruts est déraisonnable (volume, mémoire). Le dédoublonnage n'a de sens
   qu'**une fois les filtres massifs appliqués** (année + affiliation), qui réduisent
   le périmètre à ~10⁴–10⁵ works — un volume où la déduplication est négligeable en
   coût. Ce principe (« filtrer massivement d'abord, dédupliquer ensuite ») est le
   pendant naturel du choix de scalabilité de l'ADR 0094.

2. **Garder la version la plus à jour.** Le critère de déduplication est
   `updated_date` **décroissante** : pour un `work_id` donné, on conserve la ligne de
   la partition la plus récente. C'est la sémantique correcte — une correction
   d'OpenAlex fait autorité sur la version qu'elle remplace. `updated_date` est un
   champ **natif** du work Parquet (type `DATE`, sans valeur manquante sur les
   échantillons mesurés) ; il est **ajouté à la projection** du mart.

3. **Déduplication globale, pas intra-lot.** Comme un `work_id` en plusieurs versions
   se répartit sur plusieurs partitions donc plusieurs lots, la déduplication doit
   porter sur **l'ensemble** des works retenus, pas lot par lot (une dédup intra-lot
   laisserait passer les doublons inter-lots). Concrètement, l'asset procède en **deux
   temps** : le filtrage par lots bornés reste inchangé (il écrit des fragments
   intermédiaires), puis une **passe de consolidation** relit l'ensemble des works
   filtrés du run (~10⁵ lignes, quelques centaines de Mo — tient dans le
   `memory_limit` de la connexion lakehouse, avec débordement disque en filet) et
   applique `row_number() over (partition by work_id order by updated_date desc) = 1`.

4. **Le staging dbt ne déduplique plus.** Le `qualify … order by fwci desc` de
   `stg_citation_works` est **retiré** : la garantie d'unicité de `work_id` est
   désormais tenue en amont par le mart. Le test dbt `unique(work_id)` reste, comme
   invariant vérifiant cette garantie.

5. **Sentinelle de complétude.** La passe de consolidation, étant la **dernière**
   écriture d'un run réussi, est le point naturel pour matérialiser une sentinelle
   (marqueur de complétude) rendant un `run=` incomplet distinguable d'un run complet.
   Le mécanisme précis (marqueur dédié ou sélection du dernier run complet côté source
   dbt) est un détail d'implémentation, tranché à la mise en œuvre.

## Statut

Accepted (2026-07-09). Amende l'[ADR 0094](/atlas/decisions/0094-mart-eunicoast-parquet-co-autorat/)
(dont il complète le §4 « colonnes du mart » et la sémantique de production) et sert
l'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) (un FWCI à jour est
la cible correcte du modèle). Sans effet sur le contrat de sortie
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster.md)) : le mart EUNICoast
est un artefact **interne** d'ingestion, pas un mart servi.

## Conséquences

- **Correction sémantique.** Une réédition d'OpenAlex (FWCI corrigé, affiliation
  modifiée) est enfin prise en compte : le pipeline reflète l'état courant de la
  donnée, plus une version périmée au FWCI maximal.
- **Mart autoportant.** `mart_eunicoast/run=<id>/` est dédupliqué en soi ; l'unicité de
  `work_id` ne dépend plus d'un traitement dbt aval. Les doublons inter-runs lus par
  la source dbt disparaissent de fait.
- **Coût maîtrisé.** La déduplication opère sur ~10⁵ works (post-filtre), pas sur le
  lac — mémoire bornée, débordement disque en filet, aucun risque d'OOM réintroduit.
- **Responsabilité déplacée, invariant conservé.** La déduplication quitte dbt pour
  l'ingestion ; le test `unique(work_id)` demeure côté dbt comme garde-fou de
  non-régression. Les fixtures et golden qui exerçaient la dédup dbt sont à réancrer
  sur le mart.
- **Alternative écartée — dédup par récence dans dbt.** On aurait pu garder la dédup
  dans `stg_citation_works` en remplaçant seulement `fwci desc` par `updated_date desc`
  (coût minimal). Écartée : elle laisse le mart trompeur à l'inspection directe (les
  doublons y subsistent) et maintient une responsabilité de qualité de données dans la
  couche de transformation, alors que le mart est le point où le périmètre — donc la
  notion d'unicité — est défini.
- **Alternative écartée — filigrane remplaçant (compaction du lac).** Faire écraser par
  `raw_snapshot` l'ancienne version d'un `work_id` à l'ingestion supprimerait le besoin
  de dédup aval. Écartée : coûteuse (compaction S3 sur 1,3 Tio), et elle sacrifie la
  propriété « le raw Parquet complet reste sur Ceph » (ADR 0094, Conséquences) qui
  autorise un autre filtrage sans re-télécharger.
- **Réserve.** Le gain suppose que `mart_eunicoast` est re-matérialisé après chaque
  avancée du filigrane d'ingestion (orchestration `raw_snapshot` → `mart_eunicoast` →
  transform). C'est le cas via `ingestion_job` (qui sélectionne les deux assets) ; le
  sensor de transformation sur avancée du filigrane reste, lui, à armer par le
  déployeur.
