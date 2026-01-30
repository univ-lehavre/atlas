# @univ-lehavre/atlas-auth

Shared authentication service for Atlas SvelteKit applications.

## About

This package provides a complete authentication service based on Appwrite with magic link support. It handles signup, login, logout, and account deletion.

## Features

- **Magic links**: Passwordless authentication via email link
- **Domain validation**: Restrict signups by email domain
- **Session management**: Session creation and management via cookies
- **REDCap integration**: Support for user ID resolution from REDCap
- **SvelteKit hooks**: Ready-to-use authentication middleware

## Installation

```bash
pnpm add @univ-lehavre/atlas-auth
```

## Usage

### Service Configuration

```typescript
import { createAuthService } from '@univ-lehavre/atlas-auth';

const authService = createAuthService({
  appwrite: {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT,
    apiKey: APPWRITE_KEY,
  },
  loginUrl: PUBLIC_LOGIN_URL,
  domainValidation: {
    allowedDomainsRegexp: /^(example\.com|university\.edu)$/,
  },
});
```

### Signup with Magic Link

```typescript
// POST /api/v1/auth/signup
export const POST = async ({ request }) => {
  const body = await request.json();
  const token = await authService.signupWithEmail(body.email);
  return json({ data: { token } });
};
```

### Login via Magic Link

```typescript
// GET /login?userId=xxx&secret=yyy
export const load = async ({ url, cookies }) => {
  const userId = url.searchParams.get('userId');
  const secret = url.searchParams.get('secret');

  const session = await authService.login(userId, secret, cookies);
  redirect(302, '/dashboard');
};
```

### Logout

```typescript
// POST /api/v1/auth/logout
export const POST = async ({ locals, cookies }) => {
  await authService.logout(locals.user.id, cookies);
  return json({ data: null });
};
```

## API

### Functions

| Function | Description |
|----------|-------------|
| `createAuthService(config)` | Creates an authentication service instance |
| `validateMagicUrlLogin(userId, secret)` | Validates magic URL parameters |
| `validateSignupEmail(email, config)` | Validates and normalizes an email for signup |
| `validateUserId(userId)` | Validates a user ID |
| `checkRequestBody(body)` | Checks for required fields presence |

### Exports

| Export | Description |
|--------|-------------|
| `.` | Main authentication service |
| `./validators` | Validation functions |
| `./hooks` | SvelteKit middleware |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-auth dev      # Development
pnpm -F @univ-lehavre/atlas-auth build    # Build
pnpm -F @univ-lehavre/atlas-auth test     # Tests
pnpm -F @univ-lehavre/atlas-auth lint     # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-auth/)

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
