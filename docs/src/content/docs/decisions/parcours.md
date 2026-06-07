---
title: Parcours thématique des décisions
---

Cette page propose un **tour cohérent des décisions** du dépôt, regroupées par
thème plutôt que par numéro. Elle s'adresse à un **nouveau venu** : plutôt que de
lire les 52 ADR dans l'ordre chronologique, suis le fil ci-dessous pour
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

- [0035 — Dépôt généraliste ouvert](/atlas/decisions/0035-depot-generaliste-ouvert/) : la
  règle-chapeau. Atlas est généraliste et ouvert ; tout y reste neutre de
  domaine, de marque et d'établissement.
- [0031 — Outil générique open-source](/atlas/decisions/0031-outil-generique-open-source/) :
  l'outil est multi-tenant, pensé pour la contribution inter-établissements.
- [0012 — Neutralisation du framing institutionnel](/atlas/decisions/0012-neutralisation-framing-institutionnel/) :
  ton factuel, pas de positionnement promotionnel.

## 2. Comment le code est organisé

La **structure** du monorepo : son découpage, ses frontières, ses conventions de
nommage.

- [0002 — Monorepo en 8 catégories](/atlas/decisions/0002-monorepo-huit-categories/) : la
  colonne vertébrale — chaque sous-projet a une catégorie et des règles propres.
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
sûre. C'est le cœur de la crédibilité du dépôt public.

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

## 5. La documentation comme miroir du code

La **politique de documentation** : pour qui on écrit, à quels niveaux, et
comment on empêche la doc de mentir.

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

## 6. Le pipeline de collaborations (le grand projet)

Le **chantier applicatif** central : transformer des données de citations en
recommandations de collaboration, à travers une plateforme DataOps.

- [0029 — Architecture V1 du pipeline](/atlas/decisions/0029-architecture-pipeline-collaborations/) :
  la plateforme DataOps et le contrat Parquet.
- [0033 — Contrat d'interface application ↔ cluster](/atlas/decisions/0033-contrat-interface-cluster/) :
  la frontière entre le code applicatif et l'infrastructure.

## 7. Données personnelles et conformité

Le **RGPD** : ce qui relève du dépôt et ce qui relève de chaque déployeur.

- [0026 — Périmètre RGPD hors dépôt](/atlas/decisions/0026-rgpd-perimetre/) : ce que le dépôt ne
  décide pas.
- [0030 — Profilage de collaborations : gate RGPD](/atlas/decisions/0030-rgpd-profilage-collaborations/) :
  base légale, droit d'opposition, responsabilité de l'exploitant.

## 8. Exceptions et dette assumées

Des décisions **ponctuelles** : un cas particulier, une politique locale, une
dette qu'on choisit de porter en connaissance de cause.

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
