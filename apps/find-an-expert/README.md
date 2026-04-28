# Find an Expert

Application SvelteKit pour explorer des expertises, institutions et dépôts de recherche.

## About

**Find an Expert** combine un site public, un tableau de bord utilisateur et une API métier pour rechercher des institutions OpenAlex, compter des publications, inspecter des dépôts GitHub et gérer le consentement utilisateur. Le code inclut l'authentification Appwrite, l'internationalisation FR/EN, les préférences de thème, des composants UI réutilisables et une page de documentation OpenAPI.

## Features

- **Recherche institutionnelle**: recherche et statistiques OpenAlex par institution
- **Analyse de dépôts**: détails, issues, pull requests, contributeurs, stats et analyse de code
- **Espace utilisateur**: dashboard, profil, consentements, préférences de thème et langue
- **API documentée**: endpoints `api/v1`, fichier OpenAPI et interface `/api/docs`

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: Appwrite (authentication, database)
- **APIs**: OpenAlex, GitHub
- **Build**: Vite 7, TypeScript 5.9

## Scripts

```bash
pnpm -F find-an-expert dev      # Development
pnpm -F find-an-expert build    # Production build
pnpm -F find-an-expert test     # Tests
pnpm -F find-an-expert lint     # ESLint
```

## Documentation

- [Technical Setup](../../docs/guide/find-an-expert/technical-setup.md)
- [Appwrite Setup](../../docs/guide/find-an-expert/appwrite-setup.md)
- [Design System](../../docs/guide/find-an-expert/design-system.md)
- [CSS Architecture](../../docs/guide/find-an-expert/css-architecture.md)

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Find an Expert is a sub-project of **ECRIN**, the collaboration platform for researchers.

Atlas is developed as part of two projects led by Le Havre Normandie University:

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**: research and training program focused on maritime and port issues
- **[EUNICoast](https://eunicoast.eu/)**: European university alliance bringing together institutions located in European coastal areas

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Le Havre Normandie University" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## License

MIT
