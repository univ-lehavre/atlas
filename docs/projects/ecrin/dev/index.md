# ECRIN Technical Documentation

Technical documentation for developers working on the ECRIN project.

> **Are you a researcher?** Please refer to the [ECRIN Researcher Guide](/projects/ecrin/user/) instead.

## Applications

The ECRIN project includes two SvelteKit applications:

| Application | Version | Description |
|-------------|---------|-------------|
| **Find an Expert** | 0.5.1 | Researcher expertise discovery and analysis via OpenAlex and GitHub |
| **ECRIN** | 2.0.0 | Collaboration platform with REDCap surveys and graph visualization |

## Development Status

### Authentication

| Feature | Find an Expert | ECRIN |
|---------|----------------|-------|
| Magic Link (email) | Operational | Operational |
| Session management | Operational | Operational |
| Protected routes | Operational | Operational |
| Account deletion | - | Operational |

### API Integrations

| Source | Status | Details |
|--------|--------|---------|
| **OpenAlex** | Partial | Institution search operational, researcher profiles to be developed |
| **GitHub** | Partial | URL parsing and local git stats, GitHub API not connected |
| **REDCap** | Operational | Survey export, link generation, record deletion |
| **Appwrite** | Operational | Auth, consent-events and current-consents collections |

### Business Features

| Feature | Status | Application |
|---------|--------|-------------|
| Institution search | Operational | Find an Expert |
| Consent management | Operational | Find an Expert |
| Health monitoring | Operational | Find an Expert |
| Survey link generation | Operational | ECRIN |
| Survey export (JSON) | Operational | ECRIN |
| Graph visualization | Operational | ECRIN |
| Collaboration graphs | Operational | ECRIN |

## Functional Cards

The ECRIN application is organized into **6 sections** with **15 cards** in total.

| Section | Cards | Operational | In Progress |
|---------|-------|-------------|-------------|
| Introduce | 3 | 0 | 3 |
| Collaborate | 4 | 1 | 3 |
| Explore | 2 | 1 | 1 |
| Ask | 2 | 0 | 2 |
| Publish | 2 | 0 | 2 |
| Administrate | 2 | 2 | 0 |
| **Total** | **15** | **4** | **11** |

### Detail by Section

#### Introduce Section

| Card | Status | Component |
|------|--------|-----------|
| Me | UI implemented | `Introduce.svelte` |
| My scientific question | UI implemented | `Introduce.svelte` |
| My references | UI implemented | `Introduce.svelte` |

#### Collaborate Section

| Card | Status | Component |
|------|--------|-----------|
| Create my project | Operational | `Collaborate.svelte` |
| Build my team | UI implemented | `Collaborate.svelte` |
| Find my expert | UI implemented | `Collaborate.svelte` |
| Fund my project | UI implemented | `Collaborate.svelte` |

#### Explore Section

| Card | Status | Component |
|------|--------|-----------|
| My graph | Operational | `Explore.svelte` |
| Community graph | Actions disabled | `Explore.svelte` |

#### Ask Section

| Card | Status | Component |
|------|--------|-----------|
| Data | UI implemented | `Ask.svelte` |
| An expert | Actions disabled | `Ask.svelte` |

#### Publish Section

| Card | Status | Component |
|------|--------|-----------|
| My data | UI implemented | `Publish.svelte` |
| My news | UI implemented | `Publish.svelte` |

#### Administrate Section

| Card | Status | Component |
|------|--------|-----------|
| My account | Operational | `Administrate.svelte` |
| My survey | Operational | `Administrate.svelte` |

## API Endpoints

### Operational Endpoints

```
POST /api/v1/auth/login           # Authentication
POST /api/v1/auth/logout          # Logout
GET  /api/v1/health               # Health check
GET  /api/v1/institutions/search  # Institution search
```

### Unimplemented Endpoints (stubs)

```
GET /api/v1/repositories/[id]/analysis      # Pending
GET /api/v1/repositories/[id]/contributors  # Not implemented
GET /api/v1/repositories/[id]/issues        # Not implemented
GET /api/v1/repositories/[id]/pulls         # Not implemented
GET /api/v1/repositories/[id]/stats         # Not implemented
```

## Technical Stack

| Domain | Technologies |
|--------|--------------|
| Frontend | SvelteKit 2, Svelte 5 (runes), Tailwind CSS |
| Backend | Appwrite, REDCap |
| Graphs | Graphology, Sigma.js |
| Tests | Vitest (13 files Find an Expert, 6 files ECRIN) |
| Build | Vite, TypeScript strict |

## UI Components

### Find an Expert (70+ components)

| Category | Components |
|----------|------------|
| Layout | Section, Grid, PageLayout, Hero, CenteredLayout |
| Navigation | Navbar, Footer, Drawer, Dropdown, LanguageSelector |
| Data Display | Card, DataTable, StatCard, InfoCard, KeyValue |
| Feedback | Alert, Badge, LoadingSpinner, ErrorState |
| Domain | ResearchOrganizationSearch, ArticlesCountCard, ConsentStatusCard |

### ECRIN (18 specialized components)

| Category | Components |
|----------|------------|
| Business Cards | Introduce, Ask, Collaborate, Explore, Publish, Administrate |
| Graphs | GraphSelector, Sigma visualization components |
| UI | CardItem, Button, SectionTile, HorizontalScroller |

## Technical Documentation

### Find an Expert

- [Technical Setup](/projects/ecrin/find-an-expert/technical-setup) - Installation and development
- [Appwrite Setup](/projects/ecrin/find-an-expert/appwrite-setup) - Backend and collections
- [Design System](/projects/ecrin/find-an-expert/design-system) - Components and themes
- [CSS Architecture](/projects/ecrin/find-an-expert/css-architecture) - Tailwind and styles

### Audits and References

- [Technical Audit](/projects/ecrin/audit/) - Architecture and functional cards
- [CSS Audit](/projects/ecrin/audit/css-audit-report) - CSS audit report
- [API Reference](/api/@univ-lehavre/atlas-find-an-expert/) - TypeDoc documentation
