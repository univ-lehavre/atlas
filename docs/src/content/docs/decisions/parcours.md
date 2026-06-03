---
title: Parcours thématique des décisions
---

Cette page propose un **tour cohérent des décisions** du dépôt, regroupées par
thème plutôt que par numéro. Elle s'adresse à un **nouveau venu** : plutôt que de
lire les 35 ADR dans l'ordre chronologique, suis le fil ci-dessous pour
comprendre _pourquoi_ le dépôt est fait comme il est.

Pour la liste exhaustive par numéro (et le statut de chacun), voir
[l'index](./). Pour le _quand ouvrir un ADR_, voir la fin de l'index.

> **Par où commencer ?** Si tu ne lis que trois décisions, lis
> [0002](0002-monorepo-huit-categories) (comment le dépôt est organisé),
> [0035](0035-depot-generaliste-ouvert) (ce que le dépôt cherche à être) et
> [0028](0028-documentation-verifiable) (comment la documentation reste fiable).

## 1. Ce que le dépôt cherche à être

Les décisions de **vocation** : à qui s'adresse le dépôt, et quelle posture il
adopte. À lire en premier — elles éclairent toutes les autres.

- [0035 — Dépôt généraliste ouvert](0035-depot-generaliste-ouvert) : la
  règle-chapeau. Atlas est généraliste et ouvert ; tout y reste neutre de
  domaine, de marque et d'établissement.
- [0031 — Outil générique open-source](0031-outil-generique-open-source) :
  l'outil est multi-tenant, pensé pour la contribution inter-établissements.
- [0012 — Neutralisation du framing institutionnel](0012-neutralisation-framing-institutionnel) :
  ton factuel, pas de positionnement promotionnel.

## 2. Comment le code est organisé

La **structure** du monorepo : son découpage, ses frontières, ses conventions de
nommage.

- [0002 — Monorepo en 8 catégories](0002-monorepo-huit-categories) : la
  colonne vertébrale — chaque sous-projet a une catégorie et des règles propres.
- [0008 — CLIs thins, logique dans `packages/`](0008-clis-thins-logique-dans-packages) :
  où vit la logique métier.
- [0009 — `atlas` source canonique vs `amarre`](0009-atlas-source-canonique-amarre) :
  l'articulation entre le dépôt et une app standalone.
- [0011 — Paquets internes `private`](0011-paquets-internes-private) et
  [0022 — Convention de nommage `atlas-`](0022-naming-convention) : ce qui est
  publié, et sous quel nom.
- [0003 — `logos` splitté assets + CLI](0003-logos-split-assets-cli) : un
  exemple concret d'application des règles de catégorie.

## 3. La stack technique

Les **choix de technologies** et leurs raisons — dont quelques contraintes
subies plutôt que choisies.

- [0005 — Effect pour la programmation fonctionnelle](0005-effect-pour-la-pf) :
  le paradigme du code métier.
- [0006 — SvelteKit, Hono, Bootstrap](0006-sveltekit-hono-bootstrap) : le
  socle applicatif.
- [0007 — REDCap et Appwrite](0007-redcap-appwrite-plateformes) : les
  plateformes externes intégrées.
- [0010 — `node-appwrite` SDK 25.x](0010-node-appwrite-sdk-25),
  [0020 — Lint Svelte strict](0020-svelte-eslint-strict),
  [0024 — Ranges `~` sur les paquets publiables](0024-ranges-deps-publiables-tilde) :
  des contraintes de versions assumées.
- [0023 — `storybook:build` cassé en amont](0023-storybook-build-casse-amont) :
  une dette subie, documentée pour ne pas la rechercher en vain.

## 4. La chaîne de qualité et de sécurité

Le **DevSecOps** : ce qui garantit qu'une modification ne casse rien et reste
sûre. C'est le cœur de la crédibilité du dépôt public.

- [0001 — DevSecOps périmètre repo complet](0001-devsecops-perimetre-repo-sine-die) :
  l'ambition de couverture, et ce qui est reporté.
- [0014 — Conventional Commits](0014-conventional-commits-scopes-restreints),
  [0015 — Hooks Git via lefthook](0015-hooks-git-lefthook-jamais-bypass),
  [0016 — Branch protection sur `main`](0016-branch-protection-main) : la
  discipline de contribution, jamais contournée.
- [0034 — CI adaptative par chemin](0034-ci-adaptative-par-chemin) : comment
  la CI s'allège sans casser la branch protection.
- [0017 — Releases OIDC sur deux registres](0017-releases-npm-oidc-deux-registres) :
  la publication signée.
- [0018 — SLA de remédiation des findings](0018-sla-remediation-findings),
  [0027 — Security champion (vacant)](0027-security-champion) : la posture de
  réponse sécurité.
- [0019 — Dérogations au workspace audit](0019-derogations-workspace-audit) :
  comment une exception aux règles se trace.

## 5. La documentation comme miroir du code

La **politique de documentation** : pour qui on écrit, à quels niveaux, et
comment on empêche la doc de mentir.

- [0013 — Documentation FR pour public non-expert](0013-documentation-public-non-expert-fr) :
  la langue et le public.
- [0025 — Documentation à plusieurs niveaux](0025-documentation-multi-niveaux) :
  surface, profondeur, inline.
- [0028 — Documentation vérifiable](0028-documentation-verifiable) : la doc
  est un miroir contrôlable ; toute dérive casse la CI.
- [0032 — KPI : généré déterministe vs snapshot](0032-kpi-determinisme-vs-snapshot) :
  comment historiser des indicateurs sans rendre la CI instable.

## 6. Le pipeline de collaborations (le grand projet)

Le **chantier applicatif** central : transformer des données de citations en
recommandations de collaboration, à travers une plateforme DataOps.

- [0029 — Architecture V1 du pipeline](0029-architecture-pipeline-collaborations) :
  la plateforme DataOps et le contrat Parquet.
- [0033 — Contrat d'interface application ↔ cluster](0033-contrat-interface-cluster) :
  la frontière entre le code applicatif et l'infrastructure.

## 7. Données personnelles et conformité

Le **RGPD** : ce qui relève du dépôt et ce qui relève de chaque déployeur.

- [0026 — Périmètre RGPD hors dépôt](0026-rgpd-perimetre) : ce que le dépôt ne
  décide pas.
- [0030 — Profilage de collaborations : gate RGPD](0030-rgpd-profilage-collaborations) :
  base légale, droit d'opposition, responsabilité de l'exploitant.

## 8. Exceptions et dette assumées

Des décisions **ponctuelles** : un cas particulier, une politique locale, une
dette qu'on choisit de porter en connaissance de cause.

- [0004 — Volumes anonymes pour `sillage-sandbox`](0004-volumes-anonymes-sillage-sandbox) :
  un choix d'isolation spécifique.
- [0021 — Politique de dépendances des sandboxes](0021-sandbox-deps-policy) :
  des règles assouplies là où le risque est contenu.

> Plusieurs ADR apparaissent dans plus d'un thème (par exemple
> [0031](0031-outil-generique-open-source) touche à la vocation _et_ au RGPD,
> [0030](0030-rgpd-profilage-collaborations) au pipeline _et_ à la
> conformité) : c'est normal, une décision structurante rayonne sur plusieurs
> sujets. Le classement ci-dessus privilégie l'angle le plus utile à un premier
> parcours.
