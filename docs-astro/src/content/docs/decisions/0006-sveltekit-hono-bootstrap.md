---
title: 0006 — SvelteKit, Hono et Bootstrap comme socle
---

## Contexte

Le monorepo doit servir des applications interactives (formulaires,
graphes, recherche d'expertise), des endpoints HTTP côté serveur, et
un style de base partagé entre apps. Trois briques sont à choisir :

- **Le framework d'apps** — rendu serveur + navigateur depuis une seule
  source, avec routing et hydratation. Alternatives évaluées :
  Next.js (React), Nuxt (Vue), SvelteKit, Remix.
- **Le framework de services HTTP** — léger, type-safe, déployable sur
  divers runtimes (Node, Bun, edge). Alternatives évaluées : Express,
  Fastify, Hono, Elysia.
- **Le système de design de base** — couvre le grid, la typographie,
  les composants courants sans imposer un design propriétaire.
  Alternatives évaluées : Tailwind seul, Bootstrap, design system
  custom.

## Décision

- **SvelteKit** pour toutes les applications interactives
  (`apps/amarre`, `apps/ecrin`, `apps/find-an-expert`, dashboards).
- **Hono** pour les services HTTP autonomes (`services/crf`).
- **Bootstrap** comme système de design de base pour les apps, avec
  des composants Svelte de surcouche dans [`ui/atlas-ui`](https://github.com/univ-lehavre/atlas/tree/main/ui/atlas-ui).

## Statut

Accepted.

## Conséquences

**Bénéfices.** SvelteKit donne un rendu serveur et un client hydraté
depuis une seule arborescence de routes, avec moins de boilerplate que
Next.js. Hono est compatible Effect (typage des handlers, validation
intégrée) et tourne sur tout runtime moderne. Bootstrap est universellement
connu : un contributeur extérieur retrouve ses repères sans onboarding.

**Prix à payer.** Svelte 5 (runes) est récent et les bibliothèques tierces
ne sont pas toutes à jour. Bootstrap impose `style-src 'unsafe-inline'`
dans la CSP (voir [ADR 0019](0019-derogations-workspace-audit)) parce
que ses composants injectent des styles inline. Hono a un écosystème
plus petit que Express ou Fastify.

**Garde-fous.**

- Les composants partagés vivent dans `ui/atlas-ui/` plutôt que dans
  chaque app, pour qu'un changement visuel n'oblige pas à faire le tour.
- Les services Hono utilisent les middlewares Effect pour la
  validation et le logging, pas des middlewares Hono ad hoc.
- Tout passage à un autre framework demande un ADR explicite.
- Voir [docs/architecture/tech-choices.md](../architecture/tech-choices)
  pour les versions cibles et les patterns.
