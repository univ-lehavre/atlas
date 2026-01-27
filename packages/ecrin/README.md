# ECRIN

## Objectif

Le projet ECRIN est développé par l’Université Le Havre Normandie dans le cadre de plusieurs programmes de recherche. ECRIN a l’ambition de fournir une plateforme permettant aux chercheurs de se présenter en répondant à des formulaires, de trouver des experts et d’identifier des collaborations potentielles.

## Méthode

Une application internet, accessible via un navigateur, est développée pour répondre à cet objectif.

## Choix technologiques

Le code de l’application ECRIN est déposé sur [GitHub](https://github.com/univ-lehavre/ecrin). Elle est conçue pour être développée localement sur un ordinateur de bureau et déployée automatiquement sur un _cloud_ de développement.

Nous avons choisi le logiciel [Appwrite](https://appwrite.io/) (version ⩾ 1.8) pour héberger les déploiements automatiques depuis le dépôt GitHub.

Nous réemployons des composants existants pour certaines fonctionnalités :

- Appwrite pour l’authentification, la gestion des utilisateurs, la gestion des droits d’accès et la gestion de la base de données ;
- [REDCap](https://redcap.univ-lehavre.fr/) pour la gestion des données de recherche et des formulaires.

## Variables d’environnement

L’application ECRIN utilise des variables d’environnement pour configurer certains aspects de son fonctionnement. Pour l’environnement de développement local, ces variables doivent être définies dans le fichier `.env` à la racine du projet.
