---
title: "0101 — Sélection du « dernier run complet » par récence (ModTime), pas par ordre lexical du run_id"
---

## Contexte

Les pipelines `mediawatch` et `pageviews` produisent des marts « servis » en Parquet
immuable sous `marts/<mart>/dt=<période>/run=<id>/part.parquet` : chaque
re-matérialisation d'une période écrit un **nouveau `run=`**, jamais en place
([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)). Plusieurs runs
d'une même période coexistent donc sur le stockage. Trois consommateurs doivent, à
la lecture, ne retenir **qu'un seul run par période** — « le dernier » :

- l'écriture du `manifest.json` global (`latest_run_parts`) ;
- l'asset de prévision, qui lit toute la série temporelle (`_read_timeline`) ;
- l'asset-check de dérive, qui compare le run courant `N` au run précédent `N-1`
  (`_list_runs` + `check_forecast_drift`).

Ces trois lieux, dans les **deux** pipelines (six emplacements), déterminent « le
dernier run » par **comparaison lexicographique de la chaîne `run=`** : `max(run)`
en SQL, `ORDER BY run`, ou `m.group(2) > latest[...]` en Python. Cette logique
présume que « `run=` lexicographiquement maximal » vaut « le plus récent ». **Cette
présomption est fausse.**

Le `run=` écrit dans le chemin vient de `context.run_id` de Dagster, propagé à dbt
par `build_dbt_vars` (`curated_run = run_id`). Or `context.run_id` est un
`uuid.uuid4()` — un identifiant **aléatoire**, sans composante temporelle. Trier des
uuid4 par ordre lexical revient à tirer un run **au hasard**, pas à choisir le plus
récent. Le symptôme : après plusieurs re-matérialisations d'une période, la prévision
et le manifest peuvent servir un **run arbitraire ancien** au lieu du dernier, et le
drift comparer le run courant à un **N-1 quelconque** plutôt qu'à son prédécesseur
chronologique.

Deux précisions cadrent le périmètre :

1. **Le pipeline `citation` n'est pas affecté** — et pas parce que ses `run=`
   seraient triables. Sa chaîne de transformation ne fait **aucune** sélection
   « dernier run » inter-runs : producteur et consommateur d'un même run Dagster
   partagent le **même** `context.run_id` et lisent/écrivent le **même** `run=`
   (couplage intra-run). La question « quel run est le plus récent ? » ne s'y pose
   jamais. (Ses assets de _drift_ portent toutefois le même motif latent — voir
   Conséquences.)

