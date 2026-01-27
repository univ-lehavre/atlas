# Find an Expert

Application web pour découvrir et analyser l'expertise des chercheurs via leurs publications et contributions.

## About

**Find an Expert** (anciennement Talent Finder) permet de découvrir et analyser l'expertise des chercheurs à travers leurs publications (OpenAlex) et contributions GitHub. Elle facilite les connexions entre chercheurs, institutions et partenaires en identifiant les compétences et domaines d'expertise.

## Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: Appwrite
- **APIs**: OpenAlex, GitHub
- **Build**: Vite 7, TypeScript 5.9

## Scripts

```bash
pnpm -F find-an-expert dev      # Développement
pnpm -F find-an-expert build    # Build production
pnpm -F find-an-expert test     # Tests
pnpm -F find-an-expert lint     # ESLint
```

## Documentation

- [Technical Setup](../../docs/guide/find-an-expert/technical-setup.md)
- [Appwrite Setup](../../docs/guide/find-an-expert/appwrite-setup.md)
- [Design System](../../docs/guide/find-an-expert/design-system.md)
- [CSS Architecture](../../docs/guide/find-an-expert/css-architecture.md)

## ECRIN

Ce projet fait partie d'**ECRIN**, une initiative collaborative entre :

- **[Université Le Havre Normandie](https://www.univ-lehavre.fr/)**
- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**
- **[EUNICoast](https://eunicoast.eu/)** (alliance universitaire européenne)

---

<p align="center">
  <a href="https://www.cptmp.fr/">
    <img src="./static/logos/cptmp.png" alt="CPTMP" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.univ-lehavre.fr/">
    <img src="./static/logos/ulhn.svg" alt="ULHN" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="./static/logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</p>
