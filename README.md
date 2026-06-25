# Atlas

<!-- Badges (ADR 0070) : uniquement des badges à état VRAI et vérifiable, ordonnés par famille (identité & licence → conventions & versionnement → qualité & CI → sécurité & chaîne d'approvisionnement). Ne pas ajouter de badge dont l'outil n'est pas câblé (ex. OpenSSF Scorecard). -->

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357) [![Licence : MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE) [![Documentation](https://img.shields.io/badge/docs-univ--lehavre.github.io%2Fatlas-blue.svg)](https://univ-lehavre.github.io/atlas/)

**Atlas** est un dépôt unique qui rassemble plusieurs projets logiciels — applications web, bibliothèques, serveurs et outils en ligne de commande — sous une chaîne de qualité commune. Cette organisation s'appelle un _monorepo_ : un seul dépôt Git pour tous les projets, avec des règles partagées.

> Documentation complète, illustrée et rédigée pour un public non-expert : voir le dossier [`docs/`](docs/).

## Démarrage rapide

Prérequis : [Node.js](https://nodejs.org) (version épinglée dans [`.nvmrc`](.nvmrc)) et [pnpm](https://pnpm.io).

```bash
pnpm install   # installe toutes les dépendances du monorepo
pnpm dev       # lance les serveurs de développement (Turborepo)
pnpm test      # exécute les tests
```

Pour contribuer (branche, commits, revue, merge), le point d'entrée canonique est [CONTRIBUTING.md](CONTRIBUTING.md), qui renvoie au [workflow de contribution](https://univ-lehavre.github.io/atlas/collaboration/workflow/) détaillé.

## Structure

Neuf catégories, **une responsabilité et un jeu de règles par catégorie** — c'est ce qui rend le dépôt lisible pour un nouveau contributeur :

| Catégorie              | Rôle                                                                      | Règle principale                                                |
| ---------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [apps/](apps/)         | Applications web destinées aux utilisateurs finaux (framework SvelteKit)  | Dépendent de `@sveltejs/kit` ; jamais d'une autre app           |
| [assets/](assets/)     | Fichiers statiques versionnés (logos, images, polices)                    | Pas de code exécutable, pas de `bin`, pas de dépendance runtime |
| [packages/](packages/) | Bibliothèques TypeScript réutilisables, publiées sur le registre npm      | Pas d'I/O terminal, pas de SvelteKit, pas de routage HTTP       |
| [services/](services/) | Serveurs HTTP déployés en backend (framework Hono)                        | Dépendent de `hono` + au moins un paquet interne                |
| [cli/](cli/)           | Outils en ligne de commande, courts, qui consomment les bibliothèques     | Le nom se termine par `-cli` ; doit avoir un `bin` field        |
| [ui/](ui/)             | Composants d'interface partagés entre les applications (framework Svelte) | `svelte` en `peerDependencies` ; pas d'imports server-only      |
| [config/](config/)     | Configurations communes (style de code, vérification de types, formatage) | Pas de `bin` ; importables depuis n'importe quel autre projet   |
| [sandbox/](sandbox/)   | Environnements Docker pour tester l'intégration entre les projets         | Aucune autre catégorie ne peut en dépendre                      |
| [dataops/](dataops/)   | Code DataOps en Python (assets Dagster, modèles dbt, sync de données)     | Python natif (uv/ruff/pytest) ; hors graphe pnpm (ADR 0055)     |

Ces règles sont vérifiées par `pnpm audit:structure` (exécuté en CI). Voir [docs/architecture/monorepo.md](https://univ-lehavre.github.io/atlas/architecture/monorepo/) pour le détail complet (diagramme des dépendances, principes par catégorie, conventions de nommage).

## Qualités du dépôt

Le dépôt est outillé pour que chaque modification passe un ensemble cohérent de garde-fous, à la fois sur la machine du contributeur (via les _hooks Git_, des scripts déclenchés automatiquement par Git) et sur les serveurs d'intégration continue (via GitHub Actions).

### Cohérence du code

- **TypeScript strict** sur le périmètre applicatif (`apps`, `packages`, `services`, `cli`, `ui`) : TypeScript est un langage qui ajoute des types à JavaScript ; le mode strict refuse de compiler à la moindre incohérence de types. Le code DataOps de [dataops/](dataops/) est en **Python** (Dagster et dbt l'imposent), outillé par [ruff](https://docs.astral.sh/ruff/) (ADR 0055)
- **Programmation fonctionnelle** avec [Effect](https://effect.website/), une bibliothèque TypeScript : les erreurs deviennent des valeurs typées, la composition remplace les exceptions (périmètre Node/TypeScript)
- **ESLint** (analyseur statique de code) combinant règles de style strictes, règles fonctionnelles et règles de sécurité
- **Prettier** (formateur automatique de code) vérifié à chaque commit
- **Conventional Commits** appliqué par [commitlint](https://commitlint.js.org/) : chaque message de commit suit un format standard (`type(scope): description`)

### Tests

- **Pyramide à cinq niveaux** — du plus rapide (modules isolés) au plus complet (parcours utilisateur de bout en bout) : tests unitaires, tests d'intégration, contrats avec les services externes, flux d'authentification, scénarios _end-to-end_ avec Playwright
- Suites dites _self-skipping_ qui se désactivent automatiquement quand l'environnement de test n'est pas disponible — pas de blocage du contributeur sans Docker
- **Couverture** mesurée par vitest et agrégée par un script de reporting

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
- **[Astro Starlight](https://starlight.astro.build/)** : génère le site de documentation à partir des fichiers Markdown de [`docs/`](docs/)

## Documentation

La documentation est publiée sur **[univ-lehavre.github.io/atlas](https://univ-lehavre.github.io/atlas/)** (sources dans [`docs/`](docs/), construites avec Astro Starlight) :

- [Architecture](https://univ-lehavre.github.io/atlas/architecture/monorepo/) — comment le dépôt est organisé
- [Qualité & sécurité](https://univ-lehavre.github.io/atlas/quality/ci-pipeline/) — les garde-fous en détail
- [Collaboration](https://univ-lehavre.github.io/atlas/collaboration/workflow/) — workflow pull request, releases, conventions
- [Installer les CLIs](https://univ-lehavre.github.io/atlas/collaboration/installer-les-clis/) — utiliser les outils en ligne de commande publiés
- [Glossaire](https://univ-lehavre.github.io/atlas/glossary/) — définitions des termes techniques

## Suivi du projet

L'avancement est suivi par [**milestones**](https://github.com/univ-lehavre/atlas/milestones), nommés `Phase N — …` (phases du [plan pipeline](https://univ-lehavre.github.io/atlas/plans/2026-06-02-pipeline-collaborations/)) ou `Transverse — …` (chantiers qualité hors séquence). Le socle d'infrastructure est suivi dans le dépôt [`cluster`](https://github.com/univ-lehavre/cluster/milestones).

Pour contribuer, lire [CONTRIBUTING.md](CONTRIBUTING.md). Pour signaler une vulnérabilité, voir [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE) — le logiciel est fourni « tel quel », sans garantie, et les
auteurs ne sont pas responsables des dommages liés à son usage.

## Responsabilité & conformité

La licence MIT écarte la garantie **technique** entre les auteurs et les
utilisateurs du code ; elle **ne traite pas** des obligations **réglementaires**
liées à l'exploitation de l'outil, et ne saurait écarter une règle d'ordre
public comme le RGPD.

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
