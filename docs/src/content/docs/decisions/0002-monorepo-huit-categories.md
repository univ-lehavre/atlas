---
title: 0002 — Monorepo organisé en 8 catégories
---

## Contexte

Le dépôt rassemble des applications web (SvelteKit), des services HTTP
(Hono), des bibliothèques publiées sur npm, des outils en ligne de
commande, des composants d'interface partagés et plusieurs bancs d'essai.
Sans règle de rangement, la frontière entre « bibliothèque publiable »,
« service exécutable » et « outil interne » se brouille rapidement,
avec des effets concrets : un paquet `packages/*` qui embarque un `bin`
(et donc tire des dépendances d'exécution non triviales), une app qui
dépend d'un dossier `sandbox/` instable, ou un service qui réimporte
silencieusement la couche présentation.

La structure plate (`packages/*` pour tout) a été testée puis écartée
parce qu'elle perd la nature de chaque paquet et oblige à lire chaque
`package.json` pour deviner si on regarde une lib, une app ou un outil.

## Décision

Le monorepo s'organise en **8 catégories** sous la racine, chacune avec
une définition stricte :

- `apps/` — applications SvelteKit déployables (front + endpoints).
- `assets/` — fichiers statiques (logos, icônes, jeux de données figés).
  Aucun `bin`, aucun code exécutable.
- `packages/` — bibliothèques TypeScript publiables sur npm. Aucun `bin`.
- `services/` — services HTTP autonomes (Hono).
- `cli/` — outils en ligne de commande (`bin` dans le `package.json`,
  packages séparés des bibliothèques métier qu'ils consomment).
- `ui/` — composants Svelte partagés (réutilisés par plusieurs `apps/`).
- `config/` — configurations partagées (ESLint, Prettier, TS).
- `sandbox/` — bancs d'essai, jamais consommés par `apps/`,
  `packages/`, `services/`, `cli/` ou `ui/`.

Les règles inter-catégories sont enforcées par
[`scripts/audit/workspace-structure.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/workspace-structure.mjs)
exécuté en pre-push et en CI via `pnpm audit:structure`. Toute dérogation
demande un ajout explicite dans le script (voir [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/))
et passe en revue de code.

## Statut

Accepted (2026-05-27, PR #211).

## Conséquences

**Bénéfices.** Le rangement physique d'un paquet documente sa nature.
Une publication accidentelle d'un outil interne devient bloquée à la
CI. Les dépendances peuvent être audit-ées par catégorie (`packages/`
ne doit pas importer `@sveltejs/kit` runtime, par exemple). La structure
est lisible par un nouveau contributeur sans consulter de wiki.

**Prix à payer.** Certaines décisions de rangement sont arbitraires
(un paquet peut tenir dans plusieurs catégories). Le coût de
refactorisation à chaque déplacement est non nul (chemins d'import,
CI, `pnpm-workspace.yaml`). Le script `audit:structure` doit être
maintenu en parallèle des règles, sous peine de devenir muet.

**Garde-fous.**

- Toute nouvelle catégorie demande un ADR (révision de celui-ci ou
  superseding).
- Toute dérogation est listée dans `workspace-structure.mjs` et tracée
  dans [ADR 0019](/atlas/decisions/0019-derogations-workspace-audit/).
- Voir [docs/architecture/monorepo.md](/atlas/architecture/monorepo/)
  pour la cartographie détaillée.
