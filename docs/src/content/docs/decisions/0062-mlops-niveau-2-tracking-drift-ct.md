---
title: "0062 — MLOps niveau 1→2 : suivi de modèles (MLflow), détection de dérive (Evidently), réentraînement déclenché, et clôture Dagster vs Airflow"
---

## Contexte

Le pipeline de citations industrialise déjà une partie du cycle de vie du modèle
d'**embedding** (vecteur de nombres qui représente un texte pour le comparer à
d'autres). L'asset Dagster `researcher_embeddings` — un asset Dagster est une donnée
nommée que l'orchestrateur produit et suit
([ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)) — calcule, en
Python natif (`onnxruntime`, le moteur d'exécution de modèles au format ONNX, en
mono-thread, déterministe, parité stricte avec le code TypeScript), un `vector(384)`
par publication puis l'agrège par chercheur ; la provenance du modèle est figée par
`scripts/fetch_model.py`, qui épingle `all-MiniLM-L6-v2` à une révision HuggingFace
par commit hash et vérifie chaque fichier par `sha256`, le modèle étant cuit dans
l'image (zéro réseau au runtime,
[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)). Le vecteur
produit passe un **asset check Great Expectations bloquant** — un asset check est un
contrôle de qualité rattaché à un asset Dagster, qui passe ou bloque la production —
(`ge_researcher_vectors`) et émet du **lineage** (traçabilité des dépendances entre
données) OpenLineage→Marquez ; l'index kNN est chargé dans Postgres/pgvector par
`index_load` ([ADR 0058](/atlas/decisions/0058-report-index-load/)), contrat
Parquet+`manifest.json` validé avant chargement.

Mesuré à l'aune des pratiques MLOps (industrialisation du cycle de vie des modèles
d'apprentissage automatique) attendues sur le marché, cet existant tient le
**niveau 1** d'un modèle de maturité MLOps répandu (celui de Google et de Microsoft,
qui gradue de 0 — tout manuel — à 2 — pipeline d'entraînement automatisé de bout en
bout) : pipeline reproductible, qualité enforcée, lineage. Trois briques du
**niveau 2** manquent, et elles sont identifiées sans ambiguïté :

- **Suivi de modèles & registre.** Absent. Le « registre » — un registre de modèles
  (_model registry_) est un catalogue versionné des modèles et de leurs métadonnées —
  se résume aujourd'hui à un `sha256` dans un script. Aucun historique de runs
  d'entraînement/calcul, aucun enregistrement versionné du modèle avec ses paramètres
  et métriques.
- **Détection de dérive (drift).** Absente. La dérive (_drift_) est l'écart, dans le
  temps, entre la distribution des données observées et celle de référence. Rien ne
  mesure la dérive des embeddings entre deux snapshots OpenAlex successifs (un
  snapshot est une copie figée et datée du jeu de données ; OpenAlex est une base
  ouverte de la littérature académique) ; une dégradation de la distribution
  vectorielle passerait inaperçue jusqu'à ce qu'un consommateur s'en plaigne.
- **Réentraînement / entraînement continu (CT) déclenché.** Le CT (_continuous
  training_) est le réentraînement automatique du modèle quand de nouvelles données
  arrivent. Le `transform_job` existe (`define_asset_job` dans `definitions.py`) mais
  **sans `@schedule` ni `@sensor`** — décorateurs Dagster qui déclenchent un job
  respectivement sur un calendrier (`@schedule`) ou sur un événement détecté
  (`@sensor`) — : son re-déclenchement est aujourd'hui à 100 % manuel.

### Une confusion à lever d'abord : Dagster vs Airflow

