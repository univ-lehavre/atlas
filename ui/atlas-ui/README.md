# @univ-lehavre/atlas-ui

Composants Svelte partagés du monorepo Atlas. Le package est aussi une app SvelteKit minimale, ce qui permet à Storybook de tourner natif (sans plomberie pour `$app/*` ou `$env/*`).

## Storybook

```bash
pnpm -F @univ-lehavre/atlas-ui storybook
# → http://localhost:6006
```

Une story par composant exporté (cf. `src/lib/<Composant>.stories.ts`).

## Ajouter un composant

1. `src/lib/MyComponent.svelte`
2. Re-exporter depuis `src/lib/index.ts`.
3. `src/lib/MyComponent.stories.ts` avec ses variations.

Les composants sont consommés par les apps via :

```ts
import MyComponent from "@univ-lehavre/atlas-ui/MyComponent.svelte";
// ou
import { MyComponent } from "@univ-lehavre/atlas-ui";
```

## Pourquoi un SvelteKit app (et pas une simple lib) ?

`@storybook/sveltekit` exige un contexte SvelteKit pour résoudre `$app/forms`, `$app/paths`, `$env/static/public`. Construire ce contexte à la main est plus brittle que d'avoir une vraie app shell. Le `static` adapter ici garantit qu'on ne déploie jamais ce package — il sert uniquement de socle local pour les composants et leur preview.

## Rapport avec apps/amarre

Cette migration vit dans [`docs/refactor-amarre-ui-migration.md`](../../docs/refactor-amarre-ui-migration.md) (à venir si on étend la doc). Pour l'historique : les 15 composants `apps/amarre/src/lib/ui/` ont été déplacés ici lors du big-bang initial. Les composants couplés à des types amarre (Collaborate, Request) ont été généralisés via des props typées.
