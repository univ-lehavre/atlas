---
title: "0023 — `storybook:build` cassé en amont (Storybook 10.4 / Svelte 5.55 / rolldown)"
---

## Contexte

`ui/atlas-ui` documente ses composants via Storybook (`storybook dev`
pour le travail interactif, `storybook:build` pour le bundle statique).
Le système de theming opt-in de la Phase 10.1 du
[plan de résorption 2026-05-30](/atlas/plans/2026-05-30-resorption/) ajoute
deux stories (`Theming`) montrant un thème par défaut et un thème
alternatif. Le critère de sortie de l'étape 10.1 mentionnait
`storybook:build` comme validation.

Or `storybook:build` **échoue déjà sur `main`**, indépendamment de la
Phase 10. La vérification par `git stash` (working tree theming retiré,
retour à la baseline propre) reproduit exactement la même erreur :

```
node_modules/.pnpm/@storybook+svelte@10.4.1_.../static/createReactiveProps.svelte.js:2:12
The `$` name is reserved, and cannot be used for variables and imports
```

La cause est interne à `@storybook/svelte@10.4.1` : un de ses assets
`.svelte.js` pré-compilés (`createReactiveProps.svelte.js`, généré par
Svelte 5.55.9) déclare un identifiant `$` que **rolldown** (le bundler
de Vite 8) refuse — `$` est réservé en Svelte 5. C'est une
incompatibilité de versions dans la chaîne Storybook → Svelte → Vite/
rolldown, pas un défaut du code d'`atlas-ui`.

Un second symptôme, lui **résolu** en Phase 10.1, masquait le premier :
`AnonymousHome.svelte` initialisait un `$state` directement depuis une
prop (`researchers`), ce que Svelte 5 signale (`state_referenced_locally`)
et que `storybook:build` promeut en erreur. Corrigé via `untrack(...)`
(l'intention « snapshot unique de la valeur initiale » est désormais
explicite).

## Décision

`storybook:build` n'est **pas** un bloqueur de la Phase 10, ni un check
CI. Constats qui justifient ce choix :

- `storybook:build` **n'est ni dans la CI** (`.github/workflows/`) **ni
  dans turbo** (`turbo.json`) ni dans aucun hook git. Aucun gate ne
  l'exécute ; il ne peut donc pas « passer au rouge ».
- La panne est **pré-existante** à la Phase 10 et **externe** au code du
  monorepo (asset bundlé d'une dépendance).
- Storybook reste utilisable en **mode dev** (`storybook dev -p 6006`),
  qui n'emprunte pas le chemin de build statique fautif. Le theming et
  ses 2 thèmes sont donc visualisables localement.

La résorption (mise à niveau de la chaîne Storybook/Svelte/rolldown,
ou contournement du bundling de l'asset fautif) est une **dette à part
entière**, tracée ici, à reprendre quand une version de
`@storybook/svelte` compatible Svelte 5.55 + rolldown 1.x sera
disponible. Item sine die (cf. [ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/)).

## Statut

Accepted (2026-06-01).

## Conséquences

**Bénéfices.** La Phase 10 n'est pas bloquée par une dette d'outillage
amont. Le warning Svelte 5 réel (`AnonymousHome`) est corrigé au
passage — c'était un bug latent (l'état de rotation ne se resynchronisait
pas si la prop `researchers` changeait, désormais explicitement voulu).

**Prix à payer.** Le bundle Storybook statique n'est pas produit tant
que la chaîne n'est pas remise à niveau ; pas de Storybook publié /
déployé sur cette base. Le risque est qu'une story se casse sans qu'un
build statique le détecte — atténué par les tests level-1 vitest
(Phase 10.2) qui montent réellement les composants.

**Garde-fous.**

- Si `storybook:build` est un jour ajouté à la CI, cet ADR doit être
  résolu (chaîne mise à niveau) **avant**, sinon le check naîtra rouge.
- L'audit semestriel revérifie la disponibilité d'une version
  `@storybook/svelte` compatible et clôt cette dette le cas échéant.