Avant de combler ces écarts, une question récurrente doit être tranchée
formellement : faut-il **ajouter Airflow** à côté de Dagster ? Non. Airflow et
Dagster occupent **la même case** — l'orchestration de pipelines — et sont des
**alternatives mutuellement exclusives**, pas des couches à empiler. Dagster est
**asset-centric** : il modélise les **données produites** et en déduit le DAG et le
lineage, ce qui colle exactement au livrable du dépôt — un contrat de données
**Parquet + `manifest.json`** ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/),
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)). Le choix
Dagster est déjà fait et cohérent. **Empiler Airflow dans `atlas` serait du travail
jeté** : cela ne ferme aucun écart de marché (l'orchestration est déjà couverte) et
introduirait un doublon d'outillage. La nuance — un démonstrateur Airflow **autonome,
hors `atlas`** — relève d'un signal de CV séparé, jamais d'un ajout dans ce dépôt.

### La frontière `atlas`/`cluster` s'applique au suivi de modèles

Le suivi de modèles introduit un **service stateful** (qui conserve un état
persistant) : un serveur avec un **backend store** (la base qui stocke runs,
paramètres et métriques) et un **artefact store** (le dépôt objet qui stocke les
fichiers produits — modèles, graphiques). Le [contrat d'interface](/atlas/decisions/0033-contrat-interface-cluster/)
impose de répartir ce besoin selon sa nature : le **serveur** est de
l'infrastructure (côté `cluster`), l'**instrumentation** est applicative (côté
`atlas`). Le précédent est exact : **Dagster a deux ADR** — un côté `cluster` pour le
déploiement de l'orchestrateur, un côté `atlas` ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/))
pour la code-location. Le suivi de modèles doit reproduire ce patron.

## Décision

> **Le dépôt fait passer le MLOps du niveau 1 au niveau 2 par trois ajouts
> *applicatifs* — instrumentation MLflow (plateforme open source de suivi
> d'expériences et de registre de modèles : suivi de runs + enregistrement du modèle
> au registre), détection de dérive Evidently (bibliothèque Python open source de
> mesure de dérive de données et de modèles) en asset check, et réentraînement
> déclenché par un `@schedule` Dagster — ; le **serveur** MLflow relève d'un ADR
> `cluster` séparé. Et il **clôt** la question Dagster-vs-Airflow : pas d'Airflow dans
> `atlas`.**

### Ce qui est applicatif (dans `atlas`)

- **Instrumentation MLflow.** Le calcul d'embeddings (`researcher_embeddings` et le
  futur enchaînement de transformation) **logue ses runs** dans MLflow — paramètres
  (révision HuggingFace épinglée, `sha256` du modèle, seuils de texte, dimension 384),
  métriques (effectifs `work_vectors`/`author_vectors`, indicateurs de dérive) et
  **enregistre le modèle au registre** MLflow. Le `sha256` du script reste la source
  de vérité de la **provenance** ; MLflow lui ajoute l'**historique** (quel modèle, sur
  quel snapshot, avec quelles métriques) et un **registre versionné** — il ne le
  remplace pas. L'instrumentation est du **code Python dans les assets Dagster**, donc
  dans `dataops/` ([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)).
- **Détection de dérive (Evidently).** Un **asset check applicatif**, à côté des suites
  Great Expectations existantes, mesure la dérive de la distribution des embeddings
  entre snapshots. Comme les autres checks, il est **rattaché à l'asset** qui produit le
  vecteur et **consigne son verdict** ; le caractère **bloquant ou non** d'un drift
  relève d'un seuil de **configuration de l'instance**, pas du code générique
  ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)). Le dépôt **fournit
  la mesure** ; le déployeur décide du seuil et de la suite à donner.
- **Réentraînement / CT déclenché.** Un `@schedule` Dagster (et, si une dépendance
  d'amont le justifie, un `@sensor`) est ajouté dans `definitions.py` pour
  **déclencher** le job de transformation sans intervention humaine. Le dépôt **permet**
  la cadence ; **activer** le schedule et fixer sa fréquence relève du **déployeur** —
  le code n'impose pas un rythme de réentraînement à l'établissement qui l'exploite.

### Ce qui est infrastructure (dans `cluster`, ADR séparé)

Le **serveur MLflow** — tracking server, **backend store sur CloudNativePG**
(opérateur Kubernetes qui gère un PostgreSQL en haute disponibilité, abrégé CNPG),
**artefact store sur un bucket S3 Ceph** — est un service stateful. Son déploiement,
son exposition et son observabilité font l'objet d'un **ADR `cluster` dédié**, exactement
comme l'orchestrateur Dagster et le collecteur Marquez sont déployés côté `cluster`. Cet
ADR-ci **ne décrit pas** ce déploiement ; il **acte le nouveau point de contact** et
**amende l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)** (voir
ci-dessous), conformément à la règle « tout changement d'un point de contact se reflète
dans la même PR ».

### Nouveau point de contact : « Suivi de modèles »

