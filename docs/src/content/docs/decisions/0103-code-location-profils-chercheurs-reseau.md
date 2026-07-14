---
title: "0103 — Code-location « profils de chercheurs d'un réseau » : ingestion en deux passes et cache du brut pré-filtré"
---

## Contexte

Le pipeline `citation` (code-location Dagster existante) produit un **mart EUNICoast**
(les works à ≥1 affiliation d'un des 14 établissements du réseau EUNICoast, depuis 2016)
et sert un modèle d'**uplift FWCI** (_Field-Weighted Citation Impact_, l'impact de
citation normalisé par champ que calcule OpenAlex) et de **recommandation de paires** de
collaboration ([ADR 0067](/atlas/decisions/), [ADR 0105](/atlas/decisions/)). Sa logique
de sélection est **mono-passe** : un work entre dans le périmètre **si et seulement si** il
porte une affiliation EUNICoast directe.

Un **besoin distinct** émerge : décrire l'**alliance EUNICoast comme un réseau de
chercheurs**. Non pas « quels works sont affiliés EUNICoast », mais « qui sont les
chercheurs de l'alliance, et quel est le profil thématique de chacun sur **toute** sa
production récente » — y compris ses articles écrits hors d'un établissement EUNICoast. Ce
produit répond à une autre question (cartographier les compétences d'un réseau) que
l'uplift de `citation` (prédire l'impact d'une collaboration), et son **algorithme de
sélection diffère** : il faut d'abord **identifier** les chercheurs (via l'affiliation),
puis **ré-élargir** aux works où ils co-signent sans affiliation EUNICoast. C'est une
sélection en **deux passes**, que la logique mono-passe de `citation` ne porte pas sans se
dénaturer.

Trois contraintes du dépôt cadrent la réponse :

- **Neutralité de domaine** ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/),
  [ADR 0022](/atlas/decisions/0022-naming-convention/)) : aucune marque (`EUNICoast`) dans
  un identifiant (nom de code-location, bucket, namespace). La marque reste **en
  description**.
- **Pas de code Python partagé entre code-locations**
  ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) : chaque `*-dagster` est
  autonome, hors du graphe pnpm. Réutiliser du code de `citation` se fait par **copie
  locale**, jamais par import.
- **Le curseur `persistence.mode`**
  ([ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md),
  `∈ {full, bounded, ephemeral}`) doit être **respecté** par tout pipeline applicatif — ce
  que fait déjà `citation` par un préréglage de bornes ([ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/)).

## Décision

> **Créer une NOUVELLE code-location Dagster, `scholar-network-dagster`, autonome et
> disjointe de `citation`, qui identifie les chercheurs d'un réseau d'établissements par
> une ingestion EN DEUX PASSES sur un BRUT PRÉ-FILTRÉ, puis profile chaque chercheur par
> un embedding sémantique de sa production. Le curseur `persistence.mode` y pilote un
> CACHE du brut pré-filtré — pas une borne de volume.**

