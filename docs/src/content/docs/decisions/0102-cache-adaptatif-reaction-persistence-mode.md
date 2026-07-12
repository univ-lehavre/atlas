---
title: "0102 — Réaction du pipeline au curseur persistence.mode : cache adaptatif à paliers (socle sobre + horizon)"
---

## Contexte

Le dépôt `cluster` a introduit un curseur de rétention déclaratif
`persistence.mode ∈ {full, bounded, ephemeral}`
([ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md),
câblé sur six briques d'infrastructure) et pose que **le code applicatif doit
s'adapter** au matériel
([ADR cluster 0107 §3](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0107-adaptativite-materielle-premisse-cultures.md)).
Un curseur qui ne borne que le stockage `cluster` est incohérent si le pipeline
`atlas` continue de **tout produire** et de **tout re-télécharger**. Cet ADR acte la
**réaction applicative** (issue cluster#630, volet B de l'épique cluster#627).

La conception détaillée vit dans le plan
[2026-07-12 — Cache adaptatif à paliers](/atlas/plans/2026-07-12-cache-adaptatif-persistence/).
L'investigation du pipeline réel (citation + mediawatch) établit trois faits qui
cadrent la décision :

1. **Il existe un palier de reprise maître : `mart_eunicoast`.** Compact (~70k works
   filtrés vs ~600M dans le brut, ~1,2 Tio), tout l'aval en dépend proprement (dbt
   lit `mart_eunicoast`, pas `raw/` ; aucun asset aval ne court-circuite vers le
   brut) et **tout l'aval est déterministe** (seed GBDT figé `RANDOM_STATE=42`,
   embeddings ONNX mono-thread, dbt à `ORDER BY` stables — [ADR 0057](/atlas/decisions/)).
   **Garder `mart_eunicoast` = pouvoir tout re-transformer sans retoucher le brut ni
   re-télécharger OpenAlex.**
2. **Les leviers de bornage existent déjà.** `RawSnapshotConfig` (`sample_size`,
   `max_partitions`, `0 = illimité`) côté citation, avec le câblage `env → run_config`
   (`_ingest_run_config`). Le mode n'a pas à _inventer_ un évinceur : il **prérègle**
   des bornes présentes.
3. **GDELT (mediawatch) re-télécharge en boucle.** `raw_native_gkg` (code-location
   `mediawatch-dagster`, pas `citation`) n'a **aucun** check « existe déjà en S3 » :
   chaque tick de 15 min re-tire les mêmes fichiers du jour, un rejeu re-pull tout. Les
   fichiers GDELT sont **immuables à la source** — mais couper le re-download n'est **pas**
   le « test d'existence trivial » qu'on pourrait croire (voir §Décision, socle point 2) :
   la clé de destination porte `run=<run_id>` et l'aval `raw_gkg` relit **strictement** le
   run courant. Le vrai gain d'egress reste réel, mais son design est non trivial →
   **renvoyé en issue**, hors socle.

Le risque, à conception libre, est l'**usine à gaz** : un cache sophistiqué (éviction
par fréquence d'accès, budget dérivé de la classe matérielle en temps réel, proxy
pull-through mutualisé) qu'aucun besoin mesuré ne réclame encore. Le dépôt revendique
la sobriété ([ADR 0093 cluster](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md) :
« pas de brique inutile à opérer » ; posture « en construction, pas en place »).

## Décision

> **Le pipeline `atlas` réagit au curseur `persistence.mode` par un SOCLE SOBRE
> implémenté maintenant, et une VISION de cache adaptatif à paliers documentée mais
> renvoyée en issues — construite seulement si un besoin la mesure.**

### Le socle (implémenté par cet ADR)

