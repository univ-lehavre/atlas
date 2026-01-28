# @univ-lehavre/atlas-appwrite

Utilitaires client Appwrite partagés pour les applications Atlas.

## À propos

Ce package fournit des clients Appwrite préconfigurés et des utilitaires pour les applications SvelteKit Atlas. Il simplifie la création de clients admin et session, et fournit un repository utilisateur standardisé.

## Fonctionnalités

- **Client Admin** : Client avec accès complet à l'API Appwrite
- **Client Session** : Client configuré avec la session utilisateur
- **Repository utilisateur** : Abstraction pour la récupération des utilisateurs
- **Gestion des cookies** : Utilitaires pour la gestion des sessions via cookies

## Installation

```bash
pnpm add @univ-lehavre/atlas-appwrite
```

## Usage

### Client Admin

```typescript
import { createAdminClient } from '@univ-lehavre/atlas-appwrite';

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT,
  apiKey: process.env.APPWRITE_KEY,
};

const { account, users, databases } = createAdminClient(config);

// Récupérer un utilisateur
const user = await users.get({ userId: 'user123' });
```

### Client Session

```typescript
import { createSessionClient, SESSION_COOKIE } from '@univ-lehavre/atlas-appwrite';

// Dans un endpoint SvelteKit
export const GET = async ({ cookies }) => {
  const config = {
    endpoint: process.env.APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT,
  };

  const { account } = createSessionClient(config, cookies);
  const user = await account.get();

  return json({ user });
};
```

### Repository utilisateur

```typescript
import { createUserRepository } from '@univ-lehavre/atlas-appwrite';

const userRepo = createUserRepository({
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT,
  apiKey: process.env.APPWRITE_KEY,
});

const user = await userRepo.getById('user123');
```

## API

### Fonctions

| Fonction | Description |
|----------|-------------|
| `createAdminClient(config)` | Crée un client admin Appwrite |
| `createSessionClient(config, cookies)` | Crée un client session Appwrite |
| `createUserRepository(config)` | Crée un repository utilisateur |

### Constantes

| Constante | Description |
|-----------|-------------|
| `SESSION_COOKIE` | Nom du cookie de session ('session') |
| `ADMIN_LABEL` | Label Appwrite pour les administrateurs ('admin') |

### Types exportés

Types Appwrite réexportés : `Models`, `Account`, `Users`, `Databases`, `Client`, `ID`

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-appwrite dev      # Développement
pnpm -F @univ-lehavre/atlas-appwrite build    # Build
pnpm -F @univ-lehavre/atlas-appwrite test     # Tests
pnpm -F @univ-lehavre/atlas-appwrite lint     # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-appwrite/)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</p>

## Licence

MIT
