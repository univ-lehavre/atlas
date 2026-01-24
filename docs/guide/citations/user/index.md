# Atlas Verify - Guide utilisateur

Bienvenue sur Atlas Verify, la plateforme de gestion de votre profil bibliographique.

## Pourquoi utiliser Atlas Verify ?

En tant que chercheur, vous êtes confronté à plusieurs défis :

- **Dispersion des données** : Vos publications sont réparties sur OpenAlex, Google Scholar, HAL, ORCID, ResearchGate...
- **Erreurs d'attribution** : Des homonymes peuvent être confondus avec vous
- **Profil incomplet** : Certaines publications ne sont pas correctement liées à votre profil
- **Affiliations incohérentes** : Vos parcours institutionnels varient selon les sources

Atlas Verify agrège automatiquement vos données depuis 15+ sources bibliographiques et vous permet de les valider, corriger et enrichir.

## Fonctionnalités principales

### 1. Vérification des publications

Confirmez ou rejetez les publications qui vous sont attribuées :

- ✅ **"C'est bien mon article"** - Confirmer l'attribution
- ❌ **"Ce n'est pas moi"** - Signaler une erreur d'attribution (homonyme)
- ❓ **"Je ne suis pas sûr(e)"** - Marquer pour révision ultérieure
- 🔗 **"C'est un doublon"** - Fusionner des versions multiples

> **Documentation détaillée** : [Fiabilisation des publications](./verify-publications.md)

### 2. Profil de carrière

Visualisez et corrigez votre parcours institutionnel :

- Chronologie de vos affiliations (universités, laboratoires)
- Détection automatique des périodes manquantes
- Ajout manuel d'affiliations non détectées

> **Documentation détaillée** : [Gérer votre carrière](./manage-career.md)

### 3. Profil d'expertise

Découvrez vos domaines d'expertise tels qu'identifiés par vos publications :

- Cartographie de vos thématiques de recherche
- Évolution de vos expertises dans le temps
- Identification des pivots thématiques

> **Documentation détaillée** : [Votre profil d'expertise](./expertise-profile.md)

### 4. Réseau de collaboration

Explorez votre réseau de co-auteurs :

- Visualisation de vos collaborations
- Identification des collaborateurs récurrents
- Statistiques de collaboration internationale

> **Documentation détaillée** : [Réseau de collaboration](./collaboration-network.md)

## Premiers pas

### Étape 1 : Connexion avec ORCID

Atlas Verify utilise ORCID comme identifiant principal. Connectez-vous avec votre ORCID pour :

- Authentifier votre identité de manière sécurisée
- Importer automatiquement vos publications liées à ORCID
- Synchroniser vos validations vers ORCID

### Étape 2 : Import automatique

Une fois connecté, Atlas Verify recherche automatiquement vos publications dans :

| Source | Description |
|--------|-------------|
| **OpenAlex** | Base mondiale de 240M+ publications académiques |
| **Crossref** | Métadonnées DOI officielles des éditeurs |
| **HAL** | Archive ouverte française |
| **ArXiv** | Prépublications en physique, maths, informatique |
| **ORCID** | Publications liées à votre profil ORCID |
| **Semantic Scholar** | Publications avec analyse IA |

### Étape 3 : Vérification

Passez en revue les publications trouvées et validez-les une par une ou par lot.

## Questions fréquentes

### Comment fonctionne la détection automatique ?

Atlas Verify utilise plusieurs critères pour vous associer à une publication :

1. **ORCID** : Si votre ORCID est présent dans la publication → très haute confiance
2. **Email institutionnel** : Correspondance avec votre email → haute confiance
3. **Nom + Affiliation** : Votre nom associé à votre institution → bonne confiance
4. **Réseau de co-auteurs** : Co-auteurs que vous avez déjà validés → confiance moyenne

### Mes données sont-elles sécurisées ?

- Vos décisions sont stockées de manière sécurisée
- Vous pouvez exporter vos données à tout moment
- Aucune donnée n'est partagée sans votre consentement

### Puis-je exporter mes publications ?

Oui, vous pouvez exporter vos publications vérifiées en :
- BibTeX
- RIS
- JSON
- CSV

## Ce que les développeurs construisent

Atlas Verify est développé en open source. Les développeurs travaillent sur :

- **Agrégation automatique** : Connexion à 15+ bases de données bibliographiques
- **Algorithmes de matching** : Intelligence artificielle pour détecter les homonymes
- **Reconstruction de carrière** : Croisement des sources pour reconstituer votre parcours
- **Analyse d'expertise** : Détection automatique de vos domaines de recherche

> Voir la [documentation technique](../dev/) pour comprendre comment ça fonctionne.

## Support

- **Documentation générale Atlas** : [Retour à l'accueil](../../)
- **Sources de données** : [Catalogue des sources](./sources.md)
- **Documentation technique** : [Guide développeur](../dev/)
