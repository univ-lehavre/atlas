# Documentation technique

Cette section contient la documentation technique d'Atlas destinée aux développeurs.

> **Vous êtes chercheur ?** Consultez plutôt :
> - [Accueil Atlas](../) - Présentation générale
> - [Guide Atlas Verify](/projects/citations/user/) - Documentation utilisateur pour les chercheurs

## Vue d'ensemble

Atlas est un monorepo TypeScript utilisant [Effect](https://effect.website/) pour la programmation fonctionnelle et la gestion des erreurs.

### Structure du projet

```
atlas/
├── apps/
│   └── ecrin/              # Dashboard SvelteKit (Zero Trust)
├── packages/
│   ├── crf/                # REDCap client, server, CLI
│   ├── net/                # Utilitaires réseau
│   └── typescript-config/  # Config TypeScript partagée
├── infra/                  # Infrastructure Kubernetes
└── docs/                   # Documentation (ce site)
```

### Stack technique

| Domaine | Technologies |
|---------|--------------|
| Runtime | Node.js 20+, TypeScript 5.x |
| Framework | Effect (programmation fonctionnelle) |
| Frontend | SvelteKit 2, Svelte 5 (runes) |
| Package manager | pnpm (workspaces) |
| Build | Vite, tsup |
| Test | Vitest |
| Lint | ESLint, Prettier |
| Kubernetes | k3d (dev), k3s (prod), Cilium, SPIRE, OPA |

## Documentation par domaine

### Atlas CRF (REDCap)

| Document | Description |
|----------|-------------|
| [Client et serveur](/projects/crf/) | Intégration REDCap avec Effect |
| [Outils CLI](./cli.md) | Commandes en ligne |

### Atlas Citations

| Document | Description |
|----------|-------------|
| [Vue d'ensemble](/projects/citations/dev/) | Architecture des packages |
| [Sources bibliographiques](/projects/citations/dev/sources/) | Clients par source |
| [Atlas Verify](/projects/citations/dev/author-verification) | Système de fiabilisation |

### Infrastructure

| Document | Description |
|----------|-------------|
| [Architecture générale](./architecture.md) | Patterns Effect, ESLint, scripts |
| [Infrastructure Zero Trust](./infrastructure.md) | Kubernetes, sécurité |

### Audits

| Document | Description |
|----------|-------------|
| [Audit des dépendances](/audit/common/dependencies-audit) | Inventaire et roadmap de mise à jour |

## Démarrage rapide

### Installation

```bash
# Cloner le repo
git clone https://github.com/univ-lehavre/atlas.git
cd atlas

# Installer les dépendances
pnpm install

# Lancer en développement
pnpm dev
```

### Commandes principales

```bash
pnpm dev          # Développement avec hot-reload
pnpm build        # Build tous les packages
pnpm test         # Tests unitaires
pnpm lint         # Vérification du code
pnpm ready        # Vérifications pré-commit complètes
```

### Configuration REDCap

```bash
# Variables d'environnement
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=YOUR_32_CHAR_HEXADECIMAL_TOKEN

# Tester la connexion
pnpm -F @univ-lehavre/crf crf-redcap test
```

<RepoDynamics />

## Contribuer

1. Créer une branche depuis `main`
2. Faire vos modifications
3. Lancer `pnpm ready` pour vérifier
4. Créer une Pull Request

Voir le [CONTRIBUTING.md](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) pour plus de détails.
