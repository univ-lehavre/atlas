---
title: Plan — Cache adaptatif à paliers (versant atlas de persistence.mode)
---

> **Date du plan : 2026-07-12.** Socle décisionnel : [ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md) (curseur `persistence.mode`, câblé côté cluster), [ADR cluster 0107 §3](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0107-adaptativite-materielle-premisse-cultures.md) (« le code applicatif s'adapte »), [ADR 0052](/atlas/decisions/) (reproductibilité — **débrayable hors test**), [ADR 0057](/atlas/decisions/) (déterminisme du pipeline citation), [ADR 0100](/atlas/decisions/) (séparation native/projetée mediawatch), [ADR 0101](/atlas/decisions/) (sélection du dernier run par récence). Issues : cluster#630 (versant atlas de `persistence.mode`), cluster#631 (câblage cluster, mergé), cluster#627 (épique adaptativité, volet B).
>
> **Ce document est un PLAN, pas une implémentation.** Il tranche les questions de conception et a débouché sur l'[ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/) (socle sobre + horizon renvoyé en issues) ; aucun code applicatif n'est écrit avant cet ADR (cluster#630 : « ne pas figer un contrat d'interface au jugé »). Chaque phase liste fichiers, invariants et critères « done », et se termine par une PR séparée.

## 1. Contexte et thèse

Le cluster porte un curseur de rétention déclaratif `persistence.mode ∈ {full, bounded, ephemeral}` (ADR cluster 0109), câblé sur six briques d'infrastructure (StorageClass, CNPG, Loki, Prometheus, datalake, snapshots). Mais un curseur qui ne borne que le **stockage cluster** est incohérent si le **code applicatif atlas** continue de tout produire et de tout re-télécharger. Ce plan décrit la **réaction applicative**.

L'investigation du pipeline réel (citation + mediawatch) révèle que le sujet est **plus riche que « borner l'ingestion »** : c'est une **architecture de cache à paliers**, adaptative, qui répond à **deux problèmes orthogonaux** :

- **Ne pas RE-CALCULER** ce qui est dérivable — un cache de **paliers re-jouables** (le résultat d'un asset, s'il est conservé, permet de re-transformer l'aval sans repasser par l'amont).
- **Ne pas RE-TÉLÉCHARGER** ce qui est immuable — un cache de **download** (pull-through) devant les sources externes (OpenAlex, GDELT).

Ces deux mécanismes sont **distincts** et ce plan les traite séparément, mais sous une même architecture de cache.

**Thèse centrale.** Le cache est une **hiérarchie de paliers immuables re-calculables**. Chaque palier évincé se **reconstruit à l'identique** depuis son amont (le pipeline est déterministe, cf. §4). L'éviction peut donc être **adaptative** **sans risque** — car rien de conservé n'est irremplaçable — et pilotée par **deux forces** : la **valeur** (garder ce qui est demandé souvent) et la **pression** de ressources (§5, §5bis). Le cache est un **bon citoyen** : son budget **dérive de la machine** (RAM/disque de la classe matérielle, ADR 0107) et il **cède aux autres applications** sous pression plutôt que de saturer. Le curseur `persistence.mode` choisit **jusqu'à quel palier on garantit la présence** ; la machine impose le **budget** ; l'usage choisit ce qui est en plus gardé chaud. Substrat : **S3/RGW** (paliers volumineux) + **CNPG** (index de cache), **jamais Redis** (§6).

## 2. Les deux mécanismes de cache

### 2.1 Cache de PALIERS (rétention re-jouable) — répond à cluster#630

Le pipeline citation est une chaîne de paliers immuables (chaque asset écrit sous `run=<id>/`, jamais réécrit) :

```
OpenAlex (externe) → raw_snapshot → mart_eunicoast
   → [dbt: staging → curated → marts]
       → researcher_embeddings → pair_uplift_model → *_manifest → index_load (pgvector)
```

Fait structurant : **`mart_eunicoast` est le palier maître.** Il est ~4–5 ordres de grandeur plus petit que le brut (~70k works filtrés EUNICoast vs ~600M dans le brut, ~1,2 Tio), **tout l'aval en dépend proprement** (aucun asset aval ne court-circuite vers le brut ; dbt lit `mart_eunicoast`, pas `raw/`), et **tout l'aval est déterministe** (§4). **Garder `mart_eunicoast` = pouvoir tout re-transformer sans jamais retoucher le brut ni re-télécharger OpenAlex.**

### 2.2 Cache de DOWNLOAD (pull-through) — chantier connexe, surtout GDELT

Deux sources externes, aux profils **opposés** :

|                                | OpenAlex (citation)                                            | GDELT (mediawatch)                                 |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------- |
| Cadence de download            | mensuelle (snapshot)                                           | **toutes les 15 min**                              |
| Dédup actuelle                 | **partielle** (watermark par date évite de re-copier le passé) | **AUCUNE** — re-télécharge systématiquement        |
| Immuabilité des fichiers       | oui (snapshot)                                                 | **oui** (`<ts>.gkg.csv.zip` figé à la publication) |
| Valeur d'un pull-through cache | faible (le watermark suffit ~)                                 | **forte**                                          |

GDELT re-télécharge en boucle : chaque tick de 15 min re-tire les mêmes fichiers du jour (`gkg.files_in_day` prend toujours `same_day[:max_files]`), un rejeu re-pull tout (nouveau `run_id`), un échec repart de zéro (pas de reprise partielle). Les fichiers étant **immuables**, c'est un cas d'école de pull-through cache. Point d'insertion identifié : `client.get_bytes(file.url)` (`mediawatch-dagster/.../raw_native_gkg.py:105`), clé de cache = `file.url` / timestamp GDELT.

> **Révision post-reconnaissance (2026-07-12).** Le « simple test d'existence » esquissé ci-dessous s'est révélé **faux** à la vérification du code : la clé de destination porte `run=<run_id>` (uuid neuf à chaque tick) et l'aval `raw_gkg` relit **strictement** le `run=` courant dans le même job — un skip qui ne réécrit pas sous le run courant produit une projection **incomplète**. Le remède correct est un `rclone copyto` **S3→S3** (copier le Parquet natif d'un `run=` antérieur vers le run courant, sans egress réseau), ~15-20 lignes, qui **préserve** l'invariant run-courant-complet (ADR 0100). Ce n'est donc **pas** le check trivial de la Phase 2 ci-dessous : il est **renvoyé en issue** `mediawatch` (voir [ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/), §Décision socle point 2). Seule la Phase 1 (citation) est livrée dans le socle.

**Nuance de gouvernance :** ce cache de download relève de l'**efficacité d'egress** (et de l'air-gap), **pas** de la rétention `persistence.mode`. Il fait l'objet d'un **ADR distinct** (et probablement d'une **brique cluster** : un pull-through médiatisant l'egress — cf. §7).

## 3. Le curseur, cran par cran — comportement du pipeline

| Cran            | Intention                | Brut (`raw_snapshot` / `raw_native_gkg`)                                                                                                                     | Paliers agrégés (mart, curated, embeddings)                      | Cache chaud           |
| --------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | --------------------- |
| **`full`**      | stockage complet         | conservé sans borne (comportement **actuel à l'octet**)                                                                                                      | tous conservés                                                   | tout gardé            |
| **`bounded`**   | cache adapté             | **évincé** hors fenêtre ; borné à l'ingestion (SAMPLE_SIZE/MAX_PARTITIONS finis) — mais **`mart_eunicoast` et les dérivés sont épinglés** (point de reprise) | conservés (épinglés hors quota)                                  | adaptatif (fréquence) |
| **`ephemeral`** | on stream sans conserver | non matérialisé / jetable                                                                                                                                    | seul le manifeste de cache subsiste ; tout se re-tire/re-calcule | minimal               |

Point-clé de conception : en `bounded`, **on évince le brut lourd, pas les agrégats.** C'est cohérent avec ADR cluster 0107 (« le brut lourd est le seul candidat à l'éviction ») ET avec le DAG réel (le brut est le seul palier massif ; `mart_eunicoast` + aval sont compacts). Le point de reprise reste garanti.

## 4. Reproductibilité — un registre de leviers, débrayable hors test

L'investigation tranche une question ouverte : **le pipeline citation est déjà pleinement déterministe** (à architecture CPU constante). Sources de non-déterminisme en aval du brut :

- **Aucune**, sauf une théorique : l'entraînement GBDT de `pair_uplift_model`. **Vérifié** : `RANDOM_STATE = 42` fixé en dur (`citation-dagster/.../uplift_model.py:31`), split `GroupKFold` déterministe, pas de subsample/feature-bagging, fit mono-thread (`GradientBoostingRegressor` sklearn séquentiel). Le seul asset qui _entraîne_ un modèle est **verrouillé**.
- Embeddings : inférence ONNX mono-thread, **pas de seed** (déterministe par architecture).
- dbt : `ORDER BY` stables, seuils figés.

**Conséquence pour le cache.** Puisque tout est déterministe, **l'éviction adaptative est sûre** : n'importe quel palier évincé se recalcule **à l'identique**. La crainte « si j'évince un modèle, le recalcul diverge » **ne se matérialise pas**.

**Conséquence pour la directive « reproductibilité débrayable hors test ».** Le pipeline est aujourd'hui _trop_ reproductible : le seed est **gelé en permanence** (`= 42` littéral, non commutable). La directive demande l'inverse — pouvoir **relâcher** le déterminisme hors test. Le plan pose donc un **registre minimal de leviers de déterminisme**, chacun serrable/lâchable :

| Levier                    | Point d'application                                         | Défaut       | Débrayage                                                          |
| ------------------------- | ----------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| Seed GBDT                 | `uplift_model.py:31` (`RANDOM_STATE`)                       | serré (`42`) | exposer en env (pattern `_MAX_TRAIN_LABELS`, `uplift_model.py:40`) |
| Fenêtre d'ingestion       | `raw_snapshot` (`partition:` explicite ignore le watermark) | glissante    | fixer une fenêtre pour un rejeu déterministe                       |
| Sélection « dernier run » | `last_run.py` (récence ModTime)                             | dernier      | pinner un run pour rejeu ciblé                                     |

Le registre est **minuscule et concret** (essentiellement le seed GBDT à exposer). Il réconcilie l'ADR 0052 (débrayable hors test) et l'ADR cluster 0109 (qui excluait le LRU « au nom du déterminisme ») : **le déterminisme du _résultat_ (via seeds serrables) est indépendant de la _présence en cache_ (adaptative)** — un asset évincé recalculé avec le même seed donne le même résultat. L'ADR cluster 0109 devra être **amendé** sur ce point (le « pas de LRU » vaut pour la vérité en test, pas pour le cache chaud en exploitation).

## 5. Éviction adaptative — deux forces : valeur et pression

L'éviction n'est pas pilotée par une seule logique mais par l'**arbitrage de deux forces** :

| Force                          | Décide                                              | Signal                                            |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| **Valeur** (fréquence d'accès) | _quoi_ garder en priorité (le chaud avant le froid) | event log Dagster (matérialisations/lectures)     |
| **Pression** (RAM / disque)    | _combien_ on peut garder, et _quand_ céder          | ressources disponibles vs budget du cache (§5bis) |

La règle : le cache **grossit tant que la pression est basse** (il occupe l'espace libre — un cache vide est du gaspillage), et **évince quand la pression monte**, en choisissant ses victimes par la **valeur** (le plus froid d'abord).

- **Mesurable sans réécrire les assets.** Dagster trace chaque matérialisation (`AssetMaterialization`, event log). Aujourd'hui le pipeline ne l'interroge jamais (aucun `get_run_records`/comptage), mais la fréquence d'accès est lisible via `DagsterInstance` (sensor ou requête externe). Rappel : `run_id` = uuid4 aléatoire → la récence se lit par `ModTime` S3, pas par ordre lexical (ADR 0101).
- **Invariant : `mart_eunicoast` toujours épinglé** (le point de reprise, socle anti-egress), quelles que soient valeur et pression. C'est le seul palier jamais candidat à l'éviction.
- **Débrayage en test** : la politique adaptative est figée (ou le cache vidé) sous un flag, pour des preuves e2e reproductibles.

## 5bis. Budget de ressources — le cache est un bon citoyen (ADR 0107)

Le cache **ne vit pas dans le vide** : il partage RAM et disque avec les autres applications (Dagster, pgvector, les runs eux-mêmes, l'OS). Deux principes, tous deux déclinaisons de l'adaptativité matérielle (ADR cluster 0107, « le volume caché suit le matériel ») :

### Le budget dérive de la machine

Le plafond du cache n'est pas une constante : il **dérive de la classe matérielle déclarée**. La topologie porte déjà les ressources (`resources: {cpu, memory, disk}` dans le modèle nestor) ; le budget du cache s'en déduit — un portable (peu de disque) garde une petite fenêtre, un parc massif garde tout. C'est exactement les « 2 env par classe » de l'audit 2026-07-10 §3 B.1 (une borne de taille + une durée, dérivées de la classe), et ça relie le cache au curseur `persistence.mode` (`full` = budget illimité ; `bounded` = budget fini dérivé de la classe ; `ephemeral` = budget nul).

Les leviers de plafond **existent déjà côté cluster** (câblés en #631) : le **quota de taille** de la StorageClass `bounded` et le **lifecycle S3** (`datalake_bucket_expiration_days`) sont des plafonds de disque. Le plan les relie à un budget cohérent, au lieu de valeurs isolées.

### Ne pas tout squatter — céder sous pression

Le cache ne doit **jamais empêcher les autres applications de fonctionner**. Deux garde-fous :

- **Coussin réservé.** Le cache n'occupe pas 100 % de l'espace libre : il réserve une **marge** (un seuil bas de disque/RAM libre) en dessous duquel il **cesse de grossir** et commence à évincer. L'évinceur « ne s'arme qu'en dessous du quota » (audit §3 B.1) — formulé côté pression : il s'arme **au-dessus** d'un seuil d'occupation, pour ramener sous le coussin.
- **Priorité aux autres.** Sous pression (un run Dagster réclame de la RAM/du disque, pgvector grossit), le cache **cède en premier** — il évince pour libérer, quitte à recalculer plus tard. Le cache est une **optimisation**, jamais une réservation prioritaire : sa place est l'espace _disponible_, pas _réservé_.

Conséquence de conception : l'éviction est **déclenchée par la pression** (métrique de ressource), pas seulement par un TTL fixe. Un TTL/quota statique (`bounded` = 30 j) reste le **plafond haut** ; la pression peut évincer **plus tôt** si la machine sature. Le curseur déclare l'intention (`bounded`), la machine impose le réel (le budget), la pression arbitre l'instant.

Le respect de ce budget doit être **prouvable** (une preuve e2e vérifie que, disque saturé artificiellement, le cache évince au lieu de faire échouer un run concurrent) — c'est le critère « done » de la coopération ressource.

## 6. Substrat — pourquoi pas Redis

Question posée : une base clé-valeur (Redis) battrait-elle l'existant ? **Non**, et l'ADR 0093 (cache-flux CNPG) l'a déjà pesé pour le petit cache. Pour ce cache-ci :

| Niveau                                             | Volume | Substrat        | Redis ?                                              |
| -------------------------------------------------- | ------ | --------------- | ---------------------------------------------------- |
| Brut / download                                    | Tio    | S3/RGW immuable | ❌ (RAM, inadapté aux Tio)                           |
| Paliers agrégés                                    | Go–Mo  | S3 (parquet)    | ⚠️ marginal                                          |
| Index de cache (« quel palier est frais/présent ») | Ko     | **CNPG**        | ⚠️ (Postgres le fait aussi bien, en plus requêtable) |
| Cache-flux (petit JSON, TTL)                       | Ko     | CNPG (ADR 0093) | déjà tranché                                         |

Redis stocke en RAM (coûteuse, ~100× le disque) : cacher des **Tio d'artefacts** y est physiquement absurde. Le contenu (brut, agrégats) va sur **stockage objet** (S3/RGW) ; l'**index de cache** (le manifeste « qu'est-ce qui est chaud/frais ») va sur **CNPG** (déjà au contrat, requêtable, pas de brique de plus). Verdict : **pas de nouvelle brique clé-valeur.**

## 7. Dépendance cluster — la contre-partie de `bounded`

Le versant atlas ne se suffit pas à lui-même : borner l'**écriture** côté atlas (ne pas ingérer au-delà de la fenêtre) n'**évince pas** le brut déjà présent qui sort de la fenêtre. Il faut un mécanisme cluster qui **supprime** le brut ancien :

- **Éviction du brut S3** : un lifecycle S3 `Expiration` sur les buckets RGW (ou un CronJob de purge). Côté cluster, la **variable** est déjà transmise (`datalake_bucket_expiration_days`, câblée en #631) mais le **mécanisme n'est pas construit** — à tracer en issue cluster.
- **Pull-through cache de download** (§2.2) : potentiellement une **brique cluster** (un proxy médiatisant l'egress vers GDELT/OpenAlex, servant depuis S3 si présent). C'est la première vraie « nouvelle brique » de cette réflexion — ADR + issue cluster dédiés.

Le plan **signale** ces dépendances croisées ; leur construction est du ressort du dépôt cluster.

## 8. Asymétrie des trois code-locations

Les trois pipelines ne se traitent **pas** uniformément (constat d'exploration) :

|                        | citation                                                            | mediawatch                                                | pageviews                                          |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Palier maître          | `mart_eunicoast`                                                    | (à identifier — `raw_gkg` projetée ?)                     | (à identifier)                                     |
| Source externe         | OpenAlex (mensuel)                                                  | **GDELT (15 min, re-tape)**                               | Wikimedia (mensuel)                                |
| Bornes d'ingestion     | `RawSnapshotConfig` : `sample_size`/`max_partitions` (`0`=illimité) | `RawNativeGkgConfig` : `max_files` (défaut **8** = borné) | `RawPageviewsConfig` : `max_months` (`0`=illimité) |
| Câblage env→run_config | **OUI** (`_ingest_run_config`, `definitions.py:371-400`)            | **NON** (config Dagster, pas d'env)                       | **NON**                                            |
| Polarité de défaut     | illimité (prod-complet)                                             | **borné (8)** — inverse                                   | illimité                                           |

Conséquences pour le plan :

- **citation** a déjà l'infrastructure « env d'instance → run_config » : `persistence_mode` s'y greffe naturellement (préréglage des bornes existantes).
- **mediawatch/pageviews** ont des bornes en config Dagster **mais aucun câblage env→config** : y ajouter un mode exige d'abord de **créer** ce câblage (l'équivalent de `_ingest_run_config`).
- Les **polarités divergent** (mediawatch borné par défaut ; citation/pageviews illimités) : un mode uniforme doit **harmoniser** cette sémantique, ou la respecter par code-location.
- **GDELT (mediawatch)** est le point chaud du **cache de download** — traité en priorité côté §2.2.

## 9. Transport `persistence.mode` cluster → atlas — deux voies

`persistence_mode` circule déjà côté cluster via `derive_run_params` (câblé #631). Reste à choisir comment il atteint le pipeline atlas :

- **Voie A — env/overlay (minimale, alignée sur l'existant).** Ajouter `CITATION_INGEST_PERSISTENCE_MODE` (et équivalents) mappé dans `_ingest_run_config` (`definitions.py:371-400`), **traduit** en valeurs `sample_size`/`max_partitions`. Le mode = **préréglage des bornes existantes**. Aucun changement de `contractVersion`.
- **Voie B — contrat montant.** Ajouter un champ dans `code-location.manifest.yaml` (bloc `runParams:`/`persistence:`), **impose un bump `contractVersion`** (aujourd'hui `"1.0"` pour les trois) et une évolution du contrat cluster↔atlas (ADR cluster 0043/0094). Plus lourd, mais explicite et validé par cluster.

**Recommandation du plan** : **Voie A** pour l'ingestion (aligne sur le mécanisme actuel, le mode n'est qu'un préréglage), en **notant** que si le cache devient un paramètre que cluster doit _valider_ (pas seulement transmettre), la Voie B et son bump `contractVersion` deviennent nécessaires. À trancher dans l'ADR.

## 10. Reproductibilité des preuves e2e

`bounded` doit rester **éprouvable** malgré son adaptativité. La séparation §4 le permet : une preuve fixe les **leviers de calcul** (seed, fenêtre, run pinné) → résultat déterministe, indépendamment de ce que le cache a gardé chaud. Les preuves e2e :

- vident (ou figent) le cache adaptatif sous le flag de test ;
- fixent le seed et la fenêtre ;
- vérifient que `mart_eunicoast` évincé se recalcule à l'identique (byte-égalité du parquet, dédup à ordre total déjà déterministe).

## Phasage — le socle simple d'abord, le sophistiqué seulement si le besoin se mesure

**Principe de sobriété (ADR 0093, ADR 0061).** Les sections 2 à 5bis décrivent la **vision complète** ; le phasage la **découpe honnêtement** en un **socle essentiel** (phases 0–2, qui résout le vrai problème en s'appuyant presque entièrement sur l'existant) et des **raffinements optionnels** (phases 3–5, à n'ouvrir **que si** une mesure le justifie). Le socle est **suffisant en soi** : on peut s'arrêter après la phase 2 avec un système cohérent. Aucun raffinement n'est un prérequis d'un autre. Ne pas construire par anticipation ce qu'aucun besoin mesuré ne réclame.

### Socle essentiel (résout le vrai problème, ancré dans l'existant)

- **Phase 0 — ADR atlas de réaction applicative.** Acter l'architecture **minimale** : le curseur pilote les bornes d'ingestion existantes ; `full` neutre à l'octet ; substrat S3+CNPG (pas de Redis) ; voie de transport A (env). Documenter la vision (paliers, éviction, budget) comme **cadre**, en marquant explicitement ce qui est socle vs horizon. Amender l'ADR cluster 0109 (LRU permis hors test) **seulement si** on décide d'aller jusqu'à l'éviction par fréquence (sinon inutile). **Aucun code avant cet ADR.** Prochain numéro ADR atlas libre : 0102.
- **Phase 1 — citation : brancher `persistence_mode` sur les bornes existantes.** Voie A : `CITATION_INGEST_PERSISTENCE_MODE` → préréglage des `sample_size`/`max_partitions` **déjà là**. `full` = comportement actuel à l'octet. Épingler `mart_eunicoast`. **~1 mapping d'env, zéro mécanisme nouveau.**
- **Phase 2 — ne pas re-télécharger : ~~check « déjà en S3 » avant download~~ → RENVOYÉE EN ISSUE.** Le point chaud (GDELT re-tape en boucle) reste réel, mais la reconnaissance a montré que le check trivial est **faux** (`run=<run_id>` dans la clé + `raw_gkg` lit strictement le run courant, cf. révision §2.2). Le remède correct — `rclone copyto` **S3→S3** d'un `run=` antérieur vers le run courant — n'est **pas** un check ~10 lignes et sort du socle sobre : **issue `mediawatch` dédiée**, non livrée ici.

**Le socle s'arrête ici et tient debout** : le curseur réagit, le re-download est coupé, le vieux brut expire via le lifecycle S3 **déjà câblé** (#631). Suffisant pour la majorité des besoins.

### Raffinements — seulement si mesurés (ne pas ouvrir par défaut)

- **Phase 3 (si le disque sature) — quota + expiration.** Un plafond de taille du cache + suppression du plus vieux au dépassement (FIFO par âge, pas de scoring). Trivial. À n'ouvrir que si une machine contrainte (portable, HDD-only) le réclame réellement.
- **Phase 4 (si l'usage le justifie) — éviction par fréquence + coussin de ressources.** L'éviction « à deux forces » (§5, §5bis) : garder le chaud (event log Dagster), céder sous pression. **À ne construire que si l'on MESURE** qu'un scoring par fréquence apporte plus qu'un simple FIFO — sinon c'est de l'optimisation prématurée. Le registre de déterminisme (exposer `RANDOM_STATE` en env) n'est requis **que** si l'on va jusque-là (le cache adaptatif suppose le débrayage test).
- **Phase 5 (si le socle ne suffit pas) — brique cluster.** Pull-through cache mutualisé (proxy d'egress) et/ou lifecycle S3 d'éviction actif du brut. À n'envisager **que si** le check S3 côté atlas (phase 2) se révèle insuffisant (ex. plusieurs code-locations partageant le même cache de source). Chantiers cluster distincts, tracés en issues cluster — **pas** présumés nécessaires.
- **mediawatch/pageviews** : le câblage env→config manquant + l'harmonisation des polarités (§8) suivent le même découpage — socle (brancher le mode) d'abord, raffinements ensuite, par code-location selon le besoin.

## Critères de fin de plan

Le **socle** (phases 0–2) est terminé quand : l'ADR atlas est acté, citation réagit au curseur (`full` neutre à l'octet, prouvé), et le re-download GDELT est coupé (check S3 prouvé au banc). **C'est le critère de succès minimal.** Les raffinements (phases 3–5) sont terminés au cas par cas — chacun ouvert par une mesure de besoin, clos par une PR ou une décision de non-action documentée (ADR). Ne pas considérer le plan « inachevé » parce que les raffinements ne sont pas faits : ils sont **conditionnels**, pas dus.