Le contrat d'interface gagne une ligne : **Suivi de modèles — un serveur MLflow
joignable via `MLFLOW_TRACKING_URI`, backend store CloudNativePG, artefact store sur le
bucket S3 (convention `citation`, [ADR 0022](/atlas/decisions/0022-naming-convention/))**.
L'application **logue et enregistre** ; le cluster **fournit et garantit la durabilité**
du serveur et de ses deux stores.

## Statut

Accepted (2026-06-15). **Amende** l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(nouveau point de contact « Suivi de modèles »). **Complète** l'[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)
(l'instrumentation MLflow, l'asset check Evidently et le `@schedule` sont du code
`dataops/` Python) et l'[ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)
(le modèle dont on suit les runs est celui de `researcher_embeddings`). S'appuie sur
l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) (provenance figée
par révision + `sha256`) sans la contredire. **Clôt** la question Dagster-vs-Airflow :
aucun ADR n'introduit Airflow dans `atlas`. Le **déploiement du serveur MLflow** relève
d'un ADR `cluster` séparé (à publier dans le dépôt `cluster`, sur le patron des ADR
Dagster/Marquez côté infrastructure).

## Conséquences

**Bénéfices.**

- Le MLOps atteint le **niveau 2** : l'historique des calculs d'embeddings devient
  **traçable et versionné** (runs + registre MLflow), la **dérive est mesurée** entre
  snapshots, et le réentraînement est **déclenchable automatiquement**.
- La répartition `atlas`/`cluster` **réutilise un patron éprouvé** (Dagster, Marquez) :
  serveur côté infrastructure, instrumentation côté application — pas de service stateful
  qui fuite dans `atlas`.
- La question Airflow est **close par écrit** : plus de re-débat, plus de risque
  d'empiler un orchestrateur en doublon.
- Le contrat d'interface reste **la source de vérité unique** : le nouveau point de
  contact y est inscrit, joignable par une seule variable (`MLFLOW_TRACKING_URI`).

**Prix à payer.**

- Un **service stateful de plus** à déployer et exploiter côté `cluster` (serveur MLflow
  - ses deux stores) — coût porté par l'infrastructure, hors de ce dépôt.
- Trois **dépendances Python** nouvelles dans `dataops/` (client MLflow, Evidently, et le
  schedule Dagster), soumises aux **mêmes exigences de qualité** que le reste de la
  catégorie (ruff, pytest, couverture à seuil, [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)).
- Le dépôt **permet** le suivi, la dérive et le CT, mais ne **garantit** rien à la place
  du déployeur : sans serveur MLflow joignable, l'instrumentation doit **dégrader
  proprement** (no-op si `MLFLOW_TRACKING_URI` absent, sur le modèle du lineage Marquez) ;
  sans schedule activé, le réentraînement reste manuel.

**Garde-fous.**

- **Frontière respectée** : le serveur MLflow ne vit **pas** dans `atlas` (aucun
  manifeste d'infrastructure ici, [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) ;
  l'instrumentation, l'asset check Evidently et le `@schedule` ne vivent **pas** dans
  `cluster`.
- **Amendement dans la même PR** : la ligne « Suivi de modèles » est ajoutée à
  l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) en même temps que le
  code d'instrumentation — le contrat ne périme pas.
- **Capacité, pas décision** : le seuil de dérive et la fréquence du `@schedule` sont de
  la **configuration d'instance**, jamais codés en dur ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)).
- **Dégradation propre hors serveur** : l'instrumentation MLflow est un **no-op** si
  `MLFLOW_TRACKING_URI` n'est pas fourni, comme le lineage est un no-op sans
  `OPENLINEAGE_URL` — la code-location reste chargeable et exécutable sans le serveur.
- **Provenance inchangée** : MLflow **ajoute** un historique et un registre ; il ne
  remplace **pas** l'épinglage par révision + `sha256` du modèle
  ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)), qui reste la
  source de vérité de la reproductibilité.
- **Pas d'Airflow dans `atlas`** : tout besoin d'orchestration passe par Dagster ; un
  démonstrateur Airflow éventuel reste **hors de ce dépôt**.
- **Nommage** `citation`, jamais une marque, dans tout identifiant partagé
  ([ADR 0022](/atlas/decisions/0022-naming-convention/)) : bucket de l'artefact store,
  base du backend store.
