// Mock for `$env/dynamic/private` in tests. The vitest config below has no
// SvelteKit plugin (it uses hand-written aliases), so the `$env/dynamic/*`
// virtual modules must be aliased explicitly. An empty `env` means no
// SENTRY_DSN is set, which exercises the Sentry no-op path (Phase 13.3).
export const env: Record<string, string | undefined> = {};
