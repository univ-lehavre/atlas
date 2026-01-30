# Documentation technique ECRIN

Documentation technique pour les développeurs travaillant sur le projet ECRIN.

> **Vous êtes chercheur ?** Consultez plutôt le [Guide chercheur ECRIN](/projects/ecrin/user/).

## Applications

Le projet ECRIN comprend deux applications SvelteKit :

| Application | Version | Description |
|-------------|---------|-------------|
| **Find an Expert** | 0.5.1 | Découverte et analyse de l'expertise des chercheurs via OpenAlex et GitHub |
| **ECRIN** | 2.0.0 | Plateforme de collaboration avec enquêtes REDCap et visualisation de graphes |

## État du développement

### Authentification

| Fonctionnalité | Find an Expert | ECRIN |
|----------------|----------------|-------|
| Magic Link (email) | ✅ Opérationnel | ✅ Opérationnel |
| Gestion de sessions | ✅ Opérationnel | ✅ Opérationnel |
| Routes protégées | ✅ Opérationnel | ✅ Opérationnel |
| Suppression de compte | - | ✅ Opérationnel |

### Intégrations API

| Source | Statut | Détails |
|--------|--------|---------|
| **OpenAlex** | Partiel | Recherche d'institutions opérationnelle, profils chercheurs à développer |
| **GitHub** | Partiel | Parsing d'URLs et stats git locales, API GitHub non connectée |
| **REDCap** | ✅ Opérationnel | Export enquêtes, génération de liens, suppression d'enregistrements |
| **Appwrite** | ✅ Opérationnel | Auth, collections consent-events et current-consents |

### Fonctionnalités métier

| Fonctionnalité | Statut | Application |
|----------------|--------|-------------|
| Recherche d'institutions | ✅ Opérationnel | Find an Expert |
| Gestion du consentement | ✅ Opérationnel | Find an Expert |
| Health monitoring | ✅ Opérationnel | Find an Expert |
| Génération liens enquête | ✅ Opérationnel | ECRIN |
| Export enquêtes (JSON) | ✅ Opérationnel | ECRIN |
| Visualisation graphes | ✅ Opérationnel | ECRIN |
| Graphes de collaboration | ✅ Opérationnel | ECRIN |

## Cartes fonctionnelles

L'application ECRIN est organisée en **6 sections** avec **15 cartes** au total.

| Section | Cartes | Opérationnelles | En cours |
|---------|--------|-----------------|----------|
| Introduce | 3 | 0 | 3 |
| Collaborate | 4 | 1 | 3 |
| Explore | 2 | 1 | 1 |
| Ask | 2 | 0 | 2 |
| Publish | 2 | 0 | 2 |
| Administrate | 2 | 2 | 0 |
| **Total** | **15** | **4** | **11** |

### Détail par section

#### Section Introduce

| Carte | État | Composant |
|-------|------|-----------|
| Me | 🚧 UI implémentée | `Introduce.svelte` |
| My scientific question | 🚧 UI implémentée | `Introduce.svelte` |
| My references | 🚧 UI implémentée | `Introduce.svelte` |

#### Section Collaborate

| Carte | État | Composant |
|-------|------|-----------|
| Create my project | ✅ Opérationnelle | `Collaborate.svelte` |
| Build my team | 🚧 UI implémentée | `Collaborate.svelte` |
| Find my expert | 🚧 UI implémentée | `Collaborate.svelte` |
| Fund my project | 🚧 UI implémentée | `Collaborate.svelte` |

#### Section Explore

| Carte | État | Composant |
|-------|------|-----------|
| My graph | ✅ Opérationnelle | `Explore.svelte` |
| Community graph | 🚧 Actions désactivées | `Explore.svelte` |

#### Section Ask

| Carte | État | Composant |
|-------|------|-----------|
| Data | 🚧 UI implémentée | `Ask.svelte` |
| An expert | 🚧 Actions désactivées | `Ask.svelte` |

#### Section Publish

| Carte | État | Composant |
|-------|------|-----------|
| My data | 🚧 UI implémentée | `Publish.svelte` |
| My news | 🚧 UI implémentée | `Publish.svelte` |

#### Section Administrate

| Carte | État | Composant |
|-------|------|-----------|
| My account | ✅ Opérationnelle | `Administrate.svelte` |
| My survey | ✅ Opérationnelle | `Administrate.svelte` |

## Endpoints API

### Endpoints opérationnels

```
POST /api/v1/auth/login           # Authentification
POST /api/v1/auth/logout          # Déconnexion
GET  /api/v1/health               # Health check
GET  /api/v1/institutions/search  # Recherche institutions
```

### Endpoints non implémentés (stubs)

```
GET /api/v1/repositories/[id]/analysis      # En attente
GET /api/v1/repositories/[id]/contributors  # Non implémenté
GET /api/v1/repositories/[id]/issues        # Non implémenté
GET /api/v1/repositories/[id]/pulls         # Non implémenté
GET /api/v1/repositories/[id]/stats         # Non implémenté
```

## Stack technique

| Domaine | Technologies |
|---------|-------------|
| Frontend | SvelteKit 2, Svelte 5 (runes), Tailwind CSS |
| Backend | Appwrite, REDCap |
| Graphes | Graphology, Sigma.js |
| Tests | Vitest (13 fichiers Find an Expert, 6 fichiers ECRIN) |
| Build | Vite, TypeScript strict |

## Composants UI

### Find an Expert (70+ composants)

| Catégorie | Composants |
|-----------|------------|
| Layout | Section, Grid, PageLayout, Hero, CenteredLayout |
| Navigation | Navbar, Footer, Drawer, Dropdown, LanguageSelector |
| Data Display | Card, DataTable, StatCard, InfoCard, KeyValue |
| Feedback | Alert, Badge, LoadingSpinner, ErrorState |
| Domaine | ResearchOrganizationSearch, ArticlesCountCard, ConsentStatusCard |

### ECRIN (18 composants spécialisés)

| Catégorie | Composants |
|-----------|------------|
| Cartes métier | Introduce, Ask, Collaborate, Explore, Publish, Administrate |
| Graphes | GraphSelector, composants de visualisation Sigma |
| UI | CardItem, Button, SectionTile, HorizontalScroller |

## Documentation technique

### Find an Expert

- [Configuration technique](/projects/ecrin/find-an-expert/technical-setup) - Installation et développement
- [Configuration Appwrite](/projects/ecrin/find-an-expert/appwrite-setup) - Backend et collections
- [Design System](/projects/ecrin/find-an-expert/design-system) - Composants et thèmes
- [Architecture CSS](/projects/ecrin/find-an-expert/css-architecture) - Tailwind et styles

### Audits et références

- [Audit technique](/projects/ecrin/audit/) - Architecture et cartes fonctionnelles
- [Audit CSS](/projects/ecrin/audit/css-audit-report) - Rapport d'audit CSS
- [API Reference](/api/@univ-lehavre/atlas-find-an-expert/) - Documentation TypeDoc
