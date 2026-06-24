---
title: Parcours thématique des décisions
---

Cette page propose un **tour cohérent des décisions** du dépôt, regroupées par
thème plutôt que par numéro. Elle s'adresse à un **nouveau venu** : plutôt que de
lire les 67 ADR dans l'ordre chronologique, suis le fil ci-dessous pour
comprendre _pourquoi_ le dépôt est fait comme il est.

Pour la liste exhaustive par numéro (et le statut de chacun), voir
[l'index](/atlas/decisions/). Pour le _quand ouvrir un ADR_, voir la fin de l'index.

> **Par où commencer ?** Si tu ne lis que trois décisions, lis
> [0002](/atlas/decisions/0002-monorepo-huit-categories/) (comment le dépôt est organisé),
> [0035](/atlas/decisions/0035-depot-generaliste-ouvert/) (ce que le dépôt cherche à être) et
> [0028](/atlas/decisions/0028-documentation-verifiable/) (comment la documentation reste fiable).

## 1. Ce que le dépôt cherche à être

Les décisions de **vocation** : à qui s'adresse le dépôt, et quelle posture il
adopte. À lire en premier — elles éclairent toutes les autres.

**En résumé.** Cette section pose ce que le dépôt _veut être_. La décision-chapeau
est [0035](/atlas/decisions/0035-depot-generaliste-ouvert/) : Atlas est un dépôt
**généraliste et ouvert**, et tout ce qui y est produit (code, documentation,
identifiants, ADR) reste neutre vis-à-vis d'un domaine, d'une marque et d'un
établissement, pour qu'un contributeur de n'importe quel horizon puisse le
reprendre. [0031](/atlas/decisions/0031-outil-generique-open-source/) en décline le
versant outil — un logiciel **générique et multi-tenant**, pensé pour la
contribution inter-établissements — et [0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/)
le versant éditorial — un **ton factuel**, sans positionnement promotionnel ni
framing institutionnel. Les trois disent la même posture sous trois angles ;
0035 est le principe directeur, 0031 et 0012 ses applications.

- [0035 — Dépôt généraliste ouvert](/atlas/decisions/0035-depot-generaliste-ouvert/) : la
  règle-chapeau. Atlas est généraliste et ouvert ; tout y reste neutre de
  domaine, de marque et d'établissement.
- [0031 — Outil générique open-source](/atlas/decisions/0031-outil-generique-open-source/) :
  l'outil est multi-tenant, pensé pour la contribution inter-établissements.
- [0012 — Neutralisation du framing institutionnel](/atlas/decisions/0012-neutralisation-framing-institutionnel/) :
  ton factuel, pas de positionnement promotionnel.

## 2. Comment le code est organisé

La **structure** du monorepo : son découpage, ses frontières, ses conventions de
nommage. (Un _monorepo_ est un dépôt unique qui héberge plusieurs sous-projets
au lieu d'un dépôt par projet.)

**En résumé.** La colonne vertébrale est [0002](/atlas/decisions/0002-monorepo-huit-categories/) :
le dépôt est découpé en **huit catégories**, chacune avec ses propres règles, ce
qui fixe où va chaque sous-projet. Sur ce squelette se greffent des règles de
placement et de nommage : la logique métier vit dans `packages/`, les CLI (outils
en ligne de commande) restent minces et s'y adossent
([0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/)) ; `atlas` est la
**source canonique** dont l'app standalone `amarre` est dérivée
([0009](/atlas/decisions/0009-atlas-source-canonique-amarre/)). Côté publication,
les paquets purement internes sont marqués `private`
([0011](/atlas/decisions/0011-paquets-internes-private/)) et ceux qui sont publiés
suivent la convention de nommage `atlas-`
([0022](/atlas/decisions/0022-naming-convention/)). [0003](/atlas/decisions/0003-logos-split-assets-cli/)
sert d'exemple concret : un paquet scindé entre catégorie `assets` et catégorie
`cli` pour respecter ces frontières. [0055](/atlas/decisions/0055-categorie-dataops-python/)
**amende** 0002 en ajoutant une **9e catégorie** `dataops/` : le code DataOps
(Dagster, dbt) y vit en **Python natif**, hors du paradigme Node/TypeScript — et
précise du même coup que 0008 (logique dans `packages/`) et 0005 (Effect) ne portent
que sur le périmètre TypeScript.

- [0002 — Monorepo en 8 catégories](/atlas/decisions/0002-monorepo-huit-categories/) : la
  colonne vertébrale — chaque sous-projet a une catégorie et des règles propres.
- [0055 — Catégorie `dataops/` (Python natif)](/atlas/decisions/0055-categorie-dataops-python/) :
  la 9e catégorie, pour le code DataOps (Dagster/dbt), hors du graphe Node/TypeScript.
- [0066 — Cache Turbo des checks dataops](/atlas/decisions/0066-cache-turbo-dataops/) :
  **amende** 0055 sur le seul point « aucun package.json » — les code-locations
  reçoivent un `package.json` privé minimal pour entrer dans le cache Turbo (skip des
  checks Python inchangés), sans devenir des paquets Node.
- [0008 — CLIs thins, logique dans `packages/`](/atlas/decisions/0008-clis-thins-logique-dans-packages/) :
  où vit la logique métier.
- [0009 — `atlas` source canonique vs `amarre`](/atlas/decisions/0009-atlas-source-canonique-amarre/) :
  l'articulation entre le dépôt et une app standalone.
- [0011 — Paquets internes `private`](/atlas/decisions/0011-paquets-internes-private/) et
  [0022 — Convention de nommage `atlas-`](/atlas/decisions/0022-naming-convention/) : ce qui est
  publié, et sous quel nom.
- [0003 — `logos` splitté assets + CLI](/atlas/decisions/0003-logos-split-assets-cli/) : un
  exemple concret d'application des règles de catégorie.

## 3. La stack technique

Les **choix de technologies** et leurs raisons — dont quelques contraintes
subies plutôt que choisies.

**En résumé.** Le paradigme du code métier est **Effect**, une bibliothèque de
programmation fonctionnelle pour TypeScript ([0005](/atlas/decisions/0005-effect-pour-la-pf/)) ;
un cadrage de 2026-06 l'étend de simple « langage de description » à véritable
**couche d'exécution**, détaillé dans six ADR de socle — runtime central
([0045](/atlas/decisions/0045-runtime-central-effect/)), frontière avec SvelteKit
([0046](/atlas/decisions/0046-frontiere-effect-sveltekit/)), stratégie de validation
([0047](/atlas/decisions/0047-strategie-validation-schema-zod/)), modèle d'erreur HTTP
([0048](/atlas/decisions/0048-modele-erreur-http/)), convention de test
([0049](/atlas/decisions/0049-convention-test-effect/)) et limite de l'audit knip
([0050](/atlas/decisions/0050-limite-knip-peer-deps/)). Le socle applicatif retient
**SvelteKit** (front), **Hono** (API) et **Bootstrap** (UI)
([0006](/atlas/decisions/0006-sveltekit-hono-bootstrap/)), et deux plateformes
externes sont intégrées ([0007](/atlas/decisions/0007-redcap-appwrite-plateformes/)).
Plusieurs décisions ici ne sont pas des choix mais des **contraintes assumées** :
un SDK figé en 25.x ([0010](/atlas/decisions/0010-node-appwrite-sdk-25/)), un lint
Svelte volontairement strict ([0020](/atlas/decisions/0020-svelte-eslint-strict/)),
des ranges de versions `~` sur les paquets publiables
([0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/)) et une dette amont sur
`storybook:build`, documentée pour éviter de la rechercher en vain
([0023](/atlas/decisions/0023-storybook-build-casse-amont/)).

- [0005 — Effect pour la programmation fonctionnelle](/atlas/decisions/0005-effect-pour-la-pf/) :
  le paradigme du code métier.
  - **Socle d'exécution Effect** (cadrage 2026-06, étend 0005 de « langage de
    description » à « couche d'exécution » — voir le
    [plan de résorption](/atlas/plans/2026-06-04-socle-effect/)) :
    [0045 — runtime central](/atlas/decisions/0045-runtime-central-effect/) (où le code s'exécute),
    [0046 — frontière SvelteKit](/atlas/decisions/0046-frontiere-effect-sveltekit/) (où Effect s'arrête),
    [0047 — validation Schema/zod](/atlas/decisions/0047-strategie-validation-schema-zod/),
    [0048 — modèle d'erreur HTTP](/atlas/decisions/0048-modele-erreur-http/) (atlas-errors conservé),
    [0049 — convention de test](/atlas/decisions/0049-convention-test-effect/) (it.effect),
    [0050 — limite knip peer-deps](/atlas/decisions/0050-limite-knip-peer-deps/).
- [0006 — SvelteKit, Hono, Bootstrap](/atlas/decisions/0006-sveltekit-hono-bootstrap/) : le
  socle applicatif.
- [0007 — REDCap et Appwrite](/atlas/decisions/0007-redcap-appwrite-plateformes/) : les
  plateformes externes intégrées.
- [0010 — `node-appwrite` SDK 25.x](/atlas/decisions/0010-node-appwrite-sdk-25/),
  [0020 — Lint Svelte strict](/atlas/decisions/0020-svelte-eslint-strict/),
  [0024 — Ranges `~` sur les paquets publiables](/atlas/decisions/0024-ranges-deps-publiables-tilde/) :
  des contraintes de versions assumées.
- [0023 — `storybook:build` cassé en amont](/atlas/decisions/0023-storybook-build-casse-amont/) :
  une dette subie, documentée pour ne pas la rechercher en vain.

## 4. La chaîne de qualité et de sécurité

Le **DevSecOps** : ce qui garantit qu'une modification ne casse rien et reste
sûre. (Le _DevSecOps_ intègre la sécurité directement dans la chaîne de
développement et de livraison.) C'est le cœur de la crédibilité du dépôt public.

**En résumé.** Le périmètre est cadré par [0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/) :
le chantier est **complet côté dépôt**, et les neuf items dépendant d'une
coordination externe sont reportés _sine die_, chacun avec son bloquant. La
discipline de contribution est posée et **jamais contournée** : Conventional
Commits à scopes restreints ([0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/)),
hooks Git via lefthook ([0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)),
et branch protection sur `main` ([0016](/atlas/decisions/0016-branch-protection-main/)) ;
la CI s'allège selon les chemins modifiés sans affaiblir cette protection
([0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)). La publication des paquets
est signée par OIDC sur deux registres ([0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)).
La posture de réponse sécurité fixe un SLA de remédiation des _findings_ (alertes
des outils d'analyse) ([0018](/atlas/decisions/0018-sla-remediation-findings/)) et
acte que le rôle de security champion reste **vacant**
([0027](/atlas/decisions/0027-security-champion/)) ; toute exception aux règles se
trace explicitement ([0019](/atlas/decisions/0019-derogations-workspace-audit/)).
Enfin, un volet **cloud-native (12-factor)** : auditer régulièrement
([0039](/atlas/decisions/0039-cadence-audit-transverse/)), rendre les caches
partageables via un backing-service plutôt qu'un fichier local
([0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/)) et
authentifier le service CRF ([0041](/atlas/decisions/0041-strategie-auth-service-crf-hono/)).

- [0001 — DevSecOps périmètre repo complet](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/) :
  l'ambition de couverture, et ce qui est reporté.
- [0014 — Conventional Commits](/atlas/decisions/0014-conventional-commits-scopes-restreints/),
  [0015 — Hooks Git via lefthook](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/),
  [0016 — Branch protection sur `main`](/atlas/decisions/0016-branch-protection-main/) : la
  discipline de contribution, jamais contournée.
- [0034 — CI adaptative par chemin](/atlas/decisions/0034-ci-adaptative-par-chemin/) : comment
  la CI s'allège sans casser la branch protection.
- [0017 — Releases OIDC sur deux registres](/atlas/decisions/0017-releases-npm-oidc-deux-registres/) :
  la publication signée.
- [0018 — SLA de remédiation des findings](/atlas/decisions/0018-sla-remediation-findings/),
  [0027 — Security champion (vacant)](/atlas/decisions/0027-security-champion/) : la posture de
  réponse sécurité.
- [0019 — Dérogations au workspace audit](/atlas/decisions/0019-derogations-workspace-audit/) :
  comment une exception aux règles se trace.
- [0039 — Cadence d'audit transverse](/atlas/decisions/0039-cadence-audit-transverse/),
  [0040 — Caches : flux + backing-service](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/),
  [0041 — Authentification du service CRF](/atlas/decisions/0041-strategie-auth-service-crf-hono/) :
  le durcissement **cloud-native** (12-factor) — auditer régulièrement, rendre
  les caches partageables et les services authentifiés.
- [0056 — Registre de drifts](/atlas/decisions/0056-registre-drifts/) : capitaliser
  les **écarts révélés à l'exécution** (que le lint ne voit pas) et les pièges de
  revue, dans un catalogue indexé et citable.
- [0061 — Accélérer la CI](/atlas/decisions/0061-ci-acceleration-cache-parallelisation/) :
  rendre le pipeline de qualité **rapide** sans le rendre laxiste — cache de contenu,
  parallélisation des jobs, court-circuit élargi (skip des jobs sans fichier concerné),
  workflows validés par actionlint.
- [0057 — Reproductibilité : tests hermétiques](/atlas/decisions/0057-reproductibilite-tests-hermetiques/) :
  un test ne dépend ni du réseau ni de l'état machine — **fixtures figées**, images
  par digest, déterminisme du pipeline (vérifie le `sha256` du contrat).
- [0058 — Report de `index_load`](/atlas/decisions/0058-report-index-load/) : on ne livre
  pas un chargement d'index à demi (`pairs` sans la recherche `researchers`) — l'asset
  attend un **producteur de données par chercheur servi**, le vrai débloqueur (même gap
  capacité/producteur que `works`/`authorships`).
- [0059 — Producteur par chercheur, ancrage `author_id`](/atlas/decisions/0059-mart-researchers-author-id-grain/) :
  le producteur que 0058 attendait, dérivé du **seul brut S3** (reproductible), ancré sur
  un identifiant **imparfait** (`author_id` — plusieurs par personne, publications bruitées).
  La purge d'opposition est donc **chirurgicale au grain `(author_id, work_id)` validé** :
  on ne retire que ce que la personne revendique, jamais une publication d'autrui. Le mart
  conserve une **provenance par publication** (capacité de purge) ; la validation chercheur
  et la liste d'opposition relèvent du **déployeur**.

## 5. La documentation comme miroir du code

La **politique de documentation** : pour qui on écrit, à quels niveaux, et
comment on empêche la doc de mentir.

**En résumé.** Le lecteur visé et la langue sont fixés par
[0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) : on écrit en
**français pour un public non-expert**. [0025](/atlas/decisions/0025-documentation-multi-niveaux/)
organise l'écriture en **trois niveaux** (surface, profondeur, inline) pour servir
à la fois le néophyte et l'expert. Le principe anti-mensonge est
[0028](/atlas/decisions/0028-documentation-verifiable/) : la doc est un **miroir
contrôlable du code** — ce qui est dérivable du code est généré et vérifié en CI,
le reste est audité (présence, liens, cohérence), de sorte qu'une dérive **casse
la CI**. [0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/) en précise la
mécanique pour les indicateurs : distinguer le contenu généré déterministe
(vérifié par diff) du snapshot (append-only) pour historiser sans rendre la CI
instable. Enfin [0036](/atlas/decisions/0036-migration-vitepress-astro-starlight/)
documente l'outil qui **construit** cette documentation (migration VitePress →
Astro Starlight) et pourquoi on en a changé.

- [0013 — Documentation FR pour public non-expert](/atlas/decisions/0013-documentation-public-non-expert-fr/) :
  la langue et le public.
- [0025 — Documentation à plusieurs niveaux](/atlas/decisions/0025-documentation-multi-niveaux/) :
  surface, profondeur, inline.
- [0028 — Documentation vérifiable](/atlas/decisions/0028-documentation-verifiable/) : la doc
  est un miroir contrôlable ; toute dérive casse la CI.
- [0032 — KPI : généré déterministe vs snapshot](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/) :
  comment historiser des indicateurs sans rendre la CI instable.
- [0036 — Migration VitePress → Astro Starlight](/atlas/decisions/0036-migration-vitepress-astro-starlight/) :
  l'outil qui construit la documentation, et pourquoi on en change.
- [0060 — Consignation des reconnaissances multi-agents](/atlas/decisions/0060-consignation-reconnaissances-multi-agents/) :
  le _cheminement vérifié_ qui mène à une décision — la cartographie du terrain conduite
  avant un lot structurant — est consigné sous [`docs/audit/`](/atlas/audit/), distinct de
  l'audit transverse trimestriel ([0039](/atlas/decisions/0039-cadence-audit-transverse/)).
  On garde ainsi le _pourquoi_ d'une forme de code, pas seulement son _quoi_.

## 6. Le pipeline de collaborations (le grand projet)

Le **chantier applicatif** central : transformer des données de citations en
recommandations de collaboration, à travers une plateforme DataOps. (Le _DataOps_
applique au traitement de données les pratiques d'automatisation et de qualité du
DevOps.)

**En résumé.** [0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
pose l'**architecture V1** : une plateforme DataOps alignée sur les standards du
marché (lakehouse Parquet + DuckDB, transformations dbt, orchestration Dagster,
qualité de données, index PostgreSQL/pgvector pour l'exploration), un flux
mensuel qui va des citations brutes aux paires de chercheurs et leurs features.
Le contrat producteur ↔ consommateur reste **Parquet + manifest**, et les
fonctionnalités les plus avancées (LLM génératif notamment) sont renvoyées à un
palier 2. [0033](/atlas/decisions/0033-contrat-interface-cluster/) tient le
**contrat d'interface** entre l'application `atlas` et le cluster qui l'exploite :
il est la source de vérité unique des points de contact (stockage objet S3, base
PostgreSQL/pgvector, orchestrateur, lineage, exposition…), fixe les **conventions
et formats** mais pas les valeurs propres à une instance, et impose que tout
changement d'un point de contact se reflète **dans la même pull request** que le
code ou l'infrastructure concernés.
[0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) **amende** 0029 sur
l'ingestion : pour couvrir **toute** la base OpenAlex (`works` + `authors`), la
source devient le **snapshot S3** (copie complète exportée, synchronisée de façon
incrémentale par date), l'API REST étant reléguée aux compléments ciblés.

- [0029 — Architecture V1 du pipeline](/atlas/decisions/0029-architecture-pipeline-collaborations/) :
  la plateforme DataOps et le contrat Parquet.
- [0033 — Contrat d'interface application ↔ cluster](/atlas/decisions/0033-contrat-interface-cluster/) :
  la frontière entre le code applicatif et l'infrastructure.
- [0054 — Ingestion massive par snapshot S3](/atlas/decisions/0054-ingestion-massive-snapshot-s3/) :
  toute la base OpenAlex (works + authors), incrémentale, en remplacement de l'API REST.
- [0067 — Modèle prédictif d'uplift FWCI sur EUNICoast](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) :
  **réoriente** la finalité de `citation` — au-delà des citations croisées, prédire la
  **valeur ajoutée** d'une collaboration (FWCI collab − solo) depuis les **thématiques**
  (jamais l'identité), pour recommander auteurs/thématiques sur le réseau EUNICoast.
- [0064 — Collecte « veille médiatique » (GKG v2)](/atlas/decisions/0064-collecte-mediawatch-gkg/) :
  une **seconde source** dans un code-location dédié (`mediawatch`) — pull HTTP incrémental
  des fichiers 15 minutes de GDELT, sans dépendance Google Cloud, multilingue natif.
- [0065 — Qualifier une organisation comme « université »](/atlas/decisions/0065-classification-universites-heuristique-referentiel/) :
  GKG ne type pas les organisations — la qualification se fait par **heuristique de nom
  multilingue + référentiel** d'établissements faisant foi.

## 7. Données personnelles et conformité

Le **RGPD** : ce qui relève du dépôt et ce qui relève de chaque déployeur.

**En résumé.** [0026](/atlas/decisions/0026-rgpd-perimetre/) trace la ligne de
partage : l'institutionnel (validation des bases légales, désignation du
responsable de traitement) **reste hors dépôt** et relève de chaque établissement
exploitant ; le dépôt ne décide pas à leur place. [0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)
**rouvre** ce cadre pour le cas précis du profilage de collaborations et tranche
les bornes techniques côté code : un traitement en **opt-out** fondé sur une base
légale d'intérêt public (à confirmer par le DPO de l'établissement), où la
déclaration d'alliances par l'utilisateur filtre l'_affichage_ et non
l'_ingestion_, et où le **droit d'opposition** (art. 21) retire effectivement une
personne du mart et de l'index. Les deux ne se contredisent pas : 0030 outille,
côté code, ce que 0026 laisse à l'exploitant.

- [0026 — Périmètre RGPD hors dépôt](/atlas/decisions/0026-rgpd-perimetre/) : ce que le dépôt ne
  décide pas.
- [0030 — Profilage de collaborations : gate RGPD](/atlas/decisions/0030-rgpd-profilage-collaborations/) :
  base légale, droit d'opposition, responsabilité de l'exploitant.

## 8. Exceptions et dette assumées

Des décisions **ponctuelles** : un cas particulier, une politique locale, une
dette qu'on choisit de porter en connaissance de cause.

**En résumé.** Ces décisions n'ont pas de portée transverse ; elles tranchent un
cas local en l'assumant. [0004](/atlas/decisions/0004-volumes-anonymes-sillage-sandbox/)
retient des **volumes anonymes** pour la sandbox `sillage-sandbox`, un choix
d'isolation propre à cet environnement. [0021](/atlas/decisions/0021-sandbox-deps-policy/)
**assouplit la politique de dépendances** dans les sandboxes, là où le risque est
contenu et où la rigueur appliquée au reste du dépôt serait disproportionnée.

- [0004 — Volumes anonymes pour `sillage-sandbox`](/atlas/decisions/0004-volumes-anonymes-sillage-sandbox/) :
  un choix d'isolation spécifique.
- [0021 — Politique de dépendances des sandboxes](/atlas/decisions/0021-sandbox-deps-policy/) :
  des règles assouplies là où le risque est contenu.

> Plusieurs ADR apparaissent dans plus d'un thème (par exemple
> [0031](/atlas/decisions/0031-outil-generique-open-source/) touche à la vocation _et_ au RGPD,
> [0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) au pipeline _et_ à la
> conformité) : c'est normal, une décision structurante rayonne sur plusieurs
> sujets. Le classement ci-dessus privilégie l'angle le plus utile à un premier
> parcours.
