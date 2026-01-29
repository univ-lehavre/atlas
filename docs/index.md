---
layout: home

hero:
  name: Atlas
  text: Des outils dédiés à la recherche
  tagline: Développés par l'Université Le Havre Normandie
  actions:
    - theme: brand
      text: Guide chercheur
      link: /guide/researchers/
    - theme: alt
      text: Documentation technique
      link: /guide/developers/
    - theme: alt
      text: Référence API
      link: /api/

features:
  - title: ECRIN
    details: Plateforme de collaboration pour chercheurs - présentez vos travaux, trouvez des collaborateurs, visualisez les réseaux de recherche
    link: /projects/ecrin/
  - title: AMARRE
    details: Gestion de la mobilité des chercheurs
  - title: Citations
    details: Agrégation de sources bibliographiques (OpenAlex, Crossref, HAL, ORCID) et fiabilisation des profils chercheurs avec Atlas Verify
    link: /projects/citations/
  - title: CRF
    details: Outils TypeScript pour interagir avec REDCap, utilisé par 8 000+ institutions pour la collecte de données de recherche
    link: /projects/crf/
  - title: SARtraces
    details: Analyse spatio-temporelle des opérations de sauvetage en mer - traces AIS, données PREMAR et conditions météorologiques
  - title: RENOMMÉE
    details: Analyse de la réputation institutionnelle via les données bibliographiques - publications, citations, impact pondéré et benchmarking avec les universités comparables
  - title: ICO
    details: Mesure de l'impact de la coopération internationale sur la production scientifique - analyse bibliométrique des publications au sein de l'alliance EUNICoast

---

## À propos d'Atlas

Atlas est un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter le travail des chercheurs et des équipes de recherche.

### Pour les chercheurs

- **Vérifiez vos publications** : identifiez et corrigez les attributions erronées dans OpenAlex, Crossref et HAL grâce à Atlas Verify
- **Gérez votre parcours** : maintenez un historique fiable de vos affiliations, suivez vos changements d'institution et vos périodes de mobilité
- **Découvrez des experts** : recherchez des collaborateurs par thématique, localisation ou compétences spécifiques via ECRIN
- **Visualisez vos réseaux** : explorez vos co-auteurs, projets communs et connexions interdisciplinaires avec des graphes interactifs
- **Déclarez vos projets** : créez des fiches projet pour recruter des collaborateurs et obtenir des financements
- **Publiez vos données** : partagez vos jeux de données et actualités avec la communauté scientifique

### Pour les développeurs

- **Client REDCap** : bibliothèque TypeScript avec Effect pour interroger l'API REDCap de manière typée et sécurisée
- **Extraction OpenAPI** : génération automatique de spécifications OpenAPI depuis le code source PHP de REDCap
- **Clients bibliographiques** : packages Effect pour OpenAlex, Crossref, HAL, ArXiv et ORCID avec rate limiting intégré
- **Outils CLI** : diagnostics réseau, tests de connectivité et validation de configurations
- **Configuration partagée** : ESLint, TypeScript et Prettier standardisés pour tout le monorepo
- **Intégration Appwrite** : authentification, gestion des sessions et stockage de données utilisateurs

## Projets institutionnels

Atlas est développé dans le cadre de projets structurants portés par l'Université Le Havre Normandie.

### Campus Polytechnique des Territoires Maritimes et Portuaires

Le [Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/) (CPTMP) est un consortium unique en Europe, inauguré le 30 janvier 2025. Il rassemble **12 membres fondateurs** autour de l'Université Le Havre Normandie : CNRS, INSA Rouen Normandie, École Nationale Supérieure Maritime, Sciences Po, EM Normandie, ENSA Normandie, ESADHaR, IFEN, Le Havre Seine Métropole, Synerzip LH, UMEP et la Région Normandie.

Le Campus est lauréat de l'appel à projets « ExcellencES » de **France 2030**, avec un financement de **7,3 M€** sur 7 ans (2023-2030).

**Axes stratégiques :**
- Villes de demain
- Enjeux maritimes et portuaires
- Transitions, risques et incertitudes

**Cinq hubs opérationnels :**
- Hub Expertise et Qualifications
- Hub Créations et Innovations
- Hub International
- Hub Digital et Plateformes Technologiques
- Hub Sports Academy

### EUNICoast

[EUNICoast](https://eunicoast.eu/) (European University of Islands, Ports & Coastal Territories) est une alliance de **13 universités européennes** coordonnée par l'Université Le Havre Normandie, financée à hauteur de **14,4 M€** par la Commission européenne (2024-2028).

**Universités partenaires :** Åland (Finlande), Bourgas (Bulgarie), Stralsund (Allemagne), EMUNI (Slovénie), Açores (Portugal), Baléares (Espagne), Patras (Grèce), Sassari (Italie), Féroé, Antilles (France), Le Havre (France), Dubrovnik (Croatie), Szczecin (Pologne).

**Hubs de recherche :**
- Identités et patrimoines des communautés côtières et insulaires
- Économie bleue circulaire, logistique portuaire et tourisme durable
- Gouvernance et aménagement des territoires côtiers
- Santé, biodiversité et solutions fondées sur la nature
- Solutions d'ingénierie et données pour les infrastructures côtières, énergies marines renouvelables et sécurité maritime

## Partenaires et financeurs

<div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2rem; margin: 2rem 0;">
  <a href="https://www.univ-lehavre.fr/">
    <img src="./public/logos/ulhn.svg" alt="Université Le Havre Normandie" style="height: 80px;">
  </a>
  <a href="https://www.cptmp.fr/">
    <img src="./public/logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" style="height: 80px;">
  </a>
  <a href="https://eunicoast.eu/">
    <img src="./public/logos/eunicoast.png" alt="EUNICoast" style="height: 80px;">
  </a>
  <img src="./public/logos/france-2030.png" alt="France 2030" style="height: 80px;">
  <img src="./public/logos/region-normandie.png" alt="Région Normandie" style="height: 80px;">
</div>
