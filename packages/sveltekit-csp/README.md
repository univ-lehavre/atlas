# @univ-lehavre/atlas-sveltekit-csp

Shared Content-Security-Policy directives and security headers helpers for
the SvelteKit apps of the atlas monorepo.

## Why

Each app used to redeclare its own `kit.csp.directives` in `svelte.config.js`
and the same five security headers (HSTS, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy, X-Frame-Options) in `hooks.server.ts`.
That meant six copies to keep in sync across `amarre`, `ecrin`,
`find-an-expert`, `sillage`, `atlas-dashboard`, `crf-dashboard`. This package
extracts both pieces into one helper so every app inherits the same
conservative defaults.

The defaults preserve the explicit derogations recorded in
[ADR 0019](/atlas/decisions/0019-derogations-workspace-audit) — in
particular `style-src 'unsafe-inline'` for Svelte and Bootstrap inline
styles. Tightening is tracked sine die under
[ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die).

## Usage

### CSP — in `svelte.config.js`

```js
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defaultCspDirectives } from "@univ-lehavre/atlas-sveltekit-csp";

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: { mode: "auto", directives: defaultCspDirectives() },
  },
};

export default config;
```

To extend a directive (e.g. allow a third-party API host), pass `extra`:

```js
csp: {
  mode: "auto",
  directives: defaultCspDirectives({
    "connect-src": ["https://baas.univ-lehavre.fr"],
  }),
}
```

Extra sources are **appended** to the defaults (dedup-aware), they don't
replace them.

### Security headers — in `hooks.server.ts`

```ts
import type { Handle } from "@sveltejs/kit";
import { applySecurityHeaders } from "@univ-lehavre/atlas-sveltekit-csp";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  applySecurityHeaders(response, event);
  return response;
};
```

## API

- `defaultCspDirectives(extra?: Partial<CspDirectives>)` — build the
  directives object for `kit.csp.directives`.
- `serialiseCsp(directives)` — format directives as a header value
  (`"default-src 'self'; …"`). Useful in tests and for routes that emit a
  per-request CSP.
- `applySecurityHeaders(response, event)` — set the five static security
  headers on a response. HSTS is only set on `https://` requests.
- `SECURITY_HEADERS` — the raw header values exposed as constants for tests
  and manual overrides.