1. **Le mode prérègle les bornes d'ingestion existantes (citation).** Le curseur
   descend par une **seule** variable d'instance côté atlas,
   `CITATION_INGEST_PERSISTENCE_MODE` (défaut `full`), lue par `_ingest_run_config`
   (`citation-dagster/definitions.py`) et traduite en `sample_size`/`max_partitions` :
   - `full` (et tout mode **absent / inconnu / vide**) → **aucune borne** → run_config
     `None` = **le comportement actuel à l'octet** (garde-fou zéro-régression, littéral :
     le même objet `None`, pas un `RunConfig(sample_size=0)`) ;
   - `bounded` → bornes finies (fenêtre) ;
   - `ephemeral` → bornes minimales.
     Aucun mécanisme nouveau : un préréglage. **Préséance** : une variable explicite
     (`CITATION_INGEST_SAMPLE_SIZE`/`…_MAX_PARTITIONS`, overlay banc) **gagne** sur le
     mode. `mart_eunicoast` reste toujours matérialisé (point de reprise). Le câblage
     cluster (poser cette variable dans l'env du pod code-location) est un **second geste**
     (issue séparée) : sans lui, le code lit le défaut `full` → aucune régression.
2. **Ne pas re-télécharger GDELT : renvoyé en issue (design non trivial).** Ce que l'on
   croyait un « test d'existence trivial » avant `client.get_bytes(file.url)` **ne marche
   pas** tel quel, pour deux raisons dures vérifiées dans `raw_native_gkg` : (a) la clé de
   destination porte `run=<run_id>` (uuid neuf à chaque tick) → tester le chemin du run
   courant est **toujours faux** ; (b) l'aval `raw_gkg` relit **strictement** `run=<run_id
courant>` dans le **même** job → un « skip sans réécrire » produit une projection
   **incomplète** (données fausses), pas juste un check inefficace. Le remède correct
   (copier le Parquet natif d'un `run=` antérieur vers le `run=` courant, `rclone copyto`
   **S3→S3**, sans egress réseau) coupe bien le re-download **en préservant** l'invariant
   run-courant-complet (ADR 0100) — mais c'est ~15-20 lignes, pas un check trivial :
   **renvoyé en issue** `mediawatch`, hors socle.

Le socle **tient debout seul** : le curseur réagit sur l'ingestion citation (byte-identity
en `full`), et le vieux brut expire via le lifecycle S3 **déjà câblé** côté cluster (#631).
Le gain d'egress GDELT vient ensuite, par l'issue dédiée. C'est le critère de succès minimal.

### Le substrat (tranché, pas de nouvelle brique)

Le contenu volumineux (brut, paliers agrégés) vit sur **S3/RGW** (immuable,
adressable) ; l'index de cache éventuel (« quel palier est frais/présent ») sur
**CNPG** (déjà au contrat, requêtable). **Pas de Redis** : cacher des Tio en RAM est
physiquement absurde, et Postgres couvre l'index aussi bien (cohérent ADR 0093
cluster). Aucune base clé-valeur n'est introduite.

### L'horizon (documenté ici, renvoyé en issues — pas construit par défaut)

La vision complète est **capturée** pour ne pas se perdre, mais **conditionnée à une
mesure de besoin** (jamais un prérequis). Chaque élément est **tracé en issue** avec son
critère de déclenchement :

- **Quota + expiration du cache** ([#619](https://github.com/univ-lehavre/atlas/issues/619),
  si une machine contrainte sature le disque) : un plafond + suppression FIFO par âge.
- **Éviction adaptative à deux forces** ([#620](https://github.com/univ-lehavre/atlas/issues/620),
  si l'usage le justifie) : garder le chaud (fréquence lue dans l'event log Dagster),
  céder sous pression de ressources. Suppose un **registre de déterminisme** minimal — en
  pratique exposer `RANDOM_STATE` en env pour le débrayer. **Cela amenderait l'ADR cluster
  0109** (qui excluait le LRU au nom du déterminisme) : le déterminisme du _résultat_
  (seeds serrables) est indépendant de la _présence en cache_ (adaptative) — un asset
  évincé recalculé au même seed donne le même résultat. À acter **seulement si** cette
  phase est ouverte.
- **Budget dérivé de la classe matérielle** ([#621](https://github.com/univ-lehavre/atlas/issues/621),
  RAM/disque de la topologie) et **coussin réservé** (le cache cède aux autres
  applications, ne squatte pas).
- **Brique cluster** ([#622](https://github.com/univ-lehavre/atlas/issues/622), pull-through
  cache mutualisé, lifecycle S3 d'éviction active du brut) : **seulement si** le check S3
  côté atlas (socle) se révèle insuffisant.

Le **socle** lui-même se prolonge par deux issues (pas de l'horizon, du socle) : le
re-download GDELT ([#617](https://github.com/univ-lehavre/atlas/issues/617), copyto S3→S3),
le câblage cluster→env du pod ([#618](https://github.com/univ-lehavre/atlas/issues/618)) et
l'extension du mapping à mediawatch/pageviews
([#623](https://github.com/univ-lehavre/atlas/issues/623)).

### La règle de sobriété

Chaque élément d'horizon s'ouvre par une **mesure** (« le disque sature », « cet asset
est re-demandé assez pour justifier un scoring »), pas par anticipation. Ne pas
considérer la réaction applicative « inachevée » parce que l'horizon n'est pas
construit : il est **conditionnel**, pas dû.

## Statut

Accepted (2026-07-12). Décline [ADR cluster 0107 §3](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0107-adaptativite-materielle-premisse-cultures.md)
et [ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md)
côté atlas. Conception : plan
[2026-07-12](/atlas/plans/2026-07-12-cache-adaptatif-persistence/). N'amende
[ADR 0057](/atlas/decisions/) (déterminisme) que si l'horizon « éviction adaptative »
est ouvert (débrayage du seed). Ne supersede aucun ADR.

## Conséquences

- **Cohérence matérielle immédiate, sans sur-ingénierie.** Le curseur cluster a un
  répondant applicatif dès le socle (le mapping d'ingestion citation, ancré dans
  l'existant), et la vision riche est tracée sans être imposée.
- **Le re-download GDELT reste à couper — par une issue, pas par le socle.** Le « test
  d'existence trivial » qu'on imaginait est **faux** (`run=<run_id>` dans la clé de
  destination + `raw_gkg` relit strictement le run courant) ; le remède correct est un
  `rclone copyto` **S3→S3** (~15-20 lignes), renvoyé en issue `mediawatch`. Le gain
  d'egress est réel mais différé — le socle ne le promet pas.
- **`full` reste neutre à l'octet** : zéro régression sur les instances existantes
  (mode par défaut / absent / inconnu → run_config `None`, prouvé par test).
- **Dette d'horizon tracée en issues** (une par raffinement), avec le critère de
  déclenchement (la mesure qui l'ouvre). Le socle n'en dépend pas.
- **Dépendances cluster signalées** (lifecycle S3 d'éviction du brut, éventuel
  pull-through mutualisé) : issues côté `cluster`, non présumées nécessaires.
- **Asymétrie des code-locations assumée** : citation d'abord (câblage `env→config`
  présent) ; mediawatch/pageviews requièrent d'abord de **créer** ce câblage (config
  Dagster sans env aujourd'hui) et d'harmoniser les polarités de défaut — traité dans
  les issues du socle par code-location.