2. **Le besoin exact est « le dernier run complet », mais la complétude est déjà
   attestée par la présence du `part.parquet`.** Un `run=` ne contient qu'un unique
   `part.parquet`, écrit par un seul `COPY` DuckDB — un transfert **atomique** : le
   part apparaît **entier ou pas du tout**, jamais tronqué. Un run interrompu pendant
   l'écriture ne laisse donc **aucune** part visible ; un run dont le part existe est
   complet pour ce que lisent le mart servi et la prévision. La présence du part **est**
   la sentinelle de complétude au niveau run — il n'y a pas de `run=` « présent mais
   à moitié écrit » à écarter. Le `manifest.json` global (écrit en dernier,
   [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) conserve
   son rôle distinct : sceller le **contrat de transfert vers le consommateur**
   (l'application), pas arbitrer quel run est le dernier.

## Décision

La sélection du dernier run par période cesse de reposer sur l'ordre lexical du
`run=`. Elle combine **récence mesurée** et **complétude attestée**, via une
**fonction pure partagée** (un jumeau par pipeline, `dataops` étant hors du graphe
pnpm — [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) que les six
emplacements appellent.

1. **Récence par `ModTime`, pas par `run=`.** L'ordre chronologique des runs est
   déterminé par le **`ModTime` S3** (date de dernière modification de l'objet), et
   non par la valeur du `run=`. `rclone lsjson` **fournit déjà** ce champ dans la
   sortie que le code lit — il était simplement **ignoré**. Comme un `run=` est
   immuable (jamais réécrit, [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/))
   et ne contient qu'un unique `part.parquet` (`COPY` DuckDB atomique), son `ModTime`
   est un horodatage fiable de sa production. Ce critère est **indépendant de la forme
   du `run=`** : il ordonne correctement les `run=` uuid4 déjà écrits comme tout run
   futur, **sans renommage ni migration** — propriété décisive, l'immuabilité
   interdisant de récrire l'historique.

2. **Complétude par présence du part, sans marqueur ajouté.** Un run n'est éligible
   que si son `part.parquet` existe — ce qui, l'écriture étant atomique, **atteste
   déjà** sa complétude (voir Contexte §2). On **n'introduit aucun marqueur
   `_complete` par `run=`** : ce serait une écriture supplémentaire, donc un **nouveau**
   point de coupure (part écrit mais marqueur non), rouvrant précisément l'ambiguïté
   qu'on prétend fermer — et cassant la rétrocompatibilité, les runs historiques n'en
   ayant pas. On **ne fait pas non plus** dépendre la prévision du `manifest.json`
   global : cela créerait une nouvelle arête d'orchestration entre deux assets
   aujourd'hui parallèles (décision structurante injustifiée ici). La correction est
   **purement algorithmique** — remplacer l'ordre lexical par l'ordre `ModTime` — sans
   nouvel objet de stockage ni nouvelle dépendance.

3. **Déterminisme (départage stable).** Le `ModTime` n'est pas reproductible en
   valeur (deux exécutions produisent des dates différentes), mais la **sélection**
   doit être déterministe pour un état de stockage donné
   ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)). Les
   ex-æquo de `ModTime` (runs à la même seconde d'horloge serveur, cas dégénéré) sont
   donc départagés par l'ordre lexical du `run=` — ordre total stable `(ModTime, run)`.
   Les `ModTime` (RFC 3339 à précision variable) sont comparés **parsés en date**, non
   comme chaînes. La sélection est ainsi fonction pure de l'état S3 observé, sans
   dépendre d'une horloge locale.

4. **Rétrocompatibilité native.** Ne rien ajouter au chemin rend la
   rétrocompatibilité gratuite : les `run=` uuid4 déjà écrits portent tous un
   `ModTime`, donc l'ordre les couvre directement, comme tout run futur — aucun repli
   spécial, aucune perte d'historique, aucune réécriture. Un `ModTime` manquant d'une
   entrée (anomalie de stockage) est traité comme la date la plus ancienne possible :
   le run concerné ne l'emporte jamais par défaut — dégradation sûre.

5. **Cas du drift (`N-1`).** L'asset-check de dérive compare le run courant `N` à son
   prédécesseur `N-1`, une sélection inter-runs qu'aucun manifest ne fournit. Elle
   suit la même règle : le **baseline** est le run le plus récent **strictement
   antérieur** au run courant `N` dans l'ordre `(ModTime, run)` — remplaçant le
   `previous[-1]` d'un tri lexical, doublement faux (il comparait un `run_id` courant
   uuid4 à des `run=` uuid4). Le run `N` venant d'être écrit dans le même run Dagster,
   il porte le `ModTime` maximal ; « le run juste avant `N` » est donc exactement son
   vrai prédécesseur.

## Statut

Accepted (2026-07-10). Corrige un défaut de sélection présent dans `mediawatch` et
`pageviews` depuis l'introduction de leurs marts servis
([ADR 0081](/atlas/decisions/0081-modele-prevision-volume-articles-mediawatch/),
[ADR 0098](/atlas/decisions/0098-modele-prevision-vues-wikipedia/)). Prolonge, pour
ces pipelines, la sémantique de « dernier run complet par récence » déjà retenue côté
`citation` par l'[ADR 0099](/atlas/decisions/0099-deduplication-mart-eunicoast-par-recence/).
Sans effet sur le contrat de sortie
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) : la forme des marts
servis et du `manifest.json` est inchangée ; seule la **sélection** du run servi est
corrigée.

## Conséquences

- **Correction de sélection.** La prévision et le manifest servent désormais le
  dernier run réellement le plus récent **et** complet ; le drift compare au vrai
  prédécesseur chronologique. Le résultat servi cesse de dépendre d'un tirage
  aléatoire d'uuid4.
- **Rétrocompatible sans migration.** Le `ModTime` ordonnant l'existant comme le
  futur, aucun `run=` n'est renommé, aucune donnée n'est récrite (immuabilité,
  [ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)) ; ne rien ajouter
  au chemin garde l'historique lisible sans repli spécial.
- **Coût asymétrique assumé.** Les emplacements `manifest` obtiennent le `ModTime`
  **gratuitement** (le `lsjson` était déjà appelé). Les emplacements `forecast` et
  `drift`, qui lisaient en pur-DuckDB (où le `ModTime` n'est pas une colonne),
  gagnent un appel `rclone lsjson` pour construire l'ordre puis restreindre la
  requête aux `run=` retenus. Surcoût réseau modeste, déjà pratiqué ailleurs dans ces
  pipelines.
- **Logique factorisée, duplication inter-package assumée.** La règle « dernier run
  complet » vit dans une fonction pure unique par pipeline, testable sans I/O
  (entrées `lsjson` synthétiques). Faute de package Python partagé entre les
  code-locations `dataops` ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)),
  elle est dupliquée en un jumeau par pipeline — duplication légère et cohérente,
  préférée à un couplage inter-package artificiel.
- **Jumeaux latents dans `citation`.** Les assets de _drift_ de `citation`
  (`drift.py`, `drift_uplift.py`) portent le **même** `ORDER BY run` sur des marts
  produits en uuid4, avec un commentaire erroné les disant « horodatés ». C'est un
  bug préexistant, hors du périmètre corrigé ici ; les laisser inchangés n'est pas
  une régression. Leur correction par la même règle fera l'objet d'une **issue**
  dédiée (`tech-debt`) pour ne pas mêler deux pipelines dans une même PR.
- **Tests réancrés.** Les tests qui encodaient la présomption fautive (fixtures où
  `run=BBB > run=AAA` était commenté « plus récent ») sont réécrits pour que
  `ModTime` et ordre lexical **divergent** — le run au `ModTime` le plus récent doit
  gagner même lorsqu'il est lexicographiquement inférieur, verrouillant la
  non-régression.
- **Réserve.** Le `ModTime` suppose que le stockage ne récrit jamais la date de
  modification d'un objet immuable ; une opération de maintenance (`rclone copy`/`sync`
  recopiant un ancien run) la violerait et produirait un « faux récent ». L'immuabilité
  contractuelle ([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/))
  l'interdit — hypothèse explicitée, non garantie par le code.
