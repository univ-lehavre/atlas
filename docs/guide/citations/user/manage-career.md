# Gérer votre parcours

Ce guide vous explique comment Atlas Verify reconstitue et vous permet de valider votre parcours professionnel.

## Pourquoi gérer votre parcours ?

Votre parcours professionnel (affiliations, laboratoires, universités) est automatiquement reconstitué à partir de vos publications. Cette information permet de :

- **Contextualiser vos publications** : Associer chaque article à la bonne période
- **Identifier les homonymes** : Un chercheur au même nom mais dans un autre laboratoire
- **Compléter votre profil** : Certaines affiliations peuvent manquer dans les bases

## Ce que nous reconstituons

### Vos affiliations

Pour chaque période de votre carrière, nous identifions :

| Information | Exemple |
|-------------|---------|
| **Institution** | Université Le Havre Normandie |
| **Laboratoire** | LITIS - EA 4108 |
| **Pays/Ville** | France, Le Havre |
| **Période** | 2018 - présent |
| **Rôle** | Maître de conférences |

### Sources utilisées

Nous croisons plusieurs sources pour reconstituer votre parcours :

| Source | Fiabilité | Ce qu'elle apporte |
|--------|-----------|-------------------|
| **ORCID** | ⭐⭐⭐⭐⭐ | Données que vous avez vous-même saisies |
| **OpenAlex** | ⭐⭐⭐⭐ | Affiliations extraites de millions de publications |
| **HAL** | ⭐⭐⭐⭐ | Structures de recherche françaises normalisées |
| **Crossref** | ⭐⭐⭐ | Affiliations déclarées par les éditeurs |

> 💡 **Conseil** : Maintenir votre profil ORCID à jour améliore grandement la qualité de la reconstitution.

## Visualiser votre parcours

### Frise chronologique

Votre parcours s'affiche sous forme de frise :

```
2010        2015        2020        2025
  |-----------|-----------|-----------|

  [====== Univ. Paris ======]
                    [=== LITIS, Le Havre ===]

  Doctorant           MCF
```

### Détail d'une affiliation

En cliquant sur une période, vous accédez au détail :

- **Institution principale** : Université Le Havre Normandie
- **Laboratoire** : LITIS (Laboratoire d'Informatique, de Traitement de l'Information et des Systèmes)
- **Identifiant ROR** : https://ror.org/01k40cz91
- **Période détectée** : Janvier 2018 - présent
- **Publications associées** : 23 articles
- **Sources concordantes** : ORCID ✓, OpenAlex ✓, HAL ✓

## Valider et corriger

### Confirmer une affiliation

Si l'affiliation est correcte, confirmez-la. Cela :
- Augmente la confiance du système
- Aide à désambiguïser les homonymes
- Améliore les suggestions futures

### Corriger une période

Si les dates sont incorrectes :

1. Cliquez sur **Modifier les dates**
2. Ajustez la date de début et/ou de fin
3. Validez la modification

> 📝 **Note** : Vos corrections sont prioritaires sur les données automatiques.

### Ajouter une affiliation manquante

Certaines affiliations peuvent ne pas apparaître si :
- Vous n'avez pas publié pendant cette période
- L'information n'est pas dans les bases
- L'affiliation était mal orthographiée

Pour ajouter une affiliation :

1. Cliquez sur **Ajouter une affiliation**
2. Recherchez l'institution (par nom ou identifiant ROR)
3. Indiquez les dates
4. Précisez votre rôle (optionnel)

### Supprimer une affiliation erronée

Si une affiliation ne vous appartient pas (erreur ou homonyme) :

1. Cliquez sur **Signaler comme erronée**
2. Indiquez la raison (homonyme, erreur de base, etc.)
3. L'affiliation sera retirée de votre profil

## Conflits et incohérences

### Chevauchements

Deux affiliations peuvent se chevaucher si vous aviez un double rattachement. Le système vous demande confirmation :

```
⚠️ Chevauchement détecté (2019-2020)

Pendant cette période, vous apparaissez affilié à :
- Université Paris-Saclay (selon OpenAlex)
- Université Le Havre Normandie (selon HAL)

[ ] Les deux sont correctes (double affiliation)
[ ] Seule Paris-Saclay est correcte
[ ] Seul Le Havre est correct
```

### Lacunes

Si une période sans affiliation est détectée, vous pouvez :
- Confirmer qu'il s'agit d'une période sans activité académique
- Ajouter l'affiliation manquante

## Impact sur vos publications

La validation de votre parcours améliore :

1. **Le matching des publications** : Les articles de la période confirmée ont un score plus élevé
2. **La détection d'homonymes** : Un article avec une affiliation différente sera scruté
3. **Votre profil d'expertise** : Les thématiques sont contextualisées par période

## Exporter votre parcours

Vous pouvez exporter votre parcours validé au format :

- **PDF** : CV académique formaté
- **JSON-LD** : Données structurées (pour intégration)
- **BibTeX** : Pour logiciels de bibliographie

## Voir aussi

- [Vérifier vos publications](./verify-publications.md) - Valider vos articles
- [Profil d'expertise](./expertise-profile.md) - Vos domaines de recherche

**Documentation technique :** [Profil chercheur](../dev/researcher-profile.md) - Pour les développeurs
