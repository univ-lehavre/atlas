# AMARRE

[![DOI](https://zenodo.org/badge/1107483862.svg)](https://doi.org/10.5281/zenodo.17775106)

Research network visualization and analysis module.

## About

**AMARRE** is a major Atlas module for visualizing and analyzing research networks through interactive graphs. The application allows researchers to discover connections and understand the structure of their scientific community.

## Features

- **Interactive graphs**: Network visualization with zoom, pan, and selection
- **Network analysis**: Centrality metrics, clustering, community detection
- **Export**: Graph export in various formats
- **Filtering**: Filter by attributes, date, relationship type

## Technical Stack

- **Frontend**: SvelteKit 2, Svelte 5
- **Visualization**: Sigma.js, Graphology, ForceAtlas2
- **Backend**: Appwrite (authentication, database)

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
