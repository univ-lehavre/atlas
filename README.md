# Atlas

<!-- Badges (ADR 0070, ADR 0083) : uniquement des badges à état VRAI et vérifiable.
Le badge le plus structurant — OpenSSF Scorecard, score supply-chain /10 recalculé en
continu — est mis en avant SOUS LE TITRE, seul (exception réservée à ce signal
transverse, ADR 0083). Les autres sont GROUPÉS par famille dans « Qualité revendiquée » ;
l'ordre des familles est une règle. Ne jamais ajouter un badge dont l'outil n'est pas
câblé : un badge à vide ment. -->

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/univ-lehavre/atlas/badge)](https://scorecard.dev/viewer/?uri=github.com/univ-lehavre/atlas)

**Atlas** est un dépôt unique qui rassemble plusieurs projets logiciels — applications web, bibliothèques, serveurs, outils en ligne de commande et une chaîne DataOps en Python — sous une chaîne de qualité commune. Cette organisation s'appelle un _monorepo_ : un seul dépôt Git pour tous les projets, avec des règles partagées.

> Documentation complète, illustrée et rédigée pour un public non-expert : voir le dossier [`docs/`](docs/).

## Démarrage rapide

Prérequis : [Node.js](https://nodejs.org) (version épinglée dans [`.nvmrc`](.nvmrc)) et [pnpm](https://pnpm.io) pour le périmètre TypeScript ; [uv](https://docs.astral.sh/uv/) pour le périmètre Python de [`dataops/`](dataops/) (hors graphe pnpm, [ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)).

```bash
pnpm install   # installe toutes les dépendances Node du monorepo
pnpm dev       # lance les serveurs de développement (Turborepo)
pnpm test      # exécute les tests
```

Le code Python de [`dataops/`](dataops/) s'installe et se teste à part, avec uv :

```bash
uv sync        # installe les dépendances Python (dans dataops/)
uv run pytest  # exécute les tests Python
```

Pour contribuer (branche, commits, revue, merge), le point d'entrée canonique est [CONTRIBUTING.md](CONTRIBUTING.md), qui renvoie au [workflow de contribution](https://univ-lehavre.github.io/atlas/collaboration/workflow/) détaillé.

## Structure

Neuf catégories, **une responsabilité et un jeu de règles par catégorie** — c'est ce qui rend le dépôt lisible pour un nouveau contributeur. Elles se regroupent en quatre **couches**, du livrable destiné à l'utilisateur jusqu'à la chaîne de données :

| Couche                    | Catégorie              | Rôle                                                                      | Règle principale                                                |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Livrables**             | [apps/](apps/)         | Applications web destinées aux utilisateurs finaux (framework SvelteKit)  | Dépendent de `@sveltejs/kit` ; jamais d'une autre app           |
|                           | [services/](services/) | Serveurs HTTP déployés en backend (framework Hono)                        | Dépendent de `hono` + au moins un paquet interne                |
|                           | [cli/](cli/)           | Outils en ligne de commande, courts, qui consomment les bibliothèques     | Le nom se termine par `-cli` ; doit avoir un `bin` field        |
| **Briques réutilisables** | [packages/](packages/) | Bibliothèques TypeScript réutilisables, publiées sur le registre npm      | Pas d'I/O terminal, pas de SvelteKit, pas de routage HTTP       |
|                           | [ui/](ui/)             | Composants d'interface partagés entre les applications (framework Svelte) | `svelte` en `peerDependencies` ; pas d'imports server-only      |
| **Support transverse**    | [config/](config/)     | Configurations communes (style de code, vérification de types, formatage) | Pas de `bin` ; importables depuis n'importe quel autre projet   |
|                           | [assets/](assets/)     | Fichiers statiques versionnés (logos, images, polices)                    | Pas de code exécutable, pas de `bin`, pas de dépendance runtime |
|                           | [sandbox/](sandbox/)   | Environnements Docker pour tester l'intégration entre les projets         | Aucune autre catégorie ne peut en dépendre                      |
| **Données**               | [dataops/](dataops/)   | Code DataOps en Python (assets Dagster, modèles dbt, sync de données)     | Python natif (uv/ruff/pytest) ; hors graphe pnpm (ADR 0055)     |

Ces règles sont vérifiées par `pnpm audit:structure` (exécuté en CI). Voir [docs/architecture/monorepo.md](https://univ-lehavre.github.io/atlas/architecture/monorepo/) pour le détail complet (diagramme des dépendances, principes par catégorie, conventions de nommage).

## Qualités du dépôt

Le dépôt est outillé pour que chaque modification passe un ensemble cohérent de garde-fous, à la fois sur la machine du contributeur (via les _hooks Git_, des scripts déclenchés automatiquement par Git) et sur les serveurs d'intégration continue (via GitHub Actions).

### Cohérence du code

- **TypeScript strict** sur le périmètre applicatif (`apps`, `packages`, `services`, `cli`, `ui`) : TypeScript est un langage qui ajoute des types à JavaScript ; le mode strict refuse de compiler à la moindre incohérence de types. Le code DataOps de [dataops/](dataops/) est en **Python** (Dagster et dbt l'imposent), outillé par [ruff](https://docs.astral.sh/ruff/) (ADR 0055)
- **Programmation fonctionnelle** avec [Effect](https://effect.website/), une bibliothèque TypeScript : les erreurs deviennent des valeurs typées, la composition remplace les exceptions (périmètre Node/TypeScript)
- **ESLint** (analyseur statique de code) combinant règles de style strictes, règles fonctionnelles et règles de sécurité sur le périmètre Node/TypeScript ; côté Python, [ruff](https://docs.astral.sh/ruff/) joue le double rôle d'analyseur statique et de formateur sur [dataops/](dataops/)
- **Prettier** (formateur automatique de code) vérifié à chaque commit sur le périmètre Node ; ruff format côté Python
- **Conventional Commits** appliqué par [commitlint](https://commitlint.js.org/) : chaque message de commit suit un format standard (`type(scope): description`)

### Tests

- **Pyramide à cinq niveaux** — du plus rapide (modules isolés) au plus complet (parcours utilisateur de bout en bout) : tests unitaires, tests d'intégration, contrats avec les services externes, flux d'authentification, scénarios _end-to-end_ avec Playwright
- Suites dites _self-skipping_ qui se désactivent automatiquement quand l'environnement de test n'est pas disponible — pas de blocage du contributeur sans Docker
- **Couverture** mesurée par vitest et agrégée par un script de reporting (périmètre Node) ; pytest-cov côté Python
- **Tests Python** sur [dataops/](dataops/) : pytest, complété par des **tests basés sur les propriétés** ([Hypothesis](https://hypothesis.readthedocs.io/), homologue Python de fast-check, [ADR 0072](https://univ-lehavre.github.io/atlas/decisions/0072-property-based-testing-dataops-python/)) qui exercent des invariants plutôt que des cas isolés

Détails : [docs/quality/tests.md](https://univ-lehavre.github.io/atlas/quality/tests/).

### Sécurité

- **Gitleaks** (détecteur de secrets) à chaque commit (côté contributeur) et à chaque pull request (côté CI) — interdit les tokens ou clés accidentellement écrits dans le code
- **CodeQL** (analyse statique de sécurité GitHub) — détecte les vulnérabilités classiques à chaque push
- **OWASP ZAP** baseline — sonde dynamiquement les applications déployées à la recherche de vulnérabilités (_DAST_, Dynamic Application Security Testing)
- **SBOM** (Software Bill of Materials, inventaire des dépendances) au format CycloneDX 1.6, généré à chaque push sur `main`
- **Audit npm** : alerte sur les vulnérabilités connues des dépendances, seuil `moderate`, échec bloquant en CI
- **Audit licences** : liste blanche permissive (MIT, Apache-2.0, BSD, ISC) appliquée à toutes les dépendances
- **Dependency review** sur chaque pull request via GitHub Advanced Security
- **Releases npm signées** par OIDC : chaque paquet publié porte une attestation cryptographique qui lie le code source au workflow qui l'a construit

Détails : [docs/quality/security.md](https://univ-lehavre.github.io/atlas/quality/security/) et [docs/quality/incident-response.md](https://univ-lehavre.github.io/atlas/quality/incident-response/).

### Audits structurels

- **[knip](https://knip.dev/)** — détecte le code mort (exports, fichiers, dépendances jamais utilisés)
- **[jscpd](https://github.com/kucherenko/jscpd)** — détecte la duplication de code, seuil à 5 %
- **[size-limit](https://github.com/ai/size-limit)** — fixe un budget de taille pour chaque paquet, échec si dépassé
- **[taze](https://github.com/antfu-collective/taze)** — vue d'ensemble des versions de dépendances disponibles
- **audit de structure** (script maison) — vérifie que chaque sous-projet respecte les conventions de placement et de nommage du dépôt

### Hooks Git locaux

[Lefthook](https://github.com/evilmartians/lefthook) orchestre les hooks Git sur la machine du contributeur, pour bloquer en local ce qui échouerait de toute façon en CI :

- **pre-commit** (avant chaque commit) : interdit les commits directs sur `main`, exécute gitleaks, Prettier, ESLint et la vérification de types sur les fichiers modifiés
- **commit-msg** (à la rédaction du message) : commitlint vérifie le format du message
- **pre-push** (avant chaque envoi au remote) : interdit les push directs sur `main`, lance l'audit de sécurité, l'audit de licences, les tests avec couverture, knip et jscpd

Détails : [docs/quality/hooks.md](https://univ-lehavre.github.io/atlas/quality/hooks/).

### Outillage

- **[pnpm](https://pnpm.io/)** : gestionnaire de paquets qui installe les dépendances et isole chaque sous-projet
- **[turbo](https://turbo.build/)** : orchestrateur de tâches avec cache distribué — ne reconstruit que ce qui a changé
- **[Changesets](https://github.com/changesets/changesets)** : gestion des versions et génération des changelogs
- **[uv](https://docs.astral.sh/uv/)** : gestionnaire de paquets et d'environnements Python pour [dataops/](dataops/), hors graphe pnpm ([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/))
- **[Astro Starlight](https://starlight.astro.build/)** : génère le site de documentation à partir des fichiers Markdown de [`docs/`](docs/)

## Culture d'ingénierie

Au-delà des garde-fous transverses, le dépôt revendique trois cultures d'ingénierie — chacune câblée dans le code et tracée par des décisions d'architecture (_ADR_, _Architecture Decision Record_, dans [`docs/decisions/`](docs/src/content/docs/decisions/)), pas seulement déclarée. Chaque affirmation ci-dessous **pointe vers sa preuve** (la décision, le workflow, le test) sans la recopier ([ADR 0070](https://univ-lehavre.github.io/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).

### GitOps — le dépôt Git est la source de vérité

_GitOps_ : tout passe par Git et une _pull request_ (PR, proposition de modification revue avant fusion), rien à la main sur les serveurs. Aucune modification n'atteint `main` autrement que par une PR revue et verte en CI, et le déploiement lui-même se pilote par ce qui est écrit dans Git.

- **Tout par PR, jamais en direct.** Commits et push directs sur `main` sont mécaniquement refusés (hooks Lefthook, _jamais_ contournables — [ADR 0015](https://univ-lehavre.github.io/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/)) ; la branche `main` exige des contrôles verts ([ADR 0016](https://univ-lehavre.github.io/atlas/decisions/0016-branch-protection-main/)) et n'accepte que des **merge commits** ([ADR 0053](https://univ-lehavre.github.io/atlas/decisions/0053-strategie-merge-commit-main/))
- **Tout est décrit dans le dépôt.** CI, publication d'images et releases sont du code dans [`.github/workflows/`](.github/workflows/) ; les mises à jour de dépendances arrivent par PR (Dependabot), les correctifs de sécurité étant fusionnés automatiquement une fois les contrôles verts
- **Le déploiement suit Git, pas l'inverse.** Atlas et son socle d'infrastructure [`cluster`](https://github.com/univ-lehavre/cluster) sont deux dépôts au **contrat d'interface explicite** ([ADR 0033](https://univ-lehavre.github.io/atlas/decisions/0033-contrat-interface-cluster/), [ADR 0077](https://univ-lehavre.github.io/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)) : Atlas publie des images immuables identifiées par empreinte (_digest_), et `cluster` les réconcilie en production ([ADR 0075](https://univ-lehavre.github.io/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)) — jamais de tag `latest`
- **Ce qui est dérivable du code est généré, commité et comparé octet par octet en CI** ([ADR 0028](https://univ-lehavre.github.io/atlas/decisions/0028-documentation-verifiable/), [ADR 0032](https://univ-lehavre.github.io/atlas/decisions/0032-kpi-determinisme-vs-snapshot/)) : une doc périmée fait rougir la CI

### DataOps — les données comme du code, contrôlées par contrat

_DataOps_ : appliquer au traitement de données la même discipline qu'au code — orchestration déclarative, transformations versionnées, qualité vérifiée à chaque étape, résultats reproductibles. Le code vit dans [`dataops/`](dataops/), en Python natif ([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)).

- **Orchestration déclarative** avec [Dagster](https://dagster.io/), transformations SQL versionnées avec [dbt](https://www.getdbt.com/) (_data build tool_) : le pipeline de recommandation de collaborations ingère un instantané de la littérature scientifique, le transforme et en dérive des recommandations ([ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-architecture-pipeline-collaborations/))
- **Qualité vérifiée à chaque étape**, certaines bloquantes : contrats de données ([Great Expectations](https://greatexpectations.io/)) et tests dbt sur les tables produites, plus des **tests basés sur les propriétés** ([Hypothesis](https://hypothesis.readthedocs.io/), [ADR 0072](https://univ-lehavre.github.io/atlas/decisions/0072-property-based-testing-dataops-python/)) sur les parseurs et dérivations
- **Reproductible par construction** : tout se re-dérive de la source brute figée (jamais d'API live), tests hermétiques et versions verrouillées de bout en bout ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/), [ADR 0059](https://univ-lehavre.github.io/atlas/decisions/0059-mart-researchers-author-id-grain/))
- **Traçabilité de bout en bout** : chaque job émet sa généalogie de données (_lineage_, [OpenLineage](https://openlineage.io/) → [Marquez](https://marquezproject.ai/)), reliée en un graphe connecté par une convention de nommage des jeux de données et **sans donnée personnelle** (noms techniques uniquement) ; l'émission est testée en hermétique, la visualisation du graphe étant une preuve d'intégration jouée au banc ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/))
- **RGPD câblé** : un **droit d'opposition** au profilage est implémenté au grain `(author_id, work_id)` — purge chirurgicale, jamais en bloc ([ADR 0026](https://univ-lehavre.github.io/atlas/decisions/0026-rgpd-perimetre/), [ADR 0030](https://univ-lehavre.github.io/atlas/decisions/0030-rgpd-profilage-collaborations/))

### MLOps — un modèle surveillé, avec une porte de sécurité

_MLOps_ : exploiter un modèle d'apprentissage automatique avec la même rigueur qu'un logiciel — entraînement tracé, dérive surveillée, ré-entraînement automatisé, et un garde-fou qui arrête tout quand le modèle n'est plus fiable. Le modèle estime le gain d'impact de citation (_FWCI_, _Field-Weighted Citation Impact_, impact normalisé par domaine et année) attendu d'une collaboration ([ADR 0067](https://univ-lehavre.github.io/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)).

- **Entraînement tracé** ([MLflow](https://mlflow.org/)) et **dérive surveillée** ([Evidently](https://www.evidentlyai.com/)) à chaque exécution, en _asset check_ ([ADR 0062](https://univ-lehavre.github.io/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/))
- **Porte de sécurité bloquante** : un modèle qui **perd son pouvoir prédictif** bascule du mode prédictif au mode descriptif — ce changement de contrat **arrête le pipeline** et force une intervention, plutôt que de servir silencieusement une sortie dégradée ([ADR 0068](https://univ-lehavre.github.io/atlas/decisions/0068-suivi-derive-modele-uplift/))
- **Validation honnête, anti-fuite** : la qualité du modèle est mesurée par validation croisée **groupée par auteur** (pas de chercheur à la fois dans l'entraînement et le test) ; la mise en service n'a lieu que si le modèle bat une ligne de base ([ADR 0067](https://univ-lehavre.github.io/atlas/decisions/0067-modele-uplift-fwci-eunicoast/))
- **Ré-entraînement continu** déclenché par la dérive, actif par défaut avec garde-fou anti-boucle ([ADR 0079](https://univ-lehavre.github.io/atlas/decisions/0079-boucle-fermee-drift-retrain-active-par-defaut/))

> Les serveurs (MLflow, Marquez, suivi de dérive) sont fournis par le socle [`cluster`](https://github.com/univ-lehavre/cluster) ([ADR 0033](https://univ-lehavre.github.io/atlas/decisions/0033-contrat-interface-cluster/)) ; en leur absence, l'instrumentation se neutralise sans jamais faire échouer le pipeline.

## Documentation

[![Documentation](https://img.shields.io/badge/docs-univ--lehavre.github.io%2Fatlas-blue.svg)](https://univ-lehavre.github.io/atlas/)

La documentation est publiée sur **[univ-lehavre.github.io/atlas](https://univ-lehavre.github.io/atlas/)** (sources dans [`docs/`](docs/), construites avec Astro Starlight) :

- [Architecture](https://univ-lehavre.github.io/atlas/architecture/monorepo/) — comment le dépôt est organisé
- [Qualité & sécurité](https://univ-lehavre.github.io/atlas/quality/ci-pipeline/) — les garde-fous en détail
- [Collaboration](https://univ-lehavre.github.io/atlas/collaboration/workflow/) — workflow pull request, releases, conventions
- [Installer les CLIs](https://univ-lehavre.github.io/atlas/collaboration/installer-les-clis/) — utiliser les outils en ligne de commande publiés
- [Glossaire](https://univ-lehavre.github.io/atlas/glossary/) — définitions des termes techniques

## Suivi du projet

L'avancement est suivi par [**milestones**](https://github.com/univ-lehavre/atlas/milestones) `Transverse — …`, qui regroupent les chantiers qualité (accessibilité, qualité applicative, socle Effect). Le socle d'infrastructure est suivi dans le dépôt [`cluster`](https://github.com/univ-lehavre/cluster/milestones).

Pour contribuer, lire [CONTRIBUTING.md](CONTRIBUTING.md). Pour signaler une vulnérabilité, voir [SECURITY.md](SECURITY.md).

## Qualité revendiquée

Les badges ne sont pas décoratifs : chacun reflète un état **vrai et vérifiable** (recalculé en continu, ou fait stable). Le plus structurant — [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/univ-lehavre/atlas), santé de la chaîne d'approvisionnement notée /10 — est mis en avant **sous le titre**, seul ([ADR 0083](https://univ-lehavre.github.io/atlas/decisions/0083-openssf-scorecard-cable/)). Regroupés ci-dessous par famille, les autres disent **quelles familles de qualité le dépôt revendique** — un badge n'est posé que s'il est honnête ([ADR 0070](https://univ-lehavre.github.io/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).

<!-- Doctrine ADR 0070 : n'afficher QUE ce qui mesure un état VRAI (dynamique câblé, ou
statique factuel stable) ; grouper par famille. Un référentiel noté non câblé reste un
finding d'audit, PAS un badge à vide (ex. OpenSSF Scorecard tant que scorecard.yml ne
tourne pas). L'ordre des familles est une règle. -->

### Identité & citation

Le projet est **identifiable et citable** : un DOI (_Digital Object Identifier_, identifiant pérenne) Zenodo fige et référence chaque version pour la citation académique.

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357)

### Conventions & versionnement

L'historique est **lisible et outillé**, pas seulement par discipline : chaque message de commit suit **Conventional Commits** (validé par commitlint sur toute la plage d'une PR, [ADR 0014](https://univ-lehavre.github.io/atlas/decisions/0014-conventional-commits-scopes-restreints/)), et les versions comme les changelogs sont dérivés des commits par **Changesets**.

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)
[![Changesets](https://img.shields.io/badge/versions-Changesets-purple.svg)](https://github.com/changesets/changesets)

### Qualité & CI

Aucune régression n'atteint `main` sans passer les contrôles : chaque PR doit satisfaire les vérifications requises (format, lint, typecheck, tests, build) avant merge. Le badge **CI** reflète l'état réel du workflow [`ci.yml`](.github/workflows/ci.yml) sur `main`; l'analyse de sécurité **CodeQL** s'exécute à chaque push.

[![CI](https://github.com/univ-lehavre/atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/univ-lehavre/atlas/actions/workflows/ci.yml)
[![CodeQL](https://github.com/univ-lehavre/atlas/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/univ-lehavre/atlas/actions/workflows/codeql.yml)

## Responsabilité & conformité

[![Licence : MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Le code est **ouvert et réutilisable** sous licence **[MIT](LICENSE)** : réutilisation
libre, fourni « tel quel », sans garantie. Cette licence écarte la garantie
**technique** entre les auteurs et les utilisateurs du code ; elle **ne traite pas** des
obligations **réglementaires** liées à l'exploitation de l'outil, et ne saurait écarter
une règle d'ordre public comme le RGPD.

Certains composants (par exemple le pipeline de recommandation de
collaborations) **traitent des données à caractère personnel**. Dans ce cas :

- **le responsable de traitement est l'établissement qui déploie et exploite une
  instance**, pas le dépôt ni ses auteurs ;
- ce responsable doit assurer **sa propre conformité** : base légale,
  information des personnes, droit d'opposition et droit à l'effacement,
  analyse d'impact si nécessaire ;
- les auteurs ne fournissent **aucune garantie de conformité** ; l'outil est
  conçu pour être _techniquement capable_ de conformité (cf. la ré-dérivabilité
  des données et le droit d'opposition décrits dans
  [ADR 0030](https://univ-lehavre.github.io/atlas/decisions/0030-rgpd-profilage-collaborations/)), mais
  l'actionner relève du déployeur.

Ce partage de responsabilité est cohérent avec la nature **générique et
open-source** de l'outil ([ADR 0031](https://univ-lehavre.github.io/atlas/decisions/0031-outil-generique-open-source/)).
