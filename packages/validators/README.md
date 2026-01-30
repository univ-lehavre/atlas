# @univ-lehavre/atlas-validators

Shared validation utilities for Atlas applications.

## About

This package provides reusable validation functions for Atlas applications, including email validation, JSON body parsing, and data normalization.

## Features

- **Email validation**: RFC 5322 validation with ReDoS attack protection
- **Hexadecimal validation**: Appwrite identifiers and token validation
- **JSON parsing**: Content-Type validation and secure request body parsing
- **Email normalization**: Lowercase conversion and subaddressing removal

## Installation

```bash
pnpm add @univ-lehavre/atlas-validators
```

## Usage

```typescript
import {
  isEmail,
  isHexadecimal,
  normalizeEmail,
  ensureJsonContentType,
  parseJsonBody,
  validateAndParseJsonBody,
} from '@univ-lehavre/atlas-validators';

// Validate an email
if (isEmail('user@example.com')) {
  console.log('Valid email');
}

// Normalize an email
const normalized = normalizeEmail('User+tag@Example.COM');
// -> 'user@example.com'

// Validate and parse a request body
const body = await validateAndParseJsonBody(request);
```

## API

| Function | Description |
|----------|-------------|
| `isEmail(email)` | Validates if a string is a valid email |
| `isHexadecimal(str)` | Validates if a string contains only hexadecimal characters |
| `normalizeEmail(email)` | Normalizes an email (lowercase, without subaddressing) |
| `ensureJsonContentType(request)` | Checks that Content-Type is application/json |
| `parseJsonBody(request)` | Parses and validates the JSON body of a request |
| `validateAndParseJsonBody(request)` | Combines ensureJsonContentType and parseJsonBody |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-validators dev      # Development
pnpm -F @univ-lehavre/atlas-validators build    # Build
pnpm -F @univ-lehavre/atlas-validators test     # Tests
pnpm -F @univ-lehavre/atlas-validators lint     # ESLint
```

## Documentation

- [API Documentation](../../docs/api/@univ-lehavre/atlas-validators/)

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
