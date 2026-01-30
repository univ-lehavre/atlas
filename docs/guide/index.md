# Atlas

Atlas est une plateforme développée par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

## Objectifs du projet

Atlas est développé avec plusieurs objectifs :

1. **Simplifier l'accès aux données** - Les chercheurs ne devraient pas avoir besoin de connaissances techniques avancées pour accéder à leurs données de recherche, publications ou profils bibliographiques
2. **Fiabiliser les profils** - Les bases bibliographiques contiennent des erreurs (homonymes, mauvaises attributions) que seuls les chercheurs peuvent identifier et corriger
3. **Sécuriser les échanges** - Les données de recherche sont sensibles et nécessitent une infrastructure sécurisée conforme aux normes RGPD
4. **Faciliter l'interopérabilité** - Atlas connecte des systèmes qui ne communiquent pas nativement ensemble (REDCap, OpenAlex, Crossref, HAL, ORCID, Appwrite)
5. **Favoriser la collaboration** - ECRIN permet aux chercheurs de se trouver, de constituer des équipes et de travailler ensemble sur des projets communs

## Documentation

### Pour les chercheurs

| Guide | Description |
|-------|-------------|
| [Guide chercheur](/guide/researchers/) | Présentation des fonctionnalités Atlas pour les chercheurs |
| [Guide ECRIN](/projects/ecrin/user/) | Plateforme de collaboration : cartes, graphes, projets |
| [Guide Citations](/projects/citations/user/) | Vérification des publications et fiabilisation des profils |

### Pour les développeurs

| Documentation | Description |
|---------------|-------------|
| [Documentation technique](/guide/developers/) | Architecture, installation, configuration |
| [Architecture](/guide/developers/architecture) | Diagramme des packages, Effect, ESLint |
| [Infrastructure](/guide/developers/infrastructure) | Kubernetes, sécurité Zero Trust |
| [Outils CLI](/guide/developers/cli) | Commandes en ligne disponibles |

### Par projet

| Projet | Description | Audit |
|--------|-------------|-------|
| [ECRIN](/projects/ecrin/) | Plateforme de collaboration pour chercheurs | [Audit](/projects/ecrin/audit/) |
| [AMARRE](/projects/amarre/) | Gestion de la mobilité des chercheurs | [Audit](/projects/amarre/audit/) |
| [Citations](/projects/citations/) | Agrégation de sources bibliographiques | [Audit](/projects/citations/audit/) |
| [CRF](/projects/crf/) | Outils pour interagir avec REDCap | [Audit](/projects/crf/audit/) |

### Ressources

| Ressource | Description |
|-----------|-------------|
| [Audits communs](/audit/common/) | Outils d'audit, dépendances, dette technique |
| [API](/api/) | Référence des packages TypeDoc |

## Plateformes tierces

Atlas s'appuie sur deux plateformes tierces pour ses fonctionnalités :

### REDCap (Research Electronic Data Capture)

[REDCap](https://project-redcap.org/) est une application web sécurisée développée par l'Université Vanderbilt pour la création et la gestion d'enquêtes en ligne et de bases de données de recherche.

| Caractéristique | Valeur |
|-----------------|--------|
| Institutions partenaires | 8 000+ |
| Pays | 164 |
| Citations scientifiques | 51 000+ |
| Conformité | RGPD, HIPAA, 21 CFR Part 11 |
| Coût | Gratuit pour les membres du Consortium |

REDCap permet la collecte de données sur le web et sur mobile (y compris hors connexion). Le module CRF fournit des outils TypeScript pour interagir avec l'API REDCap.

### Appwrite

[Appwrite](https://appwrite.io/) est une plateforme backend open source fournissant les services essentiels pour le développement d'applications :

| Service | Description |
|---------|-------------|
| Authentification | Connexion par email, OAuth, liens magiques |
| Base de données | Stockage et requêtage de données |
| Stockage | Gestion de fichiers avec chiffrement |
| Fonctions | Exécution de code serverless |

Appwrite est conforme aux normes SOC-2, RGPD et HIPAA. Les projets ECRIN et AMARRE utilisent Appwrite pour l'authentification et la gestion des données utilisateurs.

## Qui développe Atlas ?

Atlas est développé par l'équipe du cabinet de la présidence de l'Université Le Havre Normandie et de la vice-présidente à la recherche.

Le projet est open source et disponible sur [GitHub](https://github.com/univ-lehavre/atlas).
