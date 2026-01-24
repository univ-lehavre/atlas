# Les sources de données

Ce guide vous explique d'où proviennent les données utilisées par Atlas Verify et comment elles sont combinées.

## Pourquoi plusieurs sources ?

Aucune base de données bibliographique n'est complète. Chaque source a ses forces et ses limites :

| Source | Points forts | Limites |
|--------|--------------|---------|
| **OpenAlex** | Très complète (240M+ publications), gratuite | Affiliations parfois imprécises |
| **ORCID** | Données saisies par les chercheurs eux-mêmes | Dépend de ce que vous avez renseigné |
| **HAL** | Référence pour la recherche française | Principalement France |
| **Crossref** | DOI officiels, métadonnées éditeurs | Pas d'identifiants auteurs |
| **ArXiv** | Prépublications récentes | Sciences exactes uniquement |

En combinant ces sources, Atlas Verify construit un profil plus complet et fiable.

## Les sources en détail

### OpenAlex

**Ce que c'est** : Base de données ouverte de Microsoft Research contenant plus de 240 millions de publications scientifiques.

**Ce qu'elle apporte** :
- Vos publications avec leurs métadonnées
- Vos affiliations détectées automatiquement
- Vos domaines de recherche (Topics)
- Vos métriques de citations

**Fiabilité** : ⭐⭐⭐⭐ (très bonne pour les publications, variable pour les affiliations)

> 💡 OpenAlex attribue automatiquement un identifiant à chaque chercheur détecté. Si vous avez un ORCID, il est lié à cet identifiant.

### ORCID

**Ce que c'est** : Registre international d'identifiants uniques pour chercheurs, géré par une organisation à but non lucratif.

**Ce qu'elle apporte** :
- Vos publications que vous avez déclarées
- Votre parcours professionnel
- Vos formations
- Vos financements

**Fiabilité** : ⭐⭐⭐⭐⭐ (données que vous avez vous-même validées)

> 💡 **Conseil** : Créez et maintenez votre profil ORCID à jour. C'est gratuit et améliore considérablement la fiabilité de votre profil Atlas Verify.

### HAL (Hyper Articles en Ligne)

**Ce que c'est** : Archive ouverte française gérée par le CNRS, l'Inria et d'autres institutions.

**Ce qu'elle apporte** :
- Vos publications déposées en France
- Structures de recherche françaises normalisées
- Texte intégral souvent disponible

**Fiabilité** : ⭐⭐⭐⭐ (excellente pour les auteurs français)

> 💡 Si vous êtes chercheur en France, déposer vos articles sur HAL améliore votre visibilité et la qualité de votre profil.

### Crossref

**Ce que c'est** : Registre officiel des DOI (Digital Object Identifiers), géré par les éditeurs scientifiques.

**Ce qu'elle apporte** :
- Métadonnées officielles des publications
- Liens de citation entre articles
- Informations sur les financements

**Fiabilité** : ⭐⭐⭐⭐⭐ (données officielles des éditeurs)

> ⚠️ Crossref ne contient pas d'identifiants auteurs (pas d'ORCID systématique), ce qui rend l'attribution plus difficile.

### ArXiv

**Ce que c'est** : Serveur de prépublications pour les sciences exactes (physique, mathématiques, informatique...).

**Ce qu'elle apporte** :
- Vos prépublications avant publication officielle
- Versions successives de vos travaux
- Texte intégral

**Fiabilité** : ⭐⭐⭐ (bonne mais limitée aux sciences exactes)

## Comment les sources sont combinées

### Principe de fusion

Atlas Verify ne se contente pas d'additionner les sources. Il les croise intelligemment :

```
┌─────────────────────────────────────────────────────────┐
│                    VOTRE PROFIL                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   OpenAlex    ORCID     HAL      Crossref    ArXiv     │
│      │          │        │          │          │        │
│      └──────────┼────────┼──────────┼──────────┘        │
│                 │        │          │                   │
│                 ▼        ▼          ▼                   │
│           ┌─────────────────────────────┐               │
│           │   Algorithme de fusion      │               │
│           │   - Dédoublonnage           │               │
│           │   - Résolution conflits     │               │
│           │   - Score de confiance      │               │
│           └─────────────────────────────┘               │
│                         │                               │
│                         ▼                               │
│              Profil unifié et fiable                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Dédoublonnage

Le même article peut apparaître dans plusieurs sources :
- Version ArXiv (prépublication)
- Version éditeur (via Crossref)
- Dépôt HAL (archive ouverte)
- Déclaration ORCID (par vous)
- Indexation OpenAlex (automatique)

Atlas Verify identifie qu'il s'agit du même article grâce au DOI et les fusionne en une seule entrée.

### Résolution des conflits

Quand les sources se contredisent, le système applique des règles de priorité :

| Information | Source prioritaire | Raison |
|-------------|-------------------|--------|
| **Vos données personnelles** | ORCID | Vous les avez saisies |
| **Date de publication** | Crossref/DOI | Donnée officielle |
| **Affiliation au moment de la publication** | HAL > OpenAlex | Plus fiable |
| **Domaines de recherche** | OpenAlex | Meilleure couverture |
| **Texte intégral** | HAL > ArXiv | Accès ouvert |

### Score de confiance

Chaque information reçoit un score basé sur :
- Nombre de sources concordantes
- Fiabilité de chaque source pour ce type d'information
- Cohérence avec vos autres données

## Que faire si une source est incorrecte ?

### Publication mal attribuée

Si une publication d'une source n'est pas la vôtre :
1. Allez dans **Vérifier vos publications**
2. Trouvez la publication concernée
3. Cliquez sur **Rejeter**
4. Indiquez la raison (homonyme, erreur de base...)

### Affiliation incorrecte

Si une source indique une mauvaise affiliation :
1. Allez dans **Gérer votre parcours**
2. Corrigez ou supprimez l'affiliation erronée
3. Votre correction sera prioritaire

### Information manquante

Si une publication ou affiliation n'apparaît pas :
- Vérifiez qu'elle est bien dans les bases sources
- Ajoutez-la manuellement si nécessaire
- Ou mettez à jour votre profil ORCID (recommandé)

## Fraîcheur des données

| Source | Fréquence de mise à jour | Délai de propagation |
|--------|--------------------------|---------------------|
| OpenAlex | Quotidienne | 1-7 jours |
| ORCID | Temps réel | Immédiat |
| HAL | Quotidienne | 1-2 jours |
| Crossref | Continue | 1-30 jours |
| ArXiv | Quotidienne | 1-2 jours |

> 📅 Après une nouvelle publication, comptez environ **1 à 2 semaines** avant qu'elle n'apparaisse automatiquement dans votre profil.

## Voir aussi

- [Vérifier vos publications](./verify-publications.md) - Valider les données
- [Gérer votre parcours](./manage-career.md) - Corriger les affiliations
- [Profil d'expertise](./expertise-profile.md) - Basé sur ces sources

**Documentation technique :** [Catalogue des sources](../dev/sources/catalog.md) - Pour les développeurs
