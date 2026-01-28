# @univ-lehavre/atlas-errors

Classes d'erreurs partagées pour les applications Atlas.

## À propos

Ce package fournit des classes d'erreurs standardisées pour les applications Atlas, avec des codes d'erreur, des statuts HTTP et une conversion vers des réponses API structurées.

## Fonctionnalités

- **Erreurs typées** : Classes d'erreurs avec codes et statuts HTTP
- **Erreurs d'authentification** : SessionError, MagicUrlLoginValidationError
- **Erreurs de validation** : InvalidJsonBodyError, InvalidContentTypeError, NotAnEmailError
- **Mapping API** : Conversion automatique vers des réponses JSON standardisées

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

// Lancer une erreur typée
if (!session) {
  throw new SessionError('No active session', { cause: 'Cookie expired' });
}

// Convertir une erreur en réponse API
try {
  // ... opération
} catch (error) {
  const { body, status } = mapErrorToApiResponse(error);
  return json(body, { status });
}
```

## API

### Classes d'erreurs

| Classe | Code HTTP | Description |
|--------|-----------|-------------|
| `SessionError` | 401 | Session manquante ou invalide |
| `InvalidJsonBodyError` | 400 | Corps de requête JSON invalide |
| `InvalidContentTypeError` | 400 | Content-Type non application/json |
| `NotAnEmailError` | 400 | Email invalide ou non autorisé |
| `NotPartOfAllianceError` | 400 | Domaine email non autorisé |
| `MagicUrlLoginValidationError` | 400 | Paramètres magic URL invalides |
| `UserIdValidationError` | 400 | User ID invalide |
| `RequestBodyValidationError` | 400 | Corps de requête invalide |

### Fonctions

| Fonction | Description |
|----------|-------------|
| `mapErrorToApiResponse(error)` | Convertit une erreur en réponse API structurée |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-errors dev      # Développement
pnpm -F @univ-lehavre/atlas-errors build    # Build
pnpm -F @univ-lehavre/atlas-errors test     # Tests
pnpm -F @univ-lehavre/atlas-errors lint     # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-errors/)

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
