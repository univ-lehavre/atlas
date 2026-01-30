# ECRIN

Collaboration platform for researchers.

## About

**ECRIN** is a major Atlas module that allows researchers to present their work, find collaborators, visualize research networks, and manage their data. The application is organized around 6 functional cards.

## Features

- **Introduce**: Share your scientific question and references
- **Collaborate**: Create projects, build teams, find experts
- **Explore**: Visualize your personal network and the community graph
- **Ask**: Search for data and experts
- **Publish**: Share your datasets and news
- **Administrate**: Manage your account and surveys

## Technical Stack

- **Frontend**: SvelteKit 2, Svelte 5, Bootstrap 5
- **Backend**: Appwrite (authentication, database)
- **Data**: REDCap (surveys)
- **Visualization**: Sigma.js, Graphology, ForceAtlas2

## Scripts

```bash
pnpm -F ecrin dev      # Development
pnpm -F ecrin build    # Production build
pnpm -F ecrin test     # Tests
pnpm -F ecrin lint     # ESLint
```

## Architecture: The 6 Cards

### "Introduce" Card

| Sub-card               | Description                 | Status    |
| ---------------------- | --------------------------- | --------- |
| My scientific question | Describe your research      | Interface |
| My references          | Reference your publications | Interface |

### "Collaborate" Card

| Sub-card          | Description              | Status            |
| ----------------- | ------------------------ | ----------------- |
| Create my project | Declare a project        | Functional        |
| Build my team     | Search for collaborators | Partial           |
| Find an expert    | Connect with experts     | -> find-an-expert |
| Fund my project   | Search for funding       | Interface         |

### "Explore" Card

| Sub-card        | Description                     | Status     |
| --------------- | ------------------------------- | ---------- |
| My graph        | Visualize your personal network | Functional |
| Community graph | See community connections       | Functional |

### "Ask" Card

| Sub-card           | Description               | Status    |
| ------------------ | ------------------------- | --------- |
| Data               | Search for data           | Interface |
| Expert by location | Find an expert by area    | Interface |
| Expert by topic    | Find an expert by subject | Interface |

### "Publish" Card

| Sub-card | Description      | Status    |
| -------- | ---------------- | --------- |
| My data  | Publish datasets | Interface |
| My news  | Write articles   | Interface |

### "Administrate" Card

| Sub-card        | Description        | Status     |
| --------------- | ------------------ | ---------- |
| Sign up         | Create an account  | Functional |
| Log out         | End the session    | Functional |
| Delete account  | Delete your data   | Functional |
| Download survey | Export your data   | Functional |
| Delete survey   | Remove from REDCap | Functional |

## Sub-projects

| Application                          | Description                                     |
| ------------------------------------ | ----------------------------------------------- |
| [find-an-expert](../find-an-expert/) | Expertise discovery via publications and GitHub |
| [amarre](../amarre/)                 | Research network visualization                  |

## Documentation

- [ECRIN Audit](../../docs/guide/audit/ecrin-audit.md) - Complete analysis of the 6 cards

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
