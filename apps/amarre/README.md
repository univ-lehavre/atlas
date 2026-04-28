# AMARRE

[![DOI](https://zenodo.org/badge/1107483862.svg)](https://doi.org/10.5281/zenodo.17775106)

Application SvelteKit de gestion des demandes AMARRE.

## About

**AMARRE** permet à un utilisateur authentifié de créer, compléter, suivre et administrer des demandes de questionnaires. L'application s'appuie sur Appwrite pour l'authentification et le stockage utilisateur, expose des routes API pour les demandes, les liens, les PDF et les téléchargements REDCap, et fournit une page de documentation OpenAPI générée.

## Features

- **Demandes**: création, liste, suivi et finalisation des demandes de questionnaires
- **Documents REDCap**: récupération de liens, PDF et fichiers associés aux demandes
- **Authentification**: inscription, connexion, session courante et déconnexion via Appwrite
- **API documentée**: routes `api/v1` et page `/api/docs` adossée à la spécification OpenAPI

## Technical Stack

- **Frontend**: SvelteKit 2, Svelte 5
- **Backend**: Appwrite, REDCap
- **Validation/API**: Zod, zod-to-openapi

## Scripts

```bash
pnpm -F amarre dev      # Development
pnpm -F amarre build    # Production build
pnpm -F amarre test     # Tests
pnpm -F amarre lint     # ESLint
```

## Documentation

- [ECRIN Audit](../../docs/guide/audit/ecrin-audit.md) - Functional cards analysis

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

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

## Future Developments
