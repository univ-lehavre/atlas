# AMARRE

[![DOI](https://zenodo.org/badge/1107483862.svg)](https://doi.org/10.5281/zenodo.17775106)

Module de visualisation et d'analyse de réseaux de recherche.

## À propos

**AMARRE** est un module majeur d'Atlas permettant de visualiser et d'analyser les réseaux de recherche à travers des graphes interactifs. L'application permet aux chercheurs de découvrir des connexions et de comprendre la structure de leur communauté scientifique.

## Fonctionnalités

- **Graphes interactifs** : Visualisation de réseaux avec zoom, pan et sélection
- **Analyse de réseau** : Métriques de centralité, clustering, détection de communautés
- **Export** : Export des graphes en différents formats
- **Filtrage** : Filtrage par attributs, date, type de relation

## Stack technique

- **Frontend** : SvelteKit 2, Svelte 5
- **Visualisation** : Sigma.js, Graphology, ForceAtlas2
- **Backend** : Appwrite (authentification, base de données)

## Scripts

```bash
pnpm -F amarre dev      # Développement
pnpm -F amarre build    # Build production
pnpm -F amarre test     # Tests
pnpm -F amarre lint     # ESLint
```

## Documentation

- [Audit ECRIN](../../docs/guide/audit/ecrin-audit.md) - Analyse des cartes fonctionnelles

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</p>

## Licence

MIT

## Développements futurs