`scholar-network` (« réseau de chercheurs par affiliation ») est un identifiant **neutre**
dérivé du produit ; EUNICoast (les 14 ROR — _Research Organization Registry_, l'identifiant
mondial d'un établissement) reste en description et en donnée (le référentiel des ROR).

### 1. Ingestion en deux passes, recompute intégral mensuel

Le pipeline **abandonne le watermark** (le filigrane incrémental de `citation`) : il
**repart de zéro à chaque run** (cadence mensuelle, valeur d'instance). Raison — un run
incrémental est **incorrect** ici : la passe 2 dépend de l'ensemble des chercheurs, qui
n'est **pas monotone** dans le temps de publication (un nouveau chercheur découvert au run
N+1 a des articles **anciens**, hors du delta récent, que la passe 2 doit pourtant
récupérer). Un delta simple les manquerait. Le recompute intégral est **déterministe**
([ADR 0057](/atlas/decisions/)) et se raisonne sans état inter-run. Prix payé : chaque run
recalcule tout — acceptable car le coût dominant (le balayage du lac) est adressé par le
cache (§3), pas par l'incrémental.

Trois niveaux de filtrage :

0. **Brut OpenAlex** (la source, ~250 M works) : **jamais persisté**.
1. **Brut pré-filtré** — les works `publication_year ≥ 2016 ∧ type = 'article'` (`type`
   strict = le champ `work.type` d'OpenAlex), **projetés** aux seules colonnes utiles (`id`,
   `publication_year`, `type`, `title`, `authorships`, `topics`, `keywords`, `fwci`,
   `cited_by_count`, `updated_date` — jamais `abstract_inverted_index` ni
   `referenced_works`, lourds). C'est le **prédicat commun aux deux passes** : ni la passe 1
   ni la passe 2 ne le remettent en cause. Le produire coûte **un balayage complet du lac**.
2. **Passe 1 — identification.** Sur le brut pré-filtré, garder les works à ≥1 affiliation
   EUNICoast (`list_has_any` des ROR sur `authorships[].institutions[].ror`), en extraire la
   **table des chercheurs** : les `authorships[].author.id` affiliés EUNICoast.
3. **Passe 2 — élargissement.** Sur le brut pré-filtré, garder les works dont ≥1 co-auteur
   est dans la table des chercheurs (**semi-jointure** par hachage, la table ~10⁴–10⁵ ids
   tient en mémoire). Résultat : **tous les articles ≥2016 de ces chercheurs**, y compris
   ceux écrits hors d'un établissement EUNICoast (« un chercheur identifié appartient au
   réseau ; on décrit toute sa production récente »).

**Alternative écartée** — s'arrêter à la passe 1 (le périmètre de `citation`) : elle décrit
les works de l'alliance, pas ses chercheurs dans leur activité entière. Le produit voulu
est le réseau de chercheurs, donc la passe 2 est constitutive, pas optionnelle.

### 2. Profil de chercheur par embedding sémantique

Pour chaque chercheur (author_id), un **vecteur de profil** : moyenne **non pondérée** des
embeddings de ses articles du **périmètre final** (post-passe-2), puis une normalisation L2.
L'embedding d'un article = le vecteur (384) du modèle `all-MiniLM-L6-v2` (ONNX quantifié,
figé dans l'image) appliqué au texte thématique de l'article (labels des topics de score
≥ 0,3 + labels des keywords) — **parité stricte** avec le mécanisme de `citation`
(`embedding.py`, copié localement). Stockage : **pgvector** (l'extension vectorielle de
Postgres/CNPG), pour la recherche de similarité entre chercheurs.

Différence avec `citation` — même code d'embedding, mais **périmètre différent** : le profil
voit **toute** la production récente du chercheur (post-passe-2), là où `citation` ne voit
que le noyau EUNICoast. Le vecteur produit est donc distinct : c'est un produit à part
entière, ce qui justifie la code-location séparée plutôt qu'un asset greffé sur `citation`.

**Alternative écartée** — embedder le titre/abstract (contenu textuel réel) plutôt que les
topics/keywords : plus riche, mais `abstract_inverted_index` est une colonne lourde exclue
du brut pré-filtré projeté, moins déterministe, et diverge du mécanisme éprouvé de
`citation`. On reste sur le contenu thématique.

### 3. `persistence.mode` = un CACHE du brut pré-filtré (pas une borne)

Le terme `persistence` du curseur cluster est, **pour cette code-location, un abus** : ce
qui varie avec le mode n'est pas une rétention de données produites mais la **conservation
d'un intermédiaire recalculable** — un **cache**. L'intermédiaire coûteux est le **brut
pré-filtré** (§1.1) : le reconstruire exige un balayage du lac. Le curseur choisit
**combien de temps** on le garde :

| Mode        | Rétention du brut pré-filtré                         | Balayages du lac par run                                  |
| ----------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `full`      | persisté sur S3 **entre les runs** (Parquet projeté) | run suivant relit le cache S3, **0** balayage source neuf |
| `bounded`   | **le temps du run** (cache intra-run, purgé en fin)  | **1** (partagé par passe 1 et passe 2)                    |
| `ephemeral` | **jamais matérialisé**                               | jusqu'à **2** (chaque passe reconstitue du lac)           |

Le mode est **purement une optimisation d'egress/stockage** : la **correction ne dépend
jamais du mode** (recompute intégral, résultat identique). `full` est le mode le plus
conservateur (garde le cache) = **fail-safe**, cohérent avec la doctrine cluster (`full` =
défaut). L'**entrée** reste le curseur `persistence.mode` (transport par variable d'env,
Voie A [ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/)) ; le
**vocabulaire interne** (code, doc, variable) dit « cache » pour ne pas mentir sur ce que le
mécanisme fait.

