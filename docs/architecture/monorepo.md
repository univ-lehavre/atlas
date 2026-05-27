# Structure du monorepo

Un **monorepo** est un seul dépôt Git qui héberge plusieurs projets logiciels, avec des règles partagées. Atlas en est un.

Atlas organise ses projets en **huit catégories**. Chaque catégorie a une responsabilité précise et des **règles propres** : framework imposé, dépendances autorisées ou interdites, présence ou absence d'un point d'entrée exécutable, etc. Le placement d'un sous-projet dans une catégorie indique d'emblée son rôle, et les règles sont vérifiées automatiquement par `pnpm audit:structure`.

## Vue d'ensemble

| Catégorie                                                               | Contenu                                                      | Convention de nommage                                 | Publié sur npm ?      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- | --------------------- |
| [`apps/`](https://github.com/univ-lehavre/atlas/tree/main/apps)         | Applications web destinées aux utilisateurs finaux           | `@univ-lehavre/atlas-<nom-du-dossier>`                | Non (`private: true`) |
| [`assets/`](https://github.com/univ-lehavre/atlas/tree/main/assets)     | Fichiers statiques versionnés (logos, images, polices)       | `@univ-lehavre/atlas-<nom>`                           | Variable              |
| [`packages/`](https://github.com/univ-lehavre/atlas/tree/main/packages) | Bibliothèques TypeScript réutilisables                       | `@univ-lehavre/atlas-<nom>`                           | Oui                   |
| [`services/`](https://github.com/univ-lehavre/atlas/tree/main/services) | Serveurs HTTP déployés en backend                            | `@univ-lehavre/atlas-<nom>`                           | Oui                   |
| [`cli/`](https://github.com/univ-lehavre/atlas/tree/main/cli)           | Outils en ligne de commande, courts, qui consomment les libs | `@univ-lehavre/atlas-<nom>-cli` (dossier sans `-cli`) | Oui                   |
| [`ui/`](https://github.com/univ-lehavre/atlas/tree/main/ui)             | Composants d'interface Svelte partagés                       | `@univ-lehavre/atlas-ui`                              | Variable              |
| [`config/`](https://github.com/univ-lehavre/atlas/tree/main/config)     | Configurations communes (style, types, formatage)            | `@univ-lehavre/atlas-<nom>-config`                    | Oui                   |
| [`sandbox/`](https://github.com/univ-lehavre/atlas/tree/main/sandbox)   | Environnements Docker pour tests d'intégration               | Pas de convention spécifique                          | Non                   |

## Diagramme des dépendances

Les flèches indiquent **« utilise »**. Les projets en haut dépendent de ceux en bas, jamais l'inverse.

```mermaid
graph TB
    APPS["apps/<br/>(applications)"]
    CLI["cli/<br/>(ligne de commande)"]
    SERVICES["services/<br/>(serveurs HTTP)"]
    UI["ui/<br/>(composants Svelte)"]
    PACKAGES["packages/<br/>(bibliothèques)"]
    ASSETS["assets/<br/>(fichiers statiques)"]
    CONFIG["config/<br/>(configurations)"]

    APPS --> UI
    APPS --> PACKAGES
    CLI --> PACKAGES
    CLI --> ASSETS
    SERVICES --> PACKAGES
    UI --> PACKAGES
    APPS -.-> CONFIG
    PACKAGES -.-> CONFIG
    SERVICES -.-> CONFIG
    CLI -.-> CONFIG
    UI -.-> CONFIG
```

Trait plein : dépendance d'exécution. Trait pointillé : dépendance de développement (configurations TypeScript, ESLint, Prettier).

`sandbox/` est isolé : **aucune autre catégorie ne peut dépendre d'un projet de `sandbox/`**.

## Principes par catégorie

Chaque catégorie a une responsabilité unique. Les règles ci-dessous sont enforcées par le script `pnpm audit:structure` (cf. [scripts/audit/workspace-structure.mjs](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/workspace-structure.mjs)).

### `apps/` — applications utilisateur

**Rôle.** Front-end SvelteKit déployable, livré à des utilisateurs finaux. Chaque app a son cycle de vie (déploiement, versionnage applicatif via Changesets, _bundle_) indépendant.

**Règles.**

- Le nom du paquet est `@univ-lehavre/atlas-<nom-du-dossier>` (le préfixe `atlas-` est ajouté automatiquement si le dossier ne commence pas par `atlas-`).
- `private: true` — une app n'est jamais publiée sur npm.
- Doit dépendre de `@sveltejs/kit` **et** `svelte`.
- Pas de `bin` field (une app n'est pas un exécutable en ligne de commande).
- **Ne peut pas dépendre d'une autre app** — le code partagé doit être extrait vers `packages/` ou `ui/`.

### `packages/` — bibliothèques réutilisables

**Rôle.** Code métier, pur, sans dépendance vers une interface utilisateur ni vers un terminal. C'est le cœur logique du dépôt, consommé par `apps/`, `services/`, `cli/` et `ui/`.

**Règles.**

- Pas de `bin` field — les exécutables en ligne de commande vivent dans `cli/`.
- **Pas de dépendance d'I/O terminal.** Les bibliothèques d'interaction CLI (`@clack/prompts`, `yargs`, `commander`, `meow`, `inquirer`, `prompts`) sont interdites en `dependencies`.
- **Pas d'import de modules terminal.** `node:readline`, `node:tty`, `'readline'`, `'tty'` sont interdits dans les sources `packages/*/src/`.
- **Pas de Svelte ni SvelteKit en `dependencies`.** Si une bibliothèque a besoin de types Svelte, les déclarer en `peerDependencies` (optionnel) ou en `devDependencies` (pour le développement). Les imports runtime de `svelte`, `@sveltejs/kit`, `$app/`, `$lib/` sont interdits dans les sources.
- **Pas de framework HTTP de routage** (`hono`, `express`, `fastify`, `koa`, `polka`) — le routage HTTP appartient à `services/`.
- **Objectif de couverture de tests** élevé (cible 100 %), car ces bibliothèques sont consommées partout.

### `services/` — serveurs HTTP

**Rôle.** Serveurs HTTP déployés en backend (par exemple : un service de proxy vers REDCap). Utilisent le framework [Hono](https://hono.dev/).

**Règles.**

- Pas de `bin` field.
- **Doit dépendre de `hono`.**
- **Doit dépendre d'au moins un paquet `@univ-lehavre/atlas-*` interne** — la logique métier vit dans `packages/`, le service est une fine couche de routage.
- **Ne peut pas dépendre d'un autre service** — la logique commune doit être extraite vers `packages/`.

### `cli/` — outils en ligne de commande

**Rôle.** Exécutables Node.js exposés à l'utilisateur en ligne de commande. Restent **fins** : parsent les arguments, appellent une bibliothèque de `packages/`, formatent la sortie.

**Règles.**

- **Le dossier ne doit pas se terminer par `-cli`.** Exemple : `cli/net/` (pas `cli/net-cli/`).
- **Le paquet doit se terminer par `-cli`** sauf exception explicitée dans le script d'audit (cas historique : `@univ-lehavre/atlas-crf-openapi`).
- **Doit avoir un `bin` field** pointant vers l'exécutable.
- **Doit dépendre d'au moins un paquet `@univ-lehavre/atlas-*` interne** — la logique métier vit dans `packages/`, le CLI est une fine couche d'I/O terminal.
- C'est ici que vivent les dépendances d'I/O terminal (`@clack/prompts`, `yargs`, etc.).

### `ui/` — composants d'interface partagés

**Rôle.** Bibliothèque de composants Svelte réutilisés par plusieurs applications.

**Règles.**

- Pas de `bin` field.
- **`svelte` doit être déclaré en `peerDependencies`**, pas en `dependencies` — l'application hôte fournit sa version.
- **Pas de dépendances CLI I/O** ni HTTP de routage.
- **Pas d'imports server-only** dans les sources : `@sveltejs/kit/node`, `server-only`, `$env/static/private`, `$env/dynamic/private` sont interdits. La logique serveur appartient aux _hooks_ SvelteKit des applications (`apps/<nom>/src/hooks.server.ts`).

### `config/` — configurations communes

**Rôle.** Paquets qui exportent des configurations partagées (préréglages ESLint, TypeScript, Prettier, etc.). Consommés par tous les autres projets.

**Règles.**

- Pas de `bin` field.
- Doit pouvoir être consommé via `import` dans un fichier de configuration (par exemple `eslint.config.js` qui importe `@univ-lehavre/atlas-shared-config`).

### `assets/` — fichiers statiques

**Rôle.** Fichiers statiques versionnés : logos, images, polices, données figées. **Aucun code exécutable.** Consommés par les apps (souvent via un CLI d'installation qui copie les fichiers vers le dossier `static/` de l'app).

**Règles.**

- Pas de `bin` field — un outil d'installation va dans `cli/`, jamais ici.
- **Pas de dépendances runtime** (`dependencies` doit être vide ou absent). Les _devDependencies_ sont autorisées (par exemple `vitest` pour vérifier la présence des fichiers).
- Peut être publié sur npm (cas de `@univ-lehavre/atlas-logos`) ou privé selon le besoin.

### `sandbox/` — environnements de test

**Rôle.** Stacks Docker Compose pour reproduire localement les dépendances externes (Appwrite, REDCap, Mailpit, etc.) afin d'exécuter les tests d'intégration et les scénarios _end-to-end_.

**Règles.**

- **Isolation totale** : aucune autre catégorie (`apps/`, `packages/`, etc.) ne peut dépendre d'un paquet de `sandbox/`. Les dépendances vont uniquement dans l'autre sens : `sandbox/` peut importer du code du dépôt pour ses besoins propres.
- Pas publié sur npm.

## Conventions transverses

### Nommage des paquets

- Tous les paquets internes sont préfixés par `@univ-lehavre/atlas-`.
- Le chemin du dossier dans le dépôt correspond au suffixe : `packages/auth/` → `@univ-lehavre/atlas-auth`.

### `repository.directory`

Si le `package.json` déclare un champ `repository.directory`, il **doit** correspondre au chemin réel du paquet dans le dépôt. Permet à npm d'afficher correctement le lien « source » dans la page du paquet.

### Pas de cycles de dépendances

Le script d'audit détecte les cycles dans le graphe des dépendances internes (`@univ-lehavre/atlas-*` → `@univ-lehavre/atlas-*`) et fait échouer la vérification. Un cycle signale une responsabilité mal placée : il faut extraire la zone commune dans un nouveau paquet `packages/*`.

## Vérifier la structure

Avant d'ouvrir une pull request qui ajoute, déplace ou modifie un sous-projet :

```bash
pnpm audit:structure
```

Le script signale, ligne par ligne, chaque écart par rapport aux règles ci-dessus. Il est lancé en CI dans le _workflow_ `ci.yml` (job `audit`).

## Outils du monorepo

Trois outils principaux organisent la vie quotidienne du dépôt :

- **[pnpm](https://pnpm.io/)** (gestionnaire de paquets) installe les dépendances en partageant un cache global et isole chaque sous-projet via les _workspaces_ (fichier [`pnpm-workspace.yaml`](https://github.com/univ-lehavre/atlas/blob/main/pnpm-workspace.yaml))
- **[turbo](https://turbo.build/)** (orchestrateur de tâches) parallélise les commandes (`build`, `test`, `lint`…) à travers les sous-projets et met en cache les résultats : un projet déjà construit n'est pas reconstruit
- **[Changesets](https://github.com/changesets/changesets)** gère le versionnage : chaque pull request qui modifie un paquet publiable joint un fichier `.changeset/*.md` décrivant le changement et son impact (`patch`, `minor`, `major`)
