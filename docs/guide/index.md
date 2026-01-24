# Atlas

Atlas est une plateforme développée par l'Université Le Havre Normandie pour faciliter la recherche clinique et la gestion des données bibliographiques.

## Qu'est-ce qu'Atlas ?

Atlas comprend deux grandes familles d'outils :

### Atlas CRF (Clinical Research Forms)

**Pour qui ?** Équipes de recherche clinique, investigateurs, data managers.

Atlas CRF facilite la gestion des données de recherche clinique en se connectant à [REDCap](https://projectredcap.org/), la plateforme utilisée par de nombreuses institutions pour collecter des données de recherche.

**Ce que ça permet :**
- Accéder aux données de vos études REDCap de manière sécurisée
- Exporter et analyser vos données
- Automatiser des tâches répétitives

### Atlas Citations

**Pour qui ?** Chercheurs de tous domaines, bibliothécaires, services de valorisation.

Atlas Citations agrège les données de publications scientifiques depuis plusieurs sources (OpenAlex, HAL, Crossref, ORCID...) et permet de fiabiliser ces données.

**Ce que ça permet :**
- Retrouver toutes vos publications, quelle que soit la source
- Vérifier et corriger les attributions erronées
- Construire un profil de chercheur fiable et complet

## Documentation

### Je suis chercheur

Consultez la documentation utilisateur pour comprendre comment Atlas peut vous aider :

| Section | Description |
|---------|-------------|
| [Atlas Verify](./citations/user/) | Fiabiliser votre profil bibliographique |
| [Vérifier vos publications](./citations/user/verify-publications.md) | Valider les articles qui vous sont attribués |
| [Gérer votre parcours](./citations/user/manage-career.md) | Corriger vos affiliations |
| [Sources de données](./citations/user/sources.md) | Comprendre d'où viennent les données |

### Je suis développeur

Consultez la documentation technique pour intégrer Atlas ou contribuer :

| Section | Description |
|---------|-------------|
| [Architecture technique](./dev/) | Vue d'ensemble technique |
| [REDCap/CRF](./dev/crf.md) | Client et serveur REDCap |
| [Atlas Citations](./citations/dev/) | Packages sources bibliographiques |
| [Outils CLI](./dev/cli.md) | Outils en ligne de commande |
| [Infrastructure](./dev/infrastructure.md) | Déploiement et sécurité |

## Objectifs du projet

Atlas est développé avec plusieurs objectifs :

1. **Simplifier l'accès aux données** - Les chercheurs ne devraient pas avoir besoin de connaissances techniques avancées pour accéder à leurs données
2. **Fiabiliser les profils** - Les bases bibliographiques contiennent des erreurs (homonymes, mauvaises attributions) que seuls les chercheurs peuvent corriger
3. **Sécuriser les échanges** - Les données de recherche sont sensibles et nécessitent une infrastructure sécurisée
4. **Faciliter l'interopérabilité** - Atlas connecte des systèmes qui ne communiquent pas nativement ensemble

## Qui développe Atlas ?

Atlas est développé par l'équipe technique de l'Université Le Havre Normandie, en collaboration avec les équipes de recherche.

Le projet est open source et disponible sur [GitHub](https://github.com/univ-lehavre/atlas).
