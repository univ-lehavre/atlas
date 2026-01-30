# @univ-lehavre/atlas-errors

Shared error classes for Atlas applications.

## About

This package provides standardized error classes for Atlas applications, with error codes, HTTP statuses, and conversion to structured API responses.

## Features

- **Typed errors**: Error classes with codes and HTTP statuses
- **Authentication errors**: SessionError, MagicUrlLoginValidationError
- **Validation errors**: InvalidJsonBodyError, InvalidContentTypeError, NotAnEmailError
- **API mapping**: Automatic conversion to standardized JSON responses

## Installation

```bash
pnpm add @univ-lehavre/atlas-errors
```

## Usage

```typescript
import {
  SessionError,
  InvalidJsonBodyError,
  InvalidContentTypeError,
  NotAnEmailError,
  mapErrorToApiResponse,
} from '@univ-lehavre/atlas-errors';

// Throw a typed error
if (!session) {
  throw new SessionError('No active session', { cause: 'Cookie expired' });
}

// Convert an error to API response
try {
  // ... operation
} catch (error) {
  const { body, status } = mapErrorToApiResponse(error);
  return json(body, { status });
}
```

## API

### Error Classes

| Class | HTTP Code | Description |
|-------|-----------|-------------|
| `SessionError` | 401 | Missing or invalid session |
| `InvalidJsonBodyError` | 400 | Invalid JSON request body |
| `InvalidContentTypeError` | 400 | Content-Type not application/json |
| `NotAnEmailError` | 400 | Invalid or unauthorized email |
| `NotPartOfAllianceError` | 400 | Unauthorized email domain |
| `MagicUrlLoginValidationError` | 400 | Invalid magic URL parameters |
| `UserIdValidationError` | 400 | Invalid user ID |
| `RequestBodyValidationError` | 400 | Invalid request body |

### Functions

| Function | Description |
|----------|-------------|
| `mapErrorToApiResponse(error)` | Converts an error to a structured API response |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-errors dev      # Development
pnpm -F @univ-lehavre/atlas-errors build    # Build
pnpm -F @univ-lehavre/atlas-errors test     # Tests
pnpm -F @univ-lehavre/atlas-errors lint     # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-errors/)

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
