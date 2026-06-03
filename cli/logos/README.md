# @univ-lehavre/atlas-logos-cli

Outil en ligne de commande qui copie les logos Atlas dans un répertoire cible — typiquement le dossier `static/` d'une application SvelteKit, pour que les logos soient servis directement par l'application.

## Installation

Dans une app du monorepo :

```jsonc
// package.json
{
  "devDependencies": {
    "@univ-lehavre/atlas-logos-cli": "workspace:*",
  },
  "scripts": {
    "prepare": "svelte-kit sync || echo '' && atlas-logos-install static/logos",
  },
}
```

Le bin `atlas-logos-install` devient disponible dans `node_modules/.bin/` après `pnpm install`.

## Usage

```bash
atlas-logos-install <répertoire-cible>
```

Exemple :

```bash
atlas-logos-install static/logos
```

Copie tous les fichiers `.png`, `.svg` et `.jpg` du paquet `@univ-lehavre/atlas-logos` vers le répertoire cible (créé s'il n'existe pas).

## Pourquoi ce CLI

Les logos sont des **assets statiques** versionnés dans [`assets/logos/`](https://github.com/univ-lehavre/atlas/tree/main/assets/logos). Les apps SvelteKit ont besoin que ces fichiers soient présents dans leur dossier `static/` pour les servir via leurs URLs publiques.

Ce CLI résout la dépendance `@univ-lehavre/atlas-logos`, lit son répertoire et copie les assets — alternative robuste à un plugin Vite ou à un symlink manuel.
