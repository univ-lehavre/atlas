# Votre réseau de collaborations

Ce guide vous explique comment Atlas Verify analyse et visualise votre réseau de collaborations scientifiques.

## Qu'est-ce que le réseau de collaborations ?

Le réseau de collaborations représente l'ensemble des chercheurs avec lesquels vous avez co-publié. Cette analyse permet de :

- **Visualiser vos partenariats** : Qui sont vos collaborateurs réguliers ?
- **Identifier des opportunités** : Quels chercheurs proches de votre réseau pourraient être de futurs partenaires ?
- **Documenter votre activité** : Prouver la dimension collaborative de vos travaux

## Visualisation du réseau

### Graphe de collaborations

Votre réseau s'affiche sous forme de graphe interactif :

```
                    [Dr. Martin]
                         │
                         │ 8 articles
                         │
    [Prof. Bernard]──────●──────[Dr. Petit]
         │              /│\              │
    3 articles        /  │  \       5 articles
         │          /    │    \          │
                  /      │      \
        [Dr. Chen]    [Vous]    [Prof. Kim]
              │                      │
         2 articles             4 articles
```

- **Taille des nœuds** : Nombre de co-publications avec vous
- **Épaisseur des liens** : Intensité de la collaboration
- **Couleur** : Domaine de recherche principal
- **Distance** : Proximité thématique

### Filtres disponibles

Vous pouvez filtrer votre réseau par :

| Filtre | Description |
|--------|-------------|
| **Période** | Collaborations d'une période spécifique |
| **Domaine** | Uniquement un domaine de recherche |
| **Institution** | Collaborateurs d'une institution donnée |
| **Pays** | Dimension internationale |
| **Intensité** | Nombre minimum de co-publications |

## Détail des collaborations

### Profil d'un collaborateur

En cliquant sur un collaborateur, vous voyez :

| Information | Exemple |
|-------------|---------|
| **Nom** | Dr. Sophie Martin |
| **Institution actuelle** | CNRS, Paris |
| **Co-publications** | 8 articles |
| **Première collaboration** | 2019 |
| **Dernière collaboration** | 2024 |
| **Domaines communs** | Machine Learning, NLP |

### Historique de collaboration

La frise montre l'évolution de votre collaboration :

```
2019    2020    2021    2022    2023    2024

  ●       ●●      ●       ●●●     ●
Article  2 art.  Article  3 art.  Article
```

### Publications communes

Liste de vos co-publications avec ce chercheur, triées par date.

## Types de collaborateurs

Le système catégorise vos collaborateurs :

| Type | Définition | Exemple typique |
|------|------------|-----------------|
| **Collaborateur régulier** | 5+ articles, collaboration continue | Collègue de laboratoire |
| **Partenaire de projet** | 2-4 articles, période définie | Projet ANR commun |
| **Collaboration ponctuelle** | 1 article | Conférence, article invité |
| **Historique** | Plus de 3 ans sans co-publication | Ancien directeur de thèse |

## Statistiques de réseau

### Métriques globales

| Métrique | Votre valeur | Description |
|----------|--------------|-------------|
| **Co-auteurs uniques** | 47 | Nombre total de collaborateurs |
| **Taille du réseau étendu** | 312 | Collaborateurs de vos collaborateurs |
| **Index de collaboration** | 3.2 | Moyenne de co-auteurs par article |
| **Internationalisation** | 65% | Part de collaborateurs étrangers |

### Répartition géographique

Carte montrant la localisation de vos collaborateurs :

```
🇫🇷 France        ████████████████  35 (45%)
🇺🇸 États-Unis    ████████          15 (19%)
🇬🇧 Royaume-Uni   █████             10 (13%)
🇩🇪 Allemagne     ████               8 (10%)
🇨🇳 Chine         ███                6 (8%)
Autres            ██                 4 (5%)
```

### Répartition par domaine

```
Machine Learning    ████████████████████  28 collaborateurs
NLP                 ████████████          18 collaborateurs
Computer Vision     ████████               12 collaborateurs
Data Science        ██████                  9 collaborateurs
```

## Valider votre réseau

### Confirmer une collaboration

Si un collaborateur est correctement identifié, vous pouvez le confirmer pour améliorer la fiabilité.

### Signaler une erreur

Si une personne apparaît à tort comme collaborateur :
- **Homonyme** : Ce n'est pas vous sur cet article
- **Erreur de base** : Attribution incorrecte

### Ajouter un collaborateur manquant

Si un collaborateur n'apparaît pas :
1. Vérifiez d'abord que la publication commune est dans votre liste
2. Si oui, signalez l'absence du collaborateur
3. Indiquez son identifiant (ORCID de préférence)

## Réseau étendu

### Collaborateurs de second niveau

Découvrez les chercheurs proches de votre réseau :

> **Dr. Laurent Dubois** (Université de Lyon)
> - Collaborateur de : Dr. Martin, Prof. Bernard
> - Domaines : Machine Learning, Optimization
> - 23 publications (dont 5 très citées)

Ces suggestions peuvent vous aider à identifier de futurs partenaires.

### Chemins de collaboration

Le système montre comment vous êtes connecté à un chercheur distant :

```
Vous → Dr. Martin → Prof. Anderson → Dr. Target
         (8 art.)      (3 art.)
```

## Dimension temporelle

### Évolution du réseau

Visualisez comment votre réseau a grandi :

```
2015: ●●● (5 collaborateurs)
2018: ●●●●●●● (12 collaborateurs)
2021: ●●●●●●●●●●●● (25 collaborateurs)
2024: ●●●●●●●●●●●●●●●●●●● (47 collaborateurs)
```

### Collaborations actives vs historiques

| Statut | Définition | Nombre |
|--------|------------|--------|
| **Actif** | Co-publication < 2 ans | 18 |
| **En pause** | 2-5 ans sans co-publication | 15 |
| **Historique** | > 5 ans sans co-publication | 14 |

## Export et partage

### Formats d'export

- **PDF** : Rapport visuel de votre réseau
- **CSV** : Liste des collaborateurs avec métriques
- **GraphML** : Pour analyse dans Gephi ou autres outils
- **JSON** : Données structurées pour intégration

### Intégration CV

Générez automatiquement une section "Collaborations" pour votre CV :

> **Collaborations internationales**
> - 47 co-auteurs de 15 pays
> - Partenariats établis avec 12 institutions
> - Collaborations régulières avec CNRS, MIT, Max Planck Institute

## Voir aussi

- [Vérifier vos publications](./verify-publications.md) - Base de l'analyse
- [Profil d'expertise](./expertise-profile.md) - Vos domaines
- [Gérer votre parcours](./manage-career.md) - Contexte institutionnel

**Documentation technique :** [Profil chercheur](../dev/researcher-profile.md) - Pour les développeurs
