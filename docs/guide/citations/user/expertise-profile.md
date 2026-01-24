# Votre profil d'expertise

Ce guide vous explique comment Atlas Verify analyse vos publications pour identifier vos domaines d'expertise.

## Comment fonctionne l'analyse ?

Atlas Verify analyse l'ensemble de vos publications confirmées pour identifier :

- **Vos domaines de recherche** : Les thématiques sur lesquelles vous publiez
- **Votre niveau d'expertise** : Basé sur le volume, l'impact et la régularité
- **L'évolution temporelle** : Comment vos intérêts ont évolué

### Sources d'analyse

| Méthode | Description | Fiabilité |
|---------|-------------|-----------|
| **Topics OpenAlex** | Classification automatique par IA de 65 000+ sujets | ⭐⭐⭐⭐⭐ |
| **Mots-clés auteur** | Les mots-clés que vous avez choisis | ⭐⭐⭐⭐ |
| **Domaines HAL** | Classification disciplinaire française | ⭐⭐⭐⭐ |
| **Analyse de texte** | Extraction automatique des concepts clés | ⭐⭐⭐ |

## Votre carte d'expertise

### Vue d'ensemble

Votre profil affiche une **carte thématique** montrant vos domaines :

```
                    Machine Learning
                         ████████
                        ╱        ╲
        NLP            ╱          ╲         Computer Vision
       █████ ─────────●────────────────────── ███
                      │
                      │
               Deep Learning
                  ██████
```

- **Taille des bulles** : Nombre de publications
- **Proximité** : Domaines souvent associés dans vos travaux
- **Couleur** : Période (plus récent = plus foncé)

### Détail d'un domaine

En cliquant sur un domaine, vous voyez :

| Information | Exemple |
|-------------|---------|
| **Nom du domaine** | Machine Learning |
| **Publications** | 15 articles |
| **Période active** | 2018 - présent |
| **Sous-domaines** | Deep Learning, Neural Networks, Optimization |
| **Collaborateurs fréquents** | Dr. Martin, Prof. Dubois |
| **Revues principales** | JMLR, NeurIPS, ICML |

## Niveaux d'expertise

Le système évalue votre niveau dans chaque domaine :

| Niveau | Critères | Signification |
|--------|----------|---------------|
| **Expert reconnu** | 10+ publications, citations élevées, > 5 ans | Référence dans le domaine |
| **Spécialiste** | 5-10 publications, activité régulière | Expertise établie |
| **Contributeur** | 2-5 publications | Contributions significatives |
| **Explorateur** | 1-2 publications | Intérêt naissant ou ponctuel |

> 💡 Ces niveaux sont indicatifs et basés uniquement sur les données bibliographiques. Ils ne remplacent pas une évaluation par les pairs.

## Évolution temporelle

### Frise d'expertise

Visualisez comment vos intérêts ont évolué :

```
2010    2012    2014    2016    2018    2020    2022    2024

Statistiques    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Machine Learning          ░░░░████████████████████████████
NLP                             ░░░░░░░░████████████░░░░░░
Deep Learning                         ░░░░░░████████████████
```

### Détection des transitions

Le système identifie les **moments clés** de votre parcours :

- **2016** : Transition vers le Machine Learning
- **2019** : Spécialisation en Deep Learning
- **2021** : Nouvelle orientation NLP

Ces transitions peuvent correspondre à :
- Un changement de laboratoire
- Une nouvelle collaboration
- Un projet de recherche spécifique

## Valider votre profil

### Confirmer un domaine

Si un domaine identifié est correct, confirmez-le. Cela améliore la précision du système.

### Ajuster l'importance

Vous pouvez indiquer si un domaine est :
- **Central** : C'est votre cœur de métier
- **Secondaire** : Vous y contribuez régulièrement
- **Ponctuel** : Contribution occasionnelle
- **Historique** : Vous n'y travaillez plus

### Ajouter un domaine manquant

Si un domaine important n'apparaît pas :

1. Cliquez sur **Ajouter un domaine**
2. Recherchez le domaine (par mot-clé ou classification)
3. Associez-le à vos publications pertinentes

### Retirer un domaine erroné

Si un domaine ne correspond pas à votre expertise :

1. Cliquez sur **Signaler comme erroné**
2. Le domaine sera retiré de votre profil public

## Utilisations du profil

### Recherche de collaborateurs

Votre profil d'expertise permet aux autres chercheurs de vous trouver pour des collaborations sur des thématiques communes.

### Évaluation de projets

Les organismes de financement peuvent identifier les experts pertinents pour évaluer les projets de recherche.

### Recommandations

Le système peut vous recommander :
- Des articles pertinents pour vos recherches
- Des conférences dans vos domaines
- Des appels à projets correspondant à vos expertises

## Confidentialité

Vous contrôlez ce qui est visible :

| Élément | Visibilité par défaut | Modifiable |
|---------|----------------------|------------|
| Domaines principaux | Public | ✓ |
| Niveau d'expertise | Public | ✓ |
| Publications associées | Public | ✓ |
| Évolution temporelle | Chercheurs vérifiés | ✓ |
| Collaborateurs | Chercheurs vérifiés | ✓ |

## Voir aussi

- [Vérifier vos publications](./verify-publications.md) - La base de votre profil
- [Gérer votre parcours](./manage-career.md) - Contexte institutionnel
- [Réseau de collaborations](./collaboration-network.md) - Vos co-auteurs

**Documentation technique :** [Profil chercheur](../dev/researcher-profile.md) - Pour les développeurs
