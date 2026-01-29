# @univ-lehavre/crf

Case Report Form - Package unifié pour interagir avec l'API REDCap.

## À propos

Ce package fournit un client TypeScript typé pour l'API REDCap, un serveur HTTP REST et des outils CLI. Il utilise une architecture OpenAPI-first avec des types générés depuis la spécification `specs/redcap.yaml`.

## Fonctionnalités

- **Client REDCap** : Client Effect typé pour l'API REDCap
- **Serveur HTTP** : Microservice REST avec Hono
- **CLI** : Outils en ligne de commande pour tester la connectivité
- **Types générés** : Types TypeScript générés depuis OpenAPI
- **Branded types** : Validation runtime des identifiants

## Installation

```bash
pnpm add @univ-lehavre/crf effect
```

## Usage

### Client REDCap

```typescript
import { createRedcapClient, RedcapUrl, RedcapToken, RecordId } from '@univ-lehavre/crf/redcap';
import { Effect } from 'effect';

const client = createRedcapClient({
  url: RedcapUrl('https://redcap.example.com/api/'),
  token: RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
});

// Obtenir la version REDCap
const version = await Effect.runPromise(client.getVersion());
console.log('REDCap version:', version);

// Exporter des records
const records = await Effect.runPromise(
  client.exportRecords({
    fields: ['record_id', 'first_name', 'last_name'],
    filterLogic: '[age] >= 18',
  })
);
```

### Serveur CRF

```bash
# Variables d'environnement requises
export REDCAP_API_URL=https://redcap.example.com/api/
export REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
export PORT=3000

# Lancer le serveur
pnpm -F @univ-lehavre/crf start
```

## API du serveur

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/project/version` | Version REDCap |
| `GET /api/v1/project/info` | Informations projet |
| `GET /api/v1/records` | Exporter les records |
| `POST /api/v1/records` | Importer des records |
| `GET /api/v1/users/:email` | Trouver un utilisateur |
| `GET /openapi.json` | Spécification OpenAPI |
| `GET /docs` | Documentation Scalar |

## Scripts

```bash
pnpm -F @univ-lehavre/crf dev            # Développement
pnpm -F @univ-lehavre/crf build          # Build production
pnpm -F @univ-lehavre/crf test           # Tests unitaires
pnpm -F @univ-lehavre/crf generate:types # Régénérer les types
pnpm -F @univ-lehavre/crf mock:redcap    # Mock REDCap (Prism)
pnpm -F @univ-lehavre/crf start          # Lancer le serveur
pnpm -F @univ-lehavre/crf test:api       # Tests API (Schemathesis)
```

## Branded Types

Le package utilise des branded types pour la validation runtime :

```typescript
import { RedcapToken, RecordId, InstrumentName, Email } from '@univ-lehavre/crf/redcap';

const token = RedcapToken('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // OK
const recordId = RecordId('abc12345678901234567'); // OK (20+ chars)
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-crf/)
- [Guide CRF](../../docs/guide/dev/crf.md)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## Licence

MIT
