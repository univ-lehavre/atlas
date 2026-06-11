---
title: Topologie des dépôts cluster & atlas — décision et plan transverse 2026-06-11
---

> Date du plan : 2026-06-11. Plan **transverse** (couvre `atlas` ET `cluster`) — déposé côté applicatif conformément à la frontière [ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md) (« un plan-maître transverse reste côté applicatif ; sa phase _socle_ référence le dépôt cluster »). Méthode : analyse multi-agents avec lecture réelle du code des deux dépôts (cartographie 6 dimensions → 5 architectures-cibles → panel de notation → vérification adversariale par 3 sceptiques indépendants).

## Contexte

### Les deux dépôts

Le travail se répartit aujourd'hui sur **deux dépôts Git distincts** sous l'organisation `univ-lehavre`, fortement intriqués mais à responsabilités séparées :

| Dépôt                                                | Rôle                                                                                                                           | Pile technique                                         | Chaîne de doc                  | ADR                                        | DOI Zenodo                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------ | ------------------------------------------ | ------------------------- |
| [`cluster`](https://github.com/univ-lehavre/cluster) | **Socle d'infrastructure** générique : Kubernetes, stockage Ceph, plateforme DataOps (Dagster, Marquez), provisioning          | Ansible, OpenTofu, manifestes K8s ; Python d'outillage | VitePress (`docs/.vitepress/`) | `docs/decisions/`, 52 ADR                  | `10.5281/zenodo.20287209` |
| [`atlas`](https://github.com/univ-lehavre/atlas)     | **Applicatif / métier** : monorepo de projets (apps SvelteKit, paquets TS, services Hono, CLI) + `dataops/` (pipelines Python) | Node / pnpm / Turborepo ; Python (uv) pour dataops     | Astro / Starlight (`docs/`)    | `docs/src/content/docs/decisions/`, 57 ADR | `10.5281/zenodo.18310357` |

La frontière entre les deux est **conçue, pas accidentelle** : posée par l'[ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md) (le métier vit dans `atlas`, jamais dans `cluster` ; le socle n'expose que des valeurs d'exemple génériques) et formalisée par l'[ADR cluster 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md) — un **contrat d'interface machine-lisible** (`cluster/contract/*.example.yaml`) que `cluster` publie vers `atlas`, en sens unique.

### Ce qui a déclenché la réflexion

Trois contenus vivent en apparence « à cheval » sur les deux dépôts, d'où la question de la topologie :

- **ADR** — chaque dépôt tient sa propre série numérotée (`0001…`), si bien qu'un même numéro désigne deux décisions sans rapport (`0033` = _Orchestration Ansible DataOps_ côté cluster, _Contrat d'interface_ côté atlas). Plusieurs ADR parlent explicitement de l'autre dépôt ou de la frontière (cluster 0023/0041/0042/0043/0046, atlas 0033/0055/0056).
- **Drifts** — un registre de dérives indexé et rendu, dont la discipline (ADR cluster 0046, atlas 0056) veut qu'un drift soit **corrigé dans le code et consigné dans la même PR**.
- **Python / dataops** — l'arrivée du Python dans `atlas` (`dataops/citation-dagster`, `dataops/citation-dbt`) alors que la _plateforme_ DataOps (Dagster, Marquez) vit, elle, dans `cluster`.

### La question posée

> Faut-il **fusionner** `cluster` et `atlas` en un seul dépôt ? Créer un **3ᵉ dépôt dédié à la documentation** (ADR + drifts + guides) ? Le fait que dataops amène du Python dans `atlas` justifie-t-il un **dépôt Python dédié** ? Ou faut-il **garder et durcir** la séparation actuelle ?

Le présent document tranche ces quatre options et en tire une feuille de route.

## Décision

**Garder DEUX dépôts. Ne pas fusionner `cluster` et `atlas`. Ne pas créer de 3ᵉ dépôt « documentation ». Ne pas extraire de dépôt « Python/dataops » — pour l'instant.**

On adopte le **statu quo renforcé** : la frontière `cluster ↔ atlas` n'est pas subie, elle est **outillée** là où elle est aujourd'hui tenue à la main.

Classement des cinq options évaluées (somme des notes d'un panel à 4 lentilles — coût/réversibilité, couplage/frontière, gouvernance académique, expérience développeur — sur 40, + note minimale) :

| Rang | Option                                                  | Score /40 | Note min | Verdict                                                                                                |
| ---- | ------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------ |
| 1    | **Statu quo renforcé** (2 dépôts, frontière outillée)   | **31**    | **7**    | ✅ Retenue — seule sans verdict < 7, seule pleinement réversible                                       |
| 2    | Hybride (2 dépôts + paquet d'outillage partagé extrait) | 25        | 5        | ❌ Le mini-dépôt partagé sort la source de vérité hors du périmètre des DOI                            |
| 3    | Dépôt Python/dataops dédié                              | 20        | 3        | ❌ Prématuré ; couplage du Python pointe à 100 % vers cluster                                          |
| 4    | Dépôt documentation dédié                               | 17        | 4        | ❌ La doc atlas est générée depuis le code ; le registre de drifts doit naître dans la PR du correctif |
| 5    | Monorepo unique (fusion)                                | 13        | 2        | ❌ Coût élevé, partiellement irréversible, casse un DOI                                                |

## Pourquoi — par les faits, pas par principe

### Le couplage réel est de _déploiement_, pas de _code_

- **Zéro import croisé** TypeScript ↔ Python, **zéro dépendance pip commune** (vérifié).
- `atlas/dataops/citation-dagster` consomme `cluster` uniquement par **variables d'environnement et noms de Service** (FQDN `*.svc.cluster.local`, `BUCKET_HOST` / `BUCKET_PORT` / `BUCKET_NAME`, `AWS_ACCESS_KEY_ID`), jamais la structure interne des manifestes.
- C'est la **signature canonique d'une frontière saine**. Fusionner ne supprimerait aucun import — il n'y en a pas.

### La frontière est une décision, réaffirmée quatre fois

- [ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md) (métier ↔ socle) et **0041** (« dbt, data quality… vivent dans atlas, PAS dans ce dépôt ; ce dépôt fournit les points d'accès génériques »), leur miroir **ADR atlas 0033**, et **ADR cluster 0042** qui tranche le cas-limite des sandbox _en faveur_ du maintien de la frontière.
- Le code confirme : la plateforme Dagster côté cluster est livrée `load_from: []` (vide) ; `atlas` l'enregistre via `workspace-patch.yaml`.
- Fusionner contredirait frontalement des ADR _Accepted_ récents et leur enforcement (`audit:structure`).

### Quasi rien à dédupliquer

- Glossaires **disjoints** (1 seul terme commun, « Docker », sur ~115).
- **52 ADR infra** côté cluster / **57 ADR applicatifs** côté atlas, sur des domaines indépendants ; audits distincts.
- La seule vraie duplication d'outillage est le sous-bloc `[tool.ruff.lint]` (`select = ["E","F","I","UP","B","SIM"]`, `line-length = 100`) — **et encore, partielle** : `target-version = "py312"` côté cluster vs `"py310"` côté atlas (imposé par la parité de l'image Dagster), et cluster a un `extend-exclude`. ~10 lignes, pas le contenu.

### Deux objets citables réels

- DOI Zenodo distincts et vivants : cluster `10.5281/zenodo.20287209`, atlas `10.5281/zenodo.18310357`, avec deux intégrations GitHub ↔ Zenodo.
- **Fusionner en détruit un** — perte de citabilité académique irréversible.

## Réponse aux trois questions posées

### (a) Fusionner en un seul dépôt ? → NON

Score le plus bas (13/40, min 2). Le coût, élevé et en partie irréversible, se concentre sur les couches _gouvernance / doc / identité_ — celles-là mêmes qui justifieraient la fusion :

- **Collision intégrale des numéros d'ADR** `0001`–`0052` : cluster `0033` = _Orchestration Ansible DataOps_, atlas `0033` = _Contrat d'interface_ — sujets sans rapport. Renumérotation ou namespace sur ~109 fichiers.
- **Conversion d'en-tête** sur 52 ou 57 ADR (heading Markdown VitePress ↔ frontmatter YAML Astro/Starlight).
- **Réconciliation des chaînes de release** : `release-please` mono-version (cluster) ↔ Changesets multi-paquets (atlas).
- **Stratégies Git divergentes** : merge-commit (ADR cluster 0037) ↔ squash.
- **Réveil du conflit Vite** qu'atlas a explicitement payé pour fuir.

Tout cela pour servir **1 à 6 % des commits** qui dialoguent à travers la frontière. À écarter.

### (b) 3ᵉ dépôt documentation ? → NON

Score 17/40 (min 4) — le pire pour la dimension doc.

- La doc atlas est **dérivée du code** (carte des paquets lisant tous les `package.json`, repo-stats lisant l'historique git, glob de ~49 README _en place_) ; la sortir transforme des sources uniques en copies à synchroniser via checkout multi-dépôts.
- Ce qui ressemble à de la « doc » est souvent un **artefact couplé au build** : le **registre de drifts** est un YAML validé au build dont la propriété précieuse est de **naître dans la PR du correctif** — [ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md) (« tout drift révélé → corrigé dans le code + consigné dans la même PR ») et **ADR atlas 0056**. Le déporter casse cette discipline.
- Citer un _flux éditorial vivant_ sous un DOI (= snapshot figé) est une tension structurelle. À écarter.

### (c) Dépôt Python/dataops dédié ? → NON, mais à réévaluer plus tard

Score 20/40 (min 3). Trois raisons décisives :

1. **Le couplage runtime du Python pointe à 100 % vers cluster** (gRPC, OBC/S3, Marquez, parité `dagster==1.13.7`). Si l'on suivait le couplage, le bon geste ne serait pas un dépôt orphelin entre deux pôles, mais fusionner **dataops _dans_ cluster**.
2. **ADR atlas 0055** a délibérément choisi `dataops/` comme catégorie _dans_ le monorepo, pour co-localiser le producteur Python et le futur consommateur TypeScript du Parquet — décision _Accepted_ récente.
3. **Angle mort factuel confirmé sur disque** : `dataops/` ne contient pas que `citation-dagster`, il contient aussi **`citation-dbt`** (`dbt_project.yml`, models, profiles). Extraire le seul Dagster scinderait silencieusement la paire **Dagster ↔ dbt** sur deux dépôts.

**Signal de réévaluation** : le jour où un consommateur TypeScript du Parquet est écrit **et** que la charge data monte, rouvrir cette question — en évaluant alors **dataops complet (Dagster + dbt) → cluster**, son vrai pôle gravitationnel, pas un 3ᵉ dépôt autonome.

## La correction issue de la vérification adversariale

La première version de ce plan faisait du **smoke-test e2e** (banc Lima, scénario 29) son « filet mécanique » bloquant en CI. **C'est faux**, et le dépôt cluster le documente noir sur blanc :

> `cluster/.github/workflows/bench-freshness.yml` : « Le banc Lima **NE PEUT PAS** tourner en CI (nested virt, arm64, ~30 min) : ce workflow n'EXÉCUTE pas l'e2e — il OBSERVE la date du dernier run […]. NON BLOQUANT : cron seulement, jamais sur push/pull_request. »

Le banc tourne **à la main, sur le Mac du mainteneur, par une seule personne** (bus-factor 1, confirmé par CODEOWNERS des deux dépôts). Le garde-fou existant (`bench-freshness.yml`) est un **cron de fraîcheur** qui ouvre une issue de rappel quand un run manuel date trop ; `cluster-dataops` y est même classé **warn-only à 90 j** (vs atlas 7 j et storage-real 30 j, obligatoires).

**Conséquence pour la feuille de route** : le vrai garde-fou automatisable n'est **pas** l'e2e, c'est un **check statique intra-cluster** (Phase 3 ci-dessous). L'e2e reste une preuve datée manuelle — il faut l'assumer comme telle, pas le maquiller en gate CI.

> Nuance honnête : le cas `seaweedadmin` (creds définis dans `cluster/platform/seaweedfs/seaweedfs.yaml` et recopiés en dur dans `atlas/dataops/citation-dagster/deploy/s3-access.bench.yaml`) est une **valeur de banc générique** (ADR 0023), **hors du contrat unilatéral**. Un check contrat ↔ `platform/` intra-cluster ne le verra pas. Le couvrir exigerait un check cross-repo — non recommandé vu le bus-factor.

## Feuille de route — réversible et à faible coût d'abord

Chaque phase est **additive, réversible, et ne casse aucun DOI**. Une PR par phase.

### Phase 0 — Hygiène de citabilité (½ j, priorité absolue, zéro risque) — `cluster` + `atlas`

C'est ce qu'un évaluateur académique voit en premier, et c'est cassé aujourd'hui.

- **cluster** : `CITATION.cff` incohérent — `version: 2.6.1` (≠ version réelle du package) et DOI placeholder `zenodo.XXXXXXX`. Corriger la version et remplacer par `10.5281/zenodo.20287209`.
- **atlas** : `CITATION.cff` **absent**. Le créer avec le DOI `10.5281/zenodo.18310357`.
- **Done** : `cffconvert --validate` passe dans les deux dépôts ; DOI réels présents.

### Phase 1 — Lever la double « source de vérité » (½ j, prose seulement) — `atlas`

Le contrat machine-lisible (`cluster/contract/*.example.yaml`, `contract_version 1.0`) est **normatif**.

- Réécrire l'en-tête de l'**ADR atlas 0033** : remplacer « source de vérité unique » par « **vue dérivée** du contrat publié par cluster ([ADR 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md)) », avec lien.
- **Done** : un seul document se déclare normatif sur l'interface ; l'autre s'en déclare dérivé.

### Phase 2 — Index ADR-système + liens croisés (≈1 j) — `cluster` + `atlas`

- Créer un `docs/decisions/INDEX-SYSTEME.md` (cluster) + parcours miroir (atlas) listant les ~10-12 ADR transverses, **préfixés `CL-` / `AT-`** (contrat, dataops, merge-commit 0037/0053, reproductibilité 0052/0057, drifts 0034/0042/0056). On **contourne la collision `0033` par namespace de citation, sans renumérotation**.
- Étendre `lychee` (cluster, déjà en CI) et `starlight-links-validator` (atlas) aux URL `github.com` de l'autre dépôt.
- **Done** : les ADR transverses sont citables sans ambiguïté ; les liens croisés sont vérifiés en CI.

### Phase 3 — Le livrable qui compte vraiment (≈2 j, **bloquant en CI**) — `cluster`

- Porter le pattern de validation par schéma déjà présent côté atlas (`drifts.schema.json`, zod) aux trois `contract/*.example.yaml`.
- Ajouter un job CI cluster qui **vérifie que les FQDN / noms de Secret du contrat correspondent aux Services / Secrets réels de `platform/`** — tout **intra-cluster, un seul working tree, zéro nested-virt**.
- Attrape en revue (pas au run) : rename de Service, rotation de Secret, dérive d'endpoint. Lève la « duplication assumée » de l'ADR 0043.
- **Done** : un job CI bloquant échoue dès qu'un FQDN/Secret du contrat ne correspond plus à `platform/`.

### Phase 4 — e2e : assumé manuel, pas un gate CI — `cluster` (+ atlas en consommateur)

- Garder le **scénario 29** comme **preuve datée périodique**, gardée par `bench-freshness.yml` (rappel par issue). Lui donner une entrée `target` dédiée dans `test/lima/runs-history.yaml`.
- **Ne pas** le présenter comme un check CI bloquant — il ne le sera jamais (contrainte d'infra).
- _Optionnel_ : décider si `cluster-dataops` sort du warn-only 90 j pour s'aligner sur une cadence plus stricte.
- **Done** : la cadence du scénario 29 est suivie et alertée ; aucune promesse de gate CI.

### Anti-duplication ruff sans 3ᵉ dépôt

- Mettre le sous-bloc `[tool.ruff.lint]` canonique côté cluster et le **copier-générer** (fichier vendoré) dans atlas avec un check `--check` « est à jour » en CI — sur le modèle de la carte de paquets déjà générée par atlas.
- **Attention** (relevé adversarial) : ce n'est **pas** une copie verbatim du `pyproject.toml` — `target-version` diffère (`py312` vs `py310`) et cluster a un `extend-exclude`. Le check doit extraire **chirurgicalement le sous-bloc `[tool.ruff.lint]`**, pas le fichier entier. Quantifier ce coût avant de l'inscrire ; si trop fragile, laisser les deux blocs indépendants (la dérive y est bénigne).

## Risque principal et couverture

**Risque n°1 — le « durcissement de façade ».** Les phases 0-3 sont peu chères, donc tentantes, mais seule la **Phase 3** supprime réellement de la dérive silencieuse ; la Phase 4 (e2e) **ne peut pas** devenir un gate CI. Si l'on s'arrête à un vernis cosmétique en croyant le problème réglé, on peut même _relâcher_ la discipline humaine et laisser diverger les ADR jumeaux (0037/0053, 0052/0057) plus vite qu'avant.

**Couverture :**

1. Faire de la **Phase 3 le vrai livrable-cible bloquant**, dès le départ — c'est elle, pas l'e2e, qui attrape >80 % de la dérive (rename de Service, rotation de Secret) au moment de la revue.
2. Reconnaître que, projet **bus-factor 1** avec un banc 30 min non-CI-able, la cohérence fine du contrat **restera partiellement tenue par discipline** — et que la **fusion ne résoudrait pas ce point** (la virtualisation imbriquée ne rentre pas davantage dans un runner GitHub après fusion).
3. Calibrer le smoke-test e2e sur les profils distincts déjà présents (`s3-access.bench.yaml` banc vs `objectbucketclaim.prod.yaml` prod) pour éviter les faux positifs qui le feraient désactiver.
4. Inscrire le **seuil de bascule** : _si_ le consommateur TS du Parquet est écrit **et** la charge data croît, rouvrir la question (c) en évaluant **dataops complet (Dagster + dbt) → cluster**.

## Journal d'exécution

| Date       | Phase | Événement                                                                                              |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------ |
| 2026-06-11 | —     | Plan rédigé. Analyse multi-agents (lecture réelle du code) + vérification adversariale (3 sceptiques). |
