# Find an Expert

Application web pour découvrir l'expertise des chercheurs via leurs publications et contributions.

## À propos

**Find an Expert** est un sous-projet d'ECRIN permettant de découvrir et analyser l'expertise des chercheurs à travers leurs publications (OpenAlex) et contributions GitHub. L'application facilite les connexions entre chercheurs, institutions et partenaires en identifiant les compétences et domaines d'expertise.

## Fonctionnalités

- **Recherche d'expertise** : Trouver des chercheurs par domaine, compétence ou mot-clé
- **Profils enrichis** : Publications (OpenAlex) et contributions (GitHub)
- **Analyse bibliographique** : Métriques de publications et collaborations
- **Visualisation** : Graphes de co-autorat et réseaux d'expertise

## Stack technique

- **Frontend** : SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend** : Appwrite (authentification, base de données)
- **APIs** : OpenAlex, GitHub
- **Build** : Vite 7, TypeScript 5.9

## Scripts

```bash
pnpm -F find-an-expert dev      # Développement
pnpm -F find-an-expert build    # Build production
pnpm -F find-an-expert test     # Tests
pnpm -F find-an-expert lint     # ESLint
```

## Documentation

- [Configuration technique](../../docs/guide/find-an-expert/technical-setup.md)
- [Configuration Appwrite](../../docs/guide/find-an-expert/appwrite-setup.md)
- [Design System](../../docs/guide/find-an-expert/design-system.md)
- [Architecture CSS](../../docs/guide/find-an-expert/css-architecture.md)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Find an Expert est un sous-projet d'**ECRIN**, la plateforme de collaboration pour chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="20">
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

## Licence

MIT
