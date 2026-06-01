// Mock for `$env/dynamic/public` in tests. See env-dynamic-private.ts for
// why explicit aliasing is needed. An empty `env` means no PUBLIC_SENTRY_DSN
// is set, which exercises the client-side Sentry no-op path (Phase 13.3).
export const env: Record<string, string | undefined> = {};
