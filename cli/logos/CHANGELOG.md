# @univ-lehavre/atlas-logos-cli

## 2.0.1

### Patch Changes

- [#250](https://github.com/univ-lehavre/atlas/pull/250) [`178dca4`](https://github.com/univ-lehavre/atlas/commit/178dca44aef7696c148adb6152b9f6885f25528e) Thanks [@chasset](https://github.com/chasset)! - Première publication de ces 8 CLIs sur les registres npm (npmjs.org +
  GitHub Packages). Le code est inchangé ; ce bump `patch` déclenche
  simplement leur release initiale via le pipeline Changesets existant
  (cf. [ADR 0017](docs/decisions/0017-releases-npm-oidc-deux-registres.md)).
  `atlas-biblio-cli` était déjà publié et n'est pas concerné.

## 2.0.0

### Major Changes

- [#211](https://github.com/univ-lehavre/atlas/pull/211) [`fc5dfb6`](https://github.com/univ-lehavre/atlas/commit/fc5dfb6244bc116ecae3fb51ceb8828f7dad2cd7) Thanks [@chasset](https://github.com/chasset)! - Création de la catégorie `assets/` et extraction du CLI d'installation des logos.
  - `@univ-lehavre/atlas-logos` (auparavant `packages/logos`) est désormais dans `assets/logos/`. Le paquet **ne contient plus que des fichiers statiques** (PNG, SVG, JPG). Le `bin` `atlas-logos-install` a été retiré (**breaking change**) — l'outil est maintenant dans `@univ-lehavre/atlas-logos-cli`.
  - `@univ-lehavre/atlas-logos-cli` est nouveau. Il expose le `bin` `atlas-logos-install <target-dir>` qui résout `@univ-lehavre/atlas-logos` via `createRequire` et copie les fichiers dans le répertoire cible.
  - Les apps `amarre`, `ecrin` et `find-an-expert` consomment désormais `@univ-lehavre/atlas-logos-cli` dans `devDependencies` (au lieu de `@univ-lehavre/atlas-logos` dans `dependencies`). Le script `prepare` reste inchangé : `atlas-logos-install static/logos`.

  Migration pour un consommateur externe utilisant le bin :

  ```diff
  - "dependencies": { "@univ-lehavre/atlas-logos": "^1.2.0" }
  + "devDependencies": { "@univ-lehavre/atlas-logos-cli": "^1.0.0" }
  ```

  Aucun changement pour les consommateurs qui importent directement les fichiers (`@univ-lehavre/atlas-logos/ulhn.svg`, etc.) : ce chemin reste identique en 2.0.0.

### Patch Changes

- Updated dependencies [[`fc5dfb6`](https://github.com/univ-lehavre/atlas/commit/fc5dfb6244bc116ecae3fb51ceb8828f7dad2cd7)]:
  - @univ-lehavre/atlas-logos@3.0.0
