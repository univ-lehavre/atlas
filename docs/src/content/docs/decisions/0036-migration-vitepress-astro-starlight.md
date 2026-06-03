---
title: "0036 — Migration de la documentation : VitePress → Astro Starlight"
---

## Contexte

La documentation du dépôt est construite avec **VitePress 1.6.4**. Or VitePress 1
déclare **Vite 5** en dépendance, alors que les six applications SvelteKit du
monorepo dépendent de **Vite 8**. Comme rien n'isolait la documentation, pnpm
résout **toute la chaîne sur un seul `vite@8.0.16`** (qui embarque **rolldown**)
— il n'y a **aucune occurrence de Vite 5** dans le lockfile, VitePress inclus.

Conséquence vérifiée :

- le **serveur de développement** (`vitepress dev`) est **cassé** : VitePress 1
  sur rolldown échoue à pré-bundler ses dépendances (`@braintree/sanitize-url`
  via le plugin Mermaid, chemin `optimizeDeps`), et la page servie reste une
  coquille vide (« VitePress v1 is not compatible with `rolldown-vite` ») ;
- le **build** (`vitepress build`) **passe encore**, par chance de _hoisting_
  pnpm — mais il est **fragile** : tout futur _bump_ de Vite/SvelteKit ou
  contrainte de CVE peut le faire basculer sans préavis.

C'est la **même famille de problème** que l'[ADR 0023](/atlas/decisions/0023-storybook-build-casse-amont/)
(`storybook:build` cassé par rolldown) : une incompatibilité d'écosystème, pas
un défaut de notre code.

Les issues de sortie par épinglage ont été explorées et **écartées** :

- **épingler Vite 5 pour VitePress** casse le _build_ (cible esbuild
  incompatible) et expose Vite 5 à des CVE non corrigées dans cette branche ;
- **migrer vers VitePress 2** (qui supporterait Vite 8) est impossible : VitePress 2
  est en **alpha**, et `vitepress-plugin-mermaid` — dont **dépendent quatre
  pages critiques** (carte des paquets, flux de données, évolution, monorepo) —
  déclare un _peer_ figé sur `vitepress: ^1.0.0` et **ne supporte pas la v2**.

Le dépôt est **généraliste et ouvert** ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)) :
une chaîne de documentation qui se casse au moindre _bump_ et dont le dev local
est inutilisable décourage les contributeurs. Il faut un outil **découplé** de
la chaîne Vite des applications.

## Décision

> **La documentation migre de VitePress vers Astro Starlight.** Astro embarque
> son propre Vite **interne** (non imposé en _peer_ au monorepo) : la
> documentation sort définitivement du conflit de version Vite que se disputent
> VitePress et les applications SvelteKit.

Astro Starlight a été retenu après une **analyse comparée** (VitePress, Astro
Starlight, Docusaurus, mdBook/Eleventy) et un **POC ciblé** sur le dépôt réel,
qui a validé les trois points à risque :

- **README de paquets inclus _en place_** (source unique) : une _content
  collection_ Astro lit `packages/*/README.md` **là où ils vivent**, sans copie ;
- **diagrammes Mermaid** : les 19 diagrammes de la page la plus lourde sont
  rendus via `astro-mermaid` ;
- **composants Vue** : ils sont exécutés via `@astrojs/vue` (≈ 80 % réutilisables
  sans réécriture).

Le POC a démarré le **dev en ~1,5 s** et bâti le site en ~6 s — là où le dev
VitePress était cassé.

### Pourquoi Astro plutôt que Docusaurus

- **Composants Vue préservés** : Astro exécute les `.vue` via `@astrojs/vue` ;
  Docusaurus (React) imposerait de **réécrire** les sept composants.
- **README en place** : les _content collections_ Astro acceptent un _glob_ vers
  des fichiers hors du dossier docs (`packages/*/README.md`), ce que Docusaurus
  ne fait que difficilement (multi-_plugins_, liens cassés). C'est un critère
  **décisif** pour ce dépôt (source unique des README de paquets).
- Docusaurus reste un repli crédible (Mermaid _first-party_, sortie totale de
  Vite) **si** la réécriture React devenait préférable ; il n'est pas retenu ici
  faute de gain justifiant la réécriture.

### Séquencement (migration progressive, plusieurs PR)

1. **Socle** : workspace `docs/` Astro Starlight isolé (i18n fr, base `/atlas/`,
   Mermaid, Vue, MDX), en parallèle de VitePress encore en place.
2. **Contenu** : les 65 pages Markdown (reprise quasi 1:1) + la navigation.
3. **README en place** : _content collection_ vers `packages/*/README.md` (et
   autres catégories), avec _remap_ des liens relatifs vers le code.
4. **Composants** : portage des sept composants Vue + du chargeur de données.
5. **Référence API** : intégration de la sortie TypeDoc (Markdown déjà découplé)
   - _remap_ des liens croisés et du dossier `_media/`.
6. **Anti-dérive** : réécriture de `audit:docs` (qui parse aujourd'hui la nav
   VitePress) vers la nav Starlight — **obligatoire**, sinon le filet de
   sécurité (pages orphelines, liens) devient aveugle.
7. **CI / Pages** : bascule du déploiement, puis **retrait de VitePress**.

## Statut

Accepted (2026-06-03). Remplace l'outillage acté implicitement autour de
VitePress ; conséquence directe de la contrainte décrite par l'[ADR 0023](/atlas/decisions/0023-storybook-build-casse-amont/)
(rolldown) appliquée à la documentation, et au service de l'ouverture posée par
l'[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/).

## Conséquences

**Bénéfices.** La documentation est **découplée** de la chaîne Vite des
applications : plus d'impasse de version, dev local fonctionnel (~1,5 s),
_build_ rapide. Les README de paquets restent **source unique** (inclus en
place). Mermaid, les composants Vue et l'i18n français sont préservés. Le dépôt
gagne en **reprenabilité** par des contributeurs tiers.

**Prix à payer.** La migration est un **chantier réel** (≈ 7–12 jours,
plusieurs PR). Trois coûts obligatoires : réécrire `audit:docs` (couplé à la nav
VitePress) ; _remapper_ les liens croisés de la référence TypeDoc (~1 600
fichiers) ; gérer les liens relatifs des README sortis de leur contexte. Astro
introduit une nouvelle dépendance d'écosystème (que l'isolation en _workspace_
confine à `docs/`).

**Garde-fous.**

- La migration est **progressive** : VitePress reste en place jusqu'à ce
  qu'Astro le remplace entièrement ; on ne retire VitePress qu'à la dernière
  étape, une fois la CI verte sur Astro.
- L'**anti-dérive** ([ADR 0028](/atlas/decisions/0028-documentation-verifiable/)) est rétablie
  avant le retrait de VitePress : `audit:docs` réécrit pour la nav Starlight,
  contrôle des liens et des pages orphelines maintenu.
- La documentation **reste en français** ([ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/))
  et le **déploiement reste GitHub Pages** sous `/atlas/`.
- Le _workspace_ `docs/` isole les dépendances Astro du reste du monorepo : la
  chaîne Vite des applications n'est pas affectée.
