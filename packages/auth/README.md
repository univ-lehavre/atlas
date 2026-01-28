# @univ-lehavre/atlas-auth

Service d'authentification partagé pour les applications SvelteKit Atlas.

## À propos

Ce package fournit un service d'authentification complet basé sur Appwrite avec support des magic links. Il gère l'inscription, la connexion, la déconnexion et la suppression de compte.

## Fonctionnalités

- **Magic links** : Authentification sans mot de passe via lien email
- **Validation de domaines** : Restriction des inscriptions par domaine email
- **Gestion de session** : Création et gestion des sessions via cookies
- **Intégration REDCap** : Support pour la résolution d'ID utilisateur depuis REDCap
- **Hooks SvelteKit** : Middleware d'authentification prêt à l'emploi

## Installation

```bash
pnpm add @univ-lehavre/atlas-auth
```

## Usage

### Configuration du service

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

### Inscription avec magic link

```typescript
// POST /api/v1/auth/signup
export const POST = async ({ request }) => {
  const body = await request.json();
  const token = await authService.signupWithEmail(body.email);
  return json({ data: { token } });
};
```

### Connexion via magic link

```typescript
// GET /login?userId=xxx&secret=yyy
export const load = async ({ url, cookies }) => {
  const userId = url.searchParams.get('userId');
  const secret = url.searchParams.get('secret');

  const session = await authService.login(userId, secret, cookies);
  redirect(302, '/dashboard');
};
```

### Déconnexion

```typescript
// POST /api/v1/auth/logout
export const POST = async ({ locals, cookies }) => {
  await authService.logout(locals.user.id, cookies);
  return json({ data: null });
};
```

## API

### Fonctions

| Fonction | Description |
|----------|-------------|
| `createAuthService(config)` | Crée une instance du service d'authentification |
| `validateMagicUrlLogin(userId, secret)` | Valide les paramètres de magic URL |
| `validateSignupEmail(email, config)` | Valide et normalise un email pour l'inscription |
| `validateUserId(userId)` | Valide un ID utilisateur |
| `checkRequestBody(body)` | Vérifie la présence des champs requis |

### Exports

| Export | Description |
|--------|-------------|
| `.` | Service d'authentification principal |
| `./validators` | Fonctions de validation |
| `./hooks` | Middleware SvelteKit |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-auth dev      # Développement
pnpm -F @univ-lehavre/atlas-auth build    # Build
pnpm -F @univ-lehavre/atlas-auth test     # Tests
pnpm -F @univ-lehavre/atlas-auth lint     # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-auth/)

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
