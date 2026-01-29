# Vérifier vos publications

Ce guide vous explique comment valider les publications qui vous sont attribuées dans Atlas Verify.

## Pourquoi vérifier ?

Les bases de données bibliographiques peuvent contenir des erreurs :

- **Homonymes** : Un autre "Jean Dupont" peut avoir des publications attribuées à tort
- **Variantes de nom** : "J. Dupont", "Jean-Pierre Dupont" peuvent créer de la confusion
- **Erreurs de saisie** : Les éditeurs font parfois des erreurs

Votre validation permet de construire un profil fiable et complet.

## Types de décisions

### ✅ Confirmer une publication

Utilisez cette option quand vous êtes **certain** que l'article est le vôtre.

**Indices utiles** :
- Vous reconnaissez le titre et les co-auteurs
- L'affiliation correspond à votre parcours
- La date est cohérente avec votre carrière

### ❌ Rejeter une publication

Utilisez cette option quand vous êtes **certain** que l'article n'est pas le vôtre.

**Cas fréquents** :
- Homonyme (même nom, autre chercheur)
- Erreur manifeste (domaine totalement différent)
- Date impossible (avant vos études par exemple)

> 💡 **Astuce** : Si vous connaissez le véritable auteur, vous pouvez le suggérer pour aider la base de données.

### ❓ Marquer comme incertain

Utilisez cette option quand vous **ne savez plus** :
- Article ancien dont vous n'avez plus le souvenir
- Co-auteur que vous ne reconnaissez pas
- Titre qui ne vous dit rien

L'article restera dans votre file d'attente pour révision ultérieure.

### 🔗 Signaler un doublon

Plusieurs entrées peuvent correspondre au même article :
- Preprint ArXiv + version publiée
- DOI éditeur + DOI dépôt institutionnel
- Versions successives avec corrections

Fusionnez-les pour éviter les doublons dans votre bibliographie.

## Niveaux de confiance

Pour chaque décision, indiquez votre niveau de certitude :

| Niveau | Signification | Usage |
|--------|---------------|-------|
| **Certain** | Je n'ai aucun doute | Vous reconnaissez parfaitement l'article |
| **Probable** | Je pense que oui/non | L'article vous semble familier/étranger |
| **Possible** | C'est possible | Vous n'êtes pas sûr mais c'est plausible |
| **Incertain** | Je ne sais vraiment pas | Article ancien ou mémoire défaillante |

## Score de matching

Chaque publication candidate affiche un **score de confiance** calculé automatiquement :

```
Score 95%+ : Très haute confiance (ORCID confirmé)
Score 80-95% : Haute confiance (nom + affiliation concordants)
Score 50-80% : Confiance moyenne (nom similaire, contexte plausible)
Score <50% : Faible confiance (vérification recommandée)
```

### Critères pris en compte

| Critère | Impact | Explication |
|---------|--------|-------------|
| **ORCID présent** | +++++ | Votre ORCID est dans les métadonnées de l'article |
| **Email correspondant** | ++++ | Votre email institutionnel est mentionné |
| **Nom exact** | +++ | Nom et prénom identiques |
| **Affiliation connue** | +++ | Institution dans votre parcours |
| **Co-auteurs connus** | ++ | Vous avez déjà validé des articles avec eux |
| **Thématique proche** | + | Domaine de recherche similaire à vos autres publications |

## Vérification par lot

Pour gagner du temps, vous pouvez :

1. **Filtrer** par score de confiance (ex: afficher uniquement les >90%)
2. **Sélectionner plusieurs** articles similaires
3. **Confirmer en lot** tous les articles sélectionnés

> ⚠️ **Attention** : La vérification par lot est réservée aux articles à haute confiance. En cas de doute, vérifiez individuellement.

## Auto-confirmation

Vous pouvez activer l'auto-confirmation pour les publications à très haute confiance :

**Paramètres** → **Auto-confirmation** → Seuil : 95%

Les articles avec un score ≥ 95% (généralement ceux avec ORCID confirmé) seront automatiquement ajoutés à votre profil.

## Historique des décisions

Toutes vos décisions sont enregistrées avec :
- Date et heure
- Niveau de confiance indiqué
- Notes éventuelles

Vous pouvez **revenir sur une décision** à tout moment depuis l'historique.

## Bonnes pratiques

1. **Commencez par les scores élevés** - Plus rapide et moins risqué
2. **Vérifiez les co-auteurs** - Si vous reconnaissez un co-auteur, c'est bon signe
3. **Consultez l'affiliation** - Correspond-elle à votre parcours à cette date ?
4. **En cas de doute, marquez "incertain"** - Vous pourrez y revenir plus tard
5. **Documentez les rejets** - Notez pourquoi ce n'est pas vous (aide le système)

## Voir aussi

- [Gérer votre parcours](./manage-career.md) - Vérifier vos affiliations
- [Profil d'expertise](./expertise-profile.md) - Vos domaines de recherche

**Documentation technique :** [Fiabilisation auteur](../dev/author-verification.md) - Pour les développeurs
