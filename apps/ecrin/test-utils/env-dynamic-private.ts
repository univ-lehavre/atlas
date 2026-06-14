// Mock pour `$env/dynamic/private` en test. La config vitest n'a pas le plugin
// SvelteKit (alias écrits à la main), donc les modules virtuels `$env/dynamic/*`
// doivent être aliasés explicitement vers ce fichier.
//
// On fournit les secrets serveur attendus par `$lib/server/env` (getters
// fail-closed) pour que les tests qui chargent le VRAI module env (graphsService,
// userService, routes surveys) ne throw pas à l'appel des getters. Valeurs
// factices, jamais de vrai secret.
//
// `SENTRY_DSN` reste volontairement ABSENT : son absence exerce le chemin no-op
// de Sentry dans hooks.server.ts (Phase 13.3).
export const env: Record<string, string | undefined> = {
  REDCAP_API_TOKEN: 'test-token',
  REDCAP_URL: 'https://redcap.example.com/api/',
  APPWRITE_KEY: 'test-appwrite-key',
  APPWRITE_DB_ID: 'test-db',
  APPWRITE_TABLE_ID_ALLOWED_EMAIL_DOMAINS_TO_SUBSCRIBE: 'test-table',
};
