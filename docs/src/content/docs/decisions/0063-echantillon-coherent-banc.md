---
title: "0063 — Échantillon cohérent par construction sur les petits bancs (authors dérivés des works)"
---

## Contexte

L'[ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) a acté
l'ingestion du snapshot OpenAlex par **copie de fichiers** (`rclone`), entité par
entité (`works`, `authors`), partition par partition (`updated_date=YYYY-MM-DD/`),
**bornée** sur le banc par `sample_size` / `max_partitions`. Le snapshot est
partitionné par **date de mise à jour**, pas par contenu.

Conséquence révélée par l'E2E complet du pipeline (banc Lima, `transform_job`) :
sur un petit banc, les tranches `works` et `authors` ingérées sont **disjointes**.
Un échantillon de `works` (p. ex. partition 2016) référence dans ses
`authorships` des centaines d'`author_id` précis ; l'échantillon d'`authors`
(p. ex. partition 2026) n'en contient quasiment aucun. Les tests dbt
`relationships` (`authorships.author_id` → `authors.author_id`,
`marts_researchers.author_id` → `curated_authors`) échouent alors sur des
**clés étrangères pendantes** — non par défaut du code, mais parce que rien ne
garantit, en copiant des fichiers entiers, que les deux échantillons se
recoupent. En **production** (snapshot complet), la cohérence est naturelle
(tous les auteurs sont présents) ; les tests `relationships` y sont corrects et
souhaitables. Le problème est **propre aux petits bancs**.

Un contournement manuel (seeder à la main un fichier d'authors cohérent) a permis
de prouver l'E2E, mais ce n'est pas reproductible ni versionné : un banc neuf
rebute sur la même incohérence. Il faut une **capacité du code**.

## Décision

`raw_snapshot` gagne un **mode « échantillon cohérent »** (option `coherent_sample`,
**désactivé par défaut**) : après avoir copié les `works`, l'asset **dérive** une
tranche `authors` contenant **exactement les auteurs référencés** par ces works,
à partir des objets `author` déjà présents **inline** dans
`works.authorships[].author` (`{id, display_name, orcid}` — vérifié sur données
réelles). Les champs absents de l'inline (`works_count`, `cited_by_count`,
non contraints par aucune suite Great Expectations ni test `relationships`) sont
mis à `0`. La tranche dérivée est écrite sous une partition réservée
`raw/authors/updated_date=coherent-sample/` du lakehouse, lue par `dbt` comme
n'importe quelle partition `authors`.

Pourquoi **dériver** plutôt que **récupérer** les vrais enregistrements `authors`
par id : le snapshot S3 d'OpenAlex n'est pas indexé par id (pas de « fetch author
by id » en copie de fichiers). La dérivation depuis l'inline est la **seule**
construction-time-coherente possible avec l'ingestion par fichiers (ADR 0054).

Le mode est **réservé au banc** : en production, `coherent_sample=false` et
l'ingestion massive d'`authors` reste celle de l'ADR 0054 (snapshot complet,
cohérence native). Le mode n'altère jamais une tranche `authors` réelle : il
écrit dans une partition dédiée, distincte des `updated_date` de la source.

## Statut

Accepted.

## Conséquences

- **Gain** : un petit banc neuf exécute le `transform_job` de bout en bout
  (dbt `relationships` verts → `researcher_embeddings` → `index_load` → drift),
  sans intervention manuelle ni donnée hors dépôt. La preuve E2E redevient
  reproductible.
- **Fidélité** : la tranche dérivée est un **sous-ensemble fidèle** des auteurs
  réellement cités (mêmes `id`/`display_name`/`orcid` que la source), pas des
  données fictives. Seuls deux compteurs non contraints sont mis à `0` — sans
  effet sur les contrats validés.
- **Prix à payer** : sur le banc, la table `authors` reflète les auteurs **cités**
  par l'échantillon de works, pas une tranche temporelle d'`authors`. C'est le
  but (cohérence référentielle) ; un test qui aurait besoin d'auteurs **non**
  cités doit ingérer une vraie partition `authors` (mode par défaut).
- **Garde-fou** : le mode est **opt-in** et **borné** comme le reste de
  l'ingestion ; il n'existe pas en production (frontière banc/prod, ADR 0054).
  La partition réservée `coherent-sample` est immuable comme les autres
  (un rejeu réécrit la même clé, idempotent).
- **Frontière** : aucune nouvelle ancre d'infra ; l'asset lit/écrit le même
  lakehouse S3. Décision interne au livrable `atlas`, sans impact sur le contrat
  d'interface avec le cluster ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
