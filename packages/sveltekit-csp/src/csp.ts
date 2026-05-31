/**
 * Source-list directives that take string sources (`self`, `unsafe-inline`,
 * URLs, hashes…). Values are bare keywords (e.g. `self`, not `'self'`) —
 * SvelteKit quotes them at header-serialisation time (see
 * `@sveltejs/kit/src/runtime/server/page/csp.js`, `quoted` set).
 *
 * The types **mirror SvelteKit's internal `Csp.Directives`** (which lives
 * inside `declare module '@sveltejs/kit'` without `export`, so it can't be
 * imported directly). Keeping the same structural shape lets the helper's
 * return value flow into `kit.csp.directives` in `svelte.config.js` under
 * `exactOptionalPropertyTypes: true` without a cast on the consumer side.
 * Arrays are mutable on purpose, again matching SvelteKit's type.
 *
 * `CspSource` is `string` in practice — SvelteKit's `HostSource` is a
 * template literal pattern that already collapses to `string` — but we
 * keep the type alias so the public API documents its intent.
 */
export type CspSource = string;

export interface CspDirectives {
  "default-src"?: CspSource[];
  "script-src"?: CspSource[];
  "style-src"?: CspSource[];
  "img-src"?: CspSource[];
  "font-src"?: CspSource[];
  "connect-src"?: CspSource[];
  "frame-ancestors"?: CspSource[];
  "form-action"?: CspSource[];
  "base-uri"?: CspSource[];
  "object-src"?: CspSource[];
}

type DirectiveName = keyof CspDirectives;

/**
 * Conservative default directives shared by every SvelteKit app in the
 * monorepo. Mirrors what `apps/{amarre,ecrin,find-an-expert}` historically
 * declared inline in their `svelte.config.js` (Phase 6.3 DevSecOps).
 *
 * - `default-src 'self'` : no cross-origin by default.
 * - `script-src 'self'` : SvelteKit injects nonces in its hydration scripts
 *   automatically (mode `auto`); any inline or external script is blocked.
 * - `style-src 'self' 'unsafe-inline'` : required for `style="..."` attributes
 *   emitted by Svelte templates and Bootstrap inline-styles. Listed as an
 *   explicit derogation in ADR 0019 (web/security section), tightening
 *   tracked sine die under ADR 0001.
 * - `img-src 'self' data: blob:` : allow data/blob URIs for SVG icons and
 *   client-side previews.
 * - `connect-src 'self'` : no client-side fetch to third-party services.
 *   Apps that hit external APIs (Appwrite SDK from the browser, etc.) must
 *   override with `extra: { 'connect-src': ['https://baas.example.org'] }`.
 * - `frame-ancestors 'none'` : block embedding, defence in depth with
 *   `X-Frame-Options: DENY` set in `applySecurityHeaders`.
 * - `object-src 'none'` : block legacy plugins.
 *
 * Values are bare keywords (`self`, `none`, …) per SvelteKit's typed
 * directives — the runtime quotes them in the emitted header.
 *
 * Frozen at module load so an accidental mutation by a caller can't poison
 * subsequent calls. `defaultCspDirectives` always builds a fresh copy.
 */
const BASE_DIRECTIVES: Readonly<Record<DirectiveName, readonly string[]>> =
  Object.freeze({
    "default-src": Object.freeze(["self"]),
    "script-src": Object.freeze(["self"]),
    "style-src": Object.freeze(["self", "unsafe-inline"]),
    "img-src": Object.freeze(["self", "data:", "blob:"]),
    "font-src": Object.freeze(["self"]),
    "connect-src": Object.freeze(["self"]),
    "frame-ancestors": Object.freeze(["none"]),
    "form-action": Object.freeze(["self"]),
    "base-uri": Object.freeze(["self"]),
    "object-src": Object.freeze(["none"]),
  });

const mergeSources = (
  base: readonly string[] | undefined,
  extra: readonly string[] | undefined,
): string[] | undefined => {
  if (extra === undefined) return base === undefined ? undefined : [...base];
  if (base === undefined) return [...extra];
  // Order-preserving dedup. Avoids "self self" when an app re-declares a
  // source already in the defaults.
  return [...new Set([...base, ...extra])];
};

const directiveKeys = (
  extra: Partial<CspDirectives>,
): readonly DirectiveName[] => [
  ...new Set<DirectiveName>([
    ...(Object.keys(BASE_DIRECTIVES) as DirectiveName[]),
    ...(Object.keys(extra) as DirectiveName[]),
  ]),
];

/**
 * Build the directives object passed to `kit.csp.directives` in
 * `svelte.config.js`. Without `extra`, returns the conservative defaults.
 * With `extra`, each directive is **appended** (not replaced) with dedup —
 * an app that needs `connect-src 'self' https://baas.example.org` passes
 * `extra: { 'connect-src': ['https://baas.example.org'] }`.
 *
 * @example
 * ```js
 * // svelte.config.js
 * import { defaultCspDirectives } from '@univ-lehavre/atlas-sveltekit-csp';
 *
 * const config = {
 *   kit: {
 *     csp: { mode: 'auto', directives: defaultCspDirectives() },
 *   },
 * };
 * ```
 *
 * @example
 * ```js
 * // App that calls Appwrite directly from the browser
 * csp: {
 *   mode: 'auto',
 *   directives: defaultCspDirectives({
 *     'connect-src': ['https://baas.univ-lehavre.fr'],
 *   }),
 * }
 * ```
 */
export const defaultCspDirectives = (
  extra: Partial<CspDirectives> = {},
): CspDirectives =>
  Object.fromEntries(
    directiveKeys(extra)
      .map((key) => {
        // eslint-disable-next-line security/detect-object-injection -- key is constrained to the typed DirectiveName union
        const sources = mergeSources(BASE_DIRECTIVES[key], extra[key]);
        return [key, sources] as const;
      })
      .filter(
        (entry): entry is readonly [DirectiveName, string[]] =>
          entry[1] !== undefined,
      ),
  );

/**
 * Set of CSP source keywords that must be wrapped in single quotes when
 * serialised into a `Content-Security-Policy` header (mirrors
 * `@sveltejs/kit/src/runtime/server/page/csp.js`).
 */
const QUOTED_KEYWORDS = new Set([
  "self",
  "unsafe-eval",
  "unsafe-hashes",
  "unsafe-inline",
  "none",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "script",
]);

const CRYPTO_PATTERN = /^(?:nonce|sha\d\d\d)-/u;

const quoteSource = (source: string): string =>
  QUOTED_KEYWORDS.has(source) || CRYPTO_PATTERN.test(source)
    ? `'${source}'`
    : source;

/**
 * Serialise the directives into a `Content-Security-Policy` header value.
 * Helpful for tests that assert what the runtime would emit, and for the
 * (rare) cases where an app sets the CSP header manually from a route
 * handler (e.g. dynamic per-request CSP).
 *
 * @example
 * ```ts
 * serialiseCsp({ 'default-src': ['self'], 'object-src': ['none'] })
 * // → "default-src 'self'; object-src 'none'"
 * ```
 */
export const serialiseCsp = (directives: CspDirectives): string =>
  (Object.entries(directives) as [string, string[] | undefined][])
    .filter(
      (entry): entry is [string, string[]] =>
        entry[1] !== undefined && entry[1].length > 0,
    )
    .map(([name, sources]) => `${name} ${sources.map(quoteSource).join(" ")}`)
    .join("; ");
