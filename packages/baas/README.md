# @univ-lehavre/atlas-baas

Utilitaires Appwrite serveur pour les applications Atlas.

## About

Ce package crée des clients Appwrite admin ou sessionnés à partir de la configuration serveur et du cookie SvelteKit `session`. Il expose aussi des constantes de session/admin et des helpers pour les opérations utilisateur utilisées par les services d'authentification Atlas.

## Features

- **Admin Client**: Client with full access to the Appwrite API
- **Session Client**: Client configured with the user session
- **User Repository**: Abstraction for user retrieval
- **Cookie Management**: Utilities for session management via cookies

## Installation

```bash
pnpm add @univ-lehavre/atlas-baas
```

## Usage

### Admin Client

```typescript
import { createAdminClient } from '@univ-lehavre/atlas-baas';

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT,
  apiKey: process.env.APPWRITE_KEY,
};

const { account, users, databases } = createAdminClient(config);

// Retrieve a user
const user = await users.get({ userId: 'user123' });
```

### Session Client

```typescript
import { createSessionClient, SESSION_COOKIE } from '@univ-lehavre/atlas-baas';

// In a SvelteKit endpoint
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

### User Repository

```typescript
import { createUserRepository } from '@univ-lehavre/atlas-baas';

const userRepo = createUserRepository({
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT,
  apiKey: process.env.APPWRITE_KEY,
});

const user = await userRepo.getById('user123');
```

## API

### Functions

| Function                               | Description                        |
| -------------------------------------- | ---------------------------------- |
| `createAdminClient(config)`            | Creates an Appwrite admin client   |
| `createSessionClient(config, cookies)` | Creates an Appwrite session client |
| `createUserRepository(config)`         | Creates a user repository          |

### Constants

| Constant         | Description                                 |
| ---------------- | ------------------------------------------- |
| `SESSION_COOKIE` | Session cookie name ('session')             |
| `ADMIN_LABEL`    | Appwrite label for administrators ('admin') |

### Exported Types

Re-exported Appwrite types: `Models`, `Account`, `Users`, `Databases`, `Client`, `ID`

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-baas dev      # Development
pnpm -F @univ-lehavre/atlas-baas build    # Build
pnpm -F @univ-lehavre/atlas-baas test     # Tests
pnpm -F @univ-lehavre/atlas-baas lint     # ESLint
```

## Documentation

- [API Documentation](/atlas/api/univ-lehavre/atlas-baas/)

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Atlas is developed as part of two projects led by Le Havre Normandie University:

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)**: research and training program focused on maritime and port issues
- **[EUNICoast](https://eunicoast.eu/)**: European university alliance bringing together institutions located in European coastal areas

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Le Havre Normandie University" height="20">
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

## License

MIT