**Alternative écartée** — persister le **brut OpenAlex complet** en `full` (l'idée initiale)
: inutilement volumineux (~3 Tio) alors que le brut pré-filtré projeté suffit à réalimenter
les deux passes. On cache le pré-filtré, pas la source.

### 4. Autonomie et frontière

`scholar-network-dagster` est une code-location **autonome** : son propre bucket S3
(`scholar-network-datalake`), sa propre base logique pgvector, son manifeste montant
(`code-location.manifest.yaml`), son overlay kustomize et son `Application` Argo CD (atlas
instancie, [ADR cluster 0111](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0111-atlas-instancie-application-argocd.md)).
`citation` reste **inchangé**. Le code réutilisé de `citation` (filtre DuckDB, embedding,
chargement pgvector, gabarit de déploiement) est **copié**, jamais importé (ADR 0055). Ce
nouveau point de contact cluster↔atlas (un bucket, une base, un manifeste de plus) est
recensé au [contrat d'interface (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/)
dans la même PR que la création de la code-location (garde-fou « même PR »).

## Conséquences

- **Un produit neuf, un pipeline neuf** : le réseau de chercheurs est servi indépendamment
  de l'uplift `citation`. Deux code-locations coexistent, sans couplage de code.
- **Coût de calcul régulier** : le recompute intégral mensuel + le double balayage possible
  (`ephemeral`) sont assumés ; le cache `full`/`bounded` les amortit. Le dimensionnement
  réel (taille du brut pré-filtré, de la table chercheurs, du périmètre final) est mesuré à
  l'implémentation, pas figé ici.
- **Duplication assumée** (ADR 0055) : `_filter_sql`, `embedding.py`, `index_load` et le
  gabarit `deploy/` existent en double avec `citation`. C'est le prix de l'autonomie des
  code-locations ; un test anti-drift garde la liste des ROR alignée sur le seed dbt, comme
  `citation`.
- **Le vocabulaire « cache »** diverge du terme cluster `persistence.mode` : documenté ici
  pour lever l'ambiguïté ; l'interface descendante reste le curseur cluster.
- **Découpage** : la réalisation suit le plan `2026-07-13-scholar-network` en **5 lots**
  (squelette → brut pré-filtré + cache → passe 1 → passe 2 → profils/pgvector), suivis dans
  une **issue unique** (#632), chaque lot faisant l'objet d'une PR séparée.

## Statut

Proposed (2026-07-13). Décline le besoin « cartographier le réseau de chercheurs EUNICoast »
distinct de l'uplift `citation` ([ADR 0067](/atlas/decisions/)). Respecte
[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)/[ADR 0022](/atlas/decisions/0022-naming-convention/)
(neutralité), [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (autonomie des
code-locations), [ADR 0057](/atlas/decisions/) (déterminisme). Consomme le curseur
[ADR cluster 0109](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0109-persistance-declarative-topologie.md)
via la Voie A d'[ADR 0102](/atlas/decisions/0102-cache-adaptatif-reaction-persistence-mode/).
Conception : plan [2026-07-13](/atlas/plans/2026-07-13-scholar-network/). Ne supersede aucun
ADR. `citation` inchangé.
