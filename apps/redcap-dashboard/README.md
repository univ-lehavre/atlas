# REDCap Dashboard

Dashboard SvelteKit pour visualiser les logs REDCap en **fenêtre glissante de 30 jours**.

Il affiche 4 graphiques:

- Utilisateurs actifs (loggé / lien personnel / anonyme)
- Projets actifs
- Actions totales
- Actions par catégorie

## Prérequis

- Node.js `>= 24`
- `pnpm`
- Monorepo Atlas cloné (ce package dépend de `@univ-lehavre/atlas-redcap-logs`)

## Installation

Depuis la racine du monorepo:

```bash
pnpm install
```

## Configuration

### 1) Variables d'environnement

Dans `apps/redcap-dashboard/.env`:

```env
REDCAP_API_URL=https://redcap.univ-lehavre.fr/api/
```

Le fichier `.env.example` fournit ce même modèle.

### 2) Tokens projets REDCap

Le dashboard lit les tokens dans le fichier **racine du repo**:

```text
/redcap-token.csv
```

Format CSV attendu:

```csv
project_id,token
123,xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
456,yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

## Lancer en développement

Depuis la racine du monorepo:

```bash
pnpm --filter @univ-lehavre/atlas-redcap-dashboard dev
```

Puis ouvrir l'URL affichée par Vite (souvent `http://localhost:5173`).

## Build et preview

```bash
pnpm --filter @univ-lehavre/atlas-redcap-dashboard build
pnpm --filter @univ-lehavre/atlas-redcap-dashboard preview
```

## Scripts utiles

```bash
pnpm --filter @univ-lehavre/atlas-redcap-dashboard lint
pnpm --filter @univ-lehavre/atlas-redcap-dashboard check
pnpm --filter @univ-lehavre/atlas-redcap-dashboard typecheck
pnpm --filter @univ-lehavre/atlas-redcap-dashboard format
```

## Fonctionnement de la collecte

- Le bouton **"Actualiser depuis REDCap"** ouvre un flux SSE sur `GET /api/logs`.
- Les projets sont collectés par lots (`BATCH_SIZE = 3`) et l'UI reçoit la progression en temps réel.
- Les données sont enrichies puis converties en série temporelle 30 jours.
- Un cache local est utilisé: `~/.redcap-stats.json`.
- TTL du cache: **24h**. Si le cache est récent, l'API renvoie immédiatement l'état `cached`.

Types d'événements SSE émis:

- `start`
- `progress`
- `cached`
- `done`
- `error`

## Notes

- Les tokens REDCap sont sensibles: ne pas versionner `redcap-token.csv`.
- Le dashboard fonctionne avec l'adapter Node (`@sveltejs/adapter-node`).
