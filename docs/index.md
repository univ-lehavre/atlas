---
layout: home

hero:
  name: Atlas
  text: Plateforme de recherche
  tagline: Outils pour les chercheurs, développés par l'Université Le Havre Normandie
  actions:
    - theme: brand
      text: Guide chercheur
      link: /guide/citations/user/
    - theme: alt
      text: Documentation technique
      link: /guide/dev/
    - theme: alt
      text: Référence API
      link: /api/

features:
  - title: ECRIN
    details: Plateforme de collaboration pour chercheurs - présentez vos travaux, trouvez des collaborateurs, visualisez les réseaux de recherche
    link: /guide/audit/ecrin-audit
  - title: AMARRE
    details: Gestion de la mobilité des chercheurs
    link: /guide/audit/ecrin-audit
  - title: Citations
    details: Agrégation de sources bibliographiques (OpenAlex, Crossref, HAL, ORCID) et fiabilisation des profils chercheurs avec Atlas Verify
    link: /guide/citations/
  - title: CRF (Case Report Form)
    details: Outils TypeScript pour interagir avec REDCap, utilisé par 8 000+ institutions pour la collecte de données de recherche
    link: /guide/dev/crf
---

## À propos d'Atlas

Atlas est un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter le travail des chercheurs et des équipes de recherche.

## Les quatre modules majeurs

Atlas est composé de **quatre modules majeurs** :

| Module | Description | Sous-projets |
|--------|-------------|--------------|
| **ECRIN** | Plateforme de collaboration pour chercheurs | find-an-expert |
| **AMARRE** | Gestion de la mobilité des chercheurs | - |
| **Citations** | Agrégation de sources bibliographiques et fiabilisation des profils | openalex, crossref, hal, arxiv, orcid, verify |
| **CRF** | Outils pour interagir avec REDCap | redcap-core, redcap-openapi |

### ECRIN

ECRIN est une plateforme de collaboration pour chercheurs permettant de présenter ses travaux, trouver des collaborateurs et visualiser les réseaux de recherche.

**Sous-projets :**

| Sous-projet | État |
|-------------|------|
| introduce-my-scientific-questions | 🚧 En cours |
| introduce-my-references | 🚧 En cours |
| collaborate-create-my-project | 🚧 En cours |
| collaborate-build-my-team | 📋 Prévu |
| collaborate-find-my-expert | 📋 Prévu |
| collaborate-fund-my-project | 📋 Prévu |
| explore-my-graph | 📋 Prévu |
| explore-community-graph | 📋 Prévu |
| ask-data | 📋 Prévu |
| ask-an-expert | 🚧 En cours |
| publish-my-data | 📋 Prévu |
| publish-my-news | 📋 Prévu |

### AMARRE

AMARRE est une application de gestion de la mobilité des chercheurs.

### Citations

Atlas Citations est une suite de packages pour interroger des sources bibliographiques (OpenAlex, Crossref, HAL, ArXiv, ORCID) via des clients Effect typés. Atlas Verify permet aux chercheurs de fiabiliser leur profil bibliographique.

**Sous-projets :**

| Sous-projet | État |
|-------------|------|
| openalex | 🚧 En cours |
| crossref | 🚧 En cours |
| hal | 📋 Prévu |
| arxiv | 📋 Prévu |
| orcid | 📋 Prévu |
| verify | 🚧 En cours |

### CRF (Case Report Form)

CRF fournit des outils TypeScript pour interagir avec l'API REDCap de manière sécurisée et typée.

**Sous-projets :**
- **redcap-core** : logique métier REDCap pure avec Effect
- **redcap-openapi** : extraction et analyse de spécifications OpenAPI depuis le code source REDCap

## Pour les chercheurs

- **Vérifiez vos publications** : identifiez et corrigez les attributions erronées dans les bases bibliographiques
- **Gérez votre parcours** : maintenez un historique fiable de vos affiliations
- **Découvrez des experts** : trouvez des collaborateurs potentiels dans votre domaine
- **Visualisez vos réseaux** : explorez vos connexions avec la communauté scientifique

## Pour les développeurs

- **Client REDCap** : bibliothèque TypeScript avec Effect pour interagir avec l'API REDCap
- **Outils CLI** : diagnostics réseau et tests de connectivité
- **Configuration partagée** : ESLint, TypeScript et Prettier standardisés

<RepoDynamics />

## Plateformes tierces

Atlas s'appuie sur deux plateformes tierces :

### REDCap (Research Electronic Data Capture)

[REDCap](https://project-redcap.org/) est une application web sécurisée développée par l'Université Vanderbilt pour la création et la gestion d'enquêtes en ligne et de bases de données de recherche. REDCap est utilisé par plus de **8 000 institutions** dans **164 pays** et a été cité dans plus de **51 000 articles scientifiques**.

REDCap permet la collecte de données sur le web et sur mobile (y compris hors connexion) tout en respectant les réglementations sur la protection des données (RGPD, HIPAA, 21 CFR Part 11). Il est gratuit pour les organisations à but non lucratif membres du Consortium REDCap.

### Appwrite

[Appwrite](https://appwrite.io/) est une plateforme backend open source fournissant les services essentiels pour le développement d'applications web et mobiles : authentification, base de données, stockage et fonctions serverless.

Appwrite est conforme aux normes SOC-2, RGPD et HIPAA. Les modules ECRIN et AMARRE utilisent Appwrite pour l'authentification et la gestion des données utilisateurs.

## Projets institutionnels

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

### Campus Polytechnique des Territoires Maritimes et Portuaires

Programme de recherche et de formation centré sur les enjeux maritimes et portuaires du territoire havrais et normand.

### EUNICoast

[EUNICoast](https://eunicoast.eu/) est une alliance universitaire européenne regroupant des établissements d'enseignement supérieur situés sur les zones côtières européennes.

## Partenaires et financeurs

<div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2rem; margin: 2rem 0;">
  <a href="https://www.univ-lehavre.fr/">
    <img src="./public/logos/ulhn.svg" alt="Université Le Havre Normandie" height="50">
  </a>
  <a href="https://www.cptmp.fr/">
    <img src="./public/logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="50">
  </a>
  <a href="https://eunicoast.eu/">
    <img src="./public/logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</div>

<div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2rem; margin: 2rem 0;">
  <img src="./public/logos/france-2030.png" alt="France 2030" height="50">
  <img src="./public/logos/region-normandie.png" alt="Région Normandie" height="50">
</div>
