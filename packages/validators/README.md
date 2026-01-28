# @univ-lehavre/atlas-validators

Utilitaires de validation partagés pour les applications Atlas.

## À propos

Ce package fournit des fonctions de validation réutilisables pour les applications Atlas, notamment la validation d'emails, le parsing de corps JSON et la normalisation de données.

## Fonctionnalités

- **Validation d'email** : Validation RFC 5322 avec protection contre les attaques ReDoS
- **Validation hexadécimale** : Validation des identifiants Appwrite et tokens
- **Parsing JSON** : Validation du Content-Type et parsing sécurisé du corps de requête
- **Normalisation d'email** : Conversion en minuscules et suppression du subaddressing

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

// Valider un email
if (isEmail('user@example.com')) {
  console.log('Email valide');
}

// Normaliser un email
const normalized = normalizeEmail('User+tag@Example.COM');
// → 'user@example.com'

// Valider et parser le corps d'une requête
const body = await validateAndParseJsonBody(request);
```

## API

| Fonction | Description |
|----------|-------------|
| `isEmail(email)` | Valide si une chaîne est un email valide |
| `isHexadecimal(str)` | Valide si une chaîne contient uniquement des caractères hexadécimaux |
| `normalizeEmail(email)` | Normalise un email (minuscules, sans subaddressing) |
| `ensureJsonContentType(request)` | Vérifie que le Content-Type est application/json |
| `parseJsonBody(request)` | Parse et valide le corps JSON d'une requête |
| `validateAndParseJsonBody(request)` | Combine ensureJsonContentType et parseJsonBody |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-validators dev      # Développement
pnpm -F @univ-lehavre/atlas-validators build    # Build
pnpm -F @univ-lehavre/atlas-validators test     # Tests
pnpm -F @univ-lehavre/atlas-validators lint     # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-validators/)

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
