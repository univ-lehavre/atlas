---
"@univ-lehavre/atlas-baas": major
"@univ-lehavre/atlas-auth": major
"@univ-lehavre/atlas-amarre": major
"@univ-lehavre/atlas-ecrin": major
"@univ-lehavre/atlas-find-an-expert": major
---

Renommage du package Appwrite en `baas` (Backend-as-a-Service) pour retirer la marque Appwrite des identifiants publics du monorepo. Fin de la migration anti-marque (PR 1 citation-types, PR 2 cluster citation, PR 3 cluster crf).

**Package renommé (npm + dossier + workspace)**

| Avant (npm)                          | Après (npm)                       |
| ------------------------------------ | --------------------------------- |
| `@univ-lehavre/atlas-appwrite`       | `@univ-lehavre/atlas-baas`        |

**Identifiants publics renommés**

Types et erreurs :
- `AppwriteConfig` → `BaasConfig`

Classes et fonctions :
- `AppwriteUserRepository` → `BaasUserRepository`
- `AppwriteCurrentConsentRepository` → `BaasCurrentConsentRepository`
- `AppwriteConsentEventRepository` → `BaasConsentEventRepository`
- `MockAppwriteUserRepository` → `MockBaasUserRepository`
- `checkAppwrite` / `checkAppwriteDatabase` / `checkAppwriteEndpoint` → `checkBaas*`
- `isAppwriteAuthError` → `isBaasAuthError`
- `mapAppwriteUserToProfile` → `mapBaasUserToProfile`
- `serviceAppwrite` → `serviceBaas`

Schémas et clés de config :
- `appwriteDatetime` (zod schema) → `baasDatetime`
- Clé `appwrite` dans `AuthConfig` → `baas`
- `NodeAppwrite` (alias d'import du SDK) → `BaasSdk`

Codes d'état et traductions :
- `'appwrite_unavailable'` (string code) → `'baas_unavailable'`
- `appwriteUnavailable`, `appwriteUnavailableTitle`, `appwriteUnavailableDescription` (clés i18n) → `baas*`
- `brand.appwrite` (clé d'objet) → `brand.baas`
- `name: 'appwrite'` (service health) → `name: 'baas'`

**Dossiers / fichiers renommés**

| Avant                                              | Après                                          |
| -------------------------------------------------- | ---------------------------------------------- |
| `packages/appwrite/`                               | `packages/baas/`                               |
| `apps/amarre/src/lib/server/appwrite/`             | `apps/amarre/src/lib/server/baas/`             |
| `apps/ecrin/src/lib/appwrite/`                     | `apps/ecrin/src/lib/baas/`                     |
| `apps/find-an-expert/src/lib/server/appwrite/`     | `apps/find-an-expert/src/lib/server/baas/`     |
| `.env.dev.appwrite.example`                        | `.env.dev.baas.example`                        |
| `.env.prod.appwrite.example`                       | `.env.prod.baas.example`                       |
| `docs/projects/ecrin/find-an-expert/appwrite-setup.md` | `.../baas-setup.md`                        |

**Conservé (texte descriptif uniquement)**

- Dépendances npm tierces : `appwrite`, `node-appwrite`
- Classe `AppwriteException` (du SDK officiel)
- URLs Appwrite Cloud (`cloud.appwrite.io`)
- Variables d'environnement `APPWRITE_*`, `PUBLIC_APPWRITE_*` (conventions choisies/imposées par les apps consommant le SDK)
- Mots-clés npm `"appwrite"` (discoverability)
- Messages d'erreur, JSDoc, libellés utilisateur

**Migration locale requise**

Les fichiers d'environnement locaux (gitignored) doivent être renommés :

```bash
mv .env.dev.appwrite .env.dev.baas
mv .env.prod.appwrite .env.prod.baas
```

**Migration côté consommateur**

```diff
- import { createAdminClient, type AppwriteConfig } from '@univ-lehavre/atlas-appwrite';
+ import { createAdminClient, type BaasConfig } from '@univ-lehavre/atlas-baas';
```

```diff
- const auth = createAuthService({ appwrite: { ... }, ... });
+ const auth = createAuthService({ baas: { ... }, ... });
```
