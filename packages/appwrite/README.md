# @univ-lehavre/atlas-appwrite

Shared Appwrite client utilities for Atlas applications.

## About

This package provides pre-configured Appwrite clients and utilities for Atlas SvelteKit applications. It simplifies the creation of admin and session clients, and provides a standardized user repository.

## Features

- **Admin Client**: Client with full access to the Appwrite API
- **Session Client**: Client configured with the user session
- **User Repository**: Abstraction for user retrieval
- **Cookie Management**: Utilities for session management via cookies

## Installation

```bash
pnpm add @univ-lehavre/atlas-appwrite
```

## Usage

### Admin Client

```typescript
import { createAdminClient } from '@univ-lehavre/atlas-appwrite';

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
import { createSessionClient, SESSION_COOKIE } from '@univ-lehavre/atlas-appwrite';

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
import { createUserRepository } from '@univ-lehavre/atlas-appwrite';

const userRepo = createUserRepository({
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT,
  apiKey: process.env.APPWRITE_KEY,
});

const user = await userRepo.getById('user123');
```

## API

### Functions

| Function | Description |
|----------|-------------|
| `createAdminClient(config)` | Creates an Appwrite admin client |
| `createSessionClient(config, cookies)` | Creates an Appwrite session client |
| `createUserRepository(config)` | Creates a user repository |

### Constants

| Constant | Description |
|----------|-------------|
| `SESSION_COOKIE` | Session cookie name ('session') |
| `ADMIN_LABEL` | Appwrite label for administrators ('admin') |

### Exported Types

Re-exported Appwrite types: `Models`, `Account`, `Users`, `Databases`, `Client`, `ID`

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-appwrite dev      # Development
pnpm -F @univ-lehavre/atlas-appwrite build    # Build
pnpm -F @univ-lehavre/atlas-appwrite test     # Tests
pnpm -F @univ-lehavre/atlas-appwrite lint     # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-appwrite/)

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
