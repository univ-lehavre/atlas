---
layout: home

hero:
  name: Atlas
  text: La plateforme logicielle de la recherche à l'Université Le Havre Normandie
  tagline: Des outils pour gérer les projets de recherche, capter les données cliniques, identifier les expertises, et orchestrer la collaboration scientifique.
  actions:
    - theme: brand
      text: Découvrir les applications
      link: /apps/amarre
    - theme: alt
      text: Architecture du monorepo
      link: /architecture/monorepo

features:
  - title: Applications métier
    details: Amarre, Ecrin, Sillage, Find an Expert, Atlas Dashboard, CRF Dashboard — chaque app couvre un besoin précis du chercheur ou de la cellule recherche.
    link: /apps/amarre
  - title: Architecture
    details: Un monorepo pnpm + turbo, des apps SvelteKit, un backend Appwrite auto-hébergé, REDCap comme source de données cliniques.
    link: /architecture/monorepo
  - title: Garde-fous qualité
    details: CI multi-job, CodeQL, SBOM, DAST OWASP ZAP, gitleaks, audit des licences, pyramide de tests à 5 niveaux, hooks pre-commit et pre-push.
    link: /quality/ci-pipeline
  - title: Collaboration
    details: Conventional commits, changesets, revues de code, publication npm signée OIDC, runbook d'incident.
    link: /collaboration/workflow
---

## Pourquoi cette documentation existe

Atlas n'est pas seulement « du code dans un repo GitHub ». C'est un assemblage cohérent d'applications, de bibliothèques, de scripts et de processus, conçus pour qu'un chercheur puisse compter dessus sans avoir à se soucier de l'infrastructure sous-jacente.

Cette documentation décrit **ce que produit Atlas** (les applications), **comment c'est construit** (l'architecture), **les garde-fous qui assurent la qualité du code** (CI, sécurité, tests), et **comment on collabore** dessus (PR, releases, IA).

Elle est rédigée pour être lisible par un non-expert : chercheur, doctorant, ingénieur d'études, membre de la cellule recherche, financeur, journaliste scientifique.

Si quelque chose n'est pas clair, [ouvre une issue](https://github.com/univ-lehavre/atlas/issues) — la documentation est aussi une responsabilité partagée.
