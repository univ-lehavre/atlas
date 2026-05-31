import type { RequestEvent } from "@sveltejs/kit";

/**
 * Hardcoded values for the static security headers shared by every
 * SvelteKit app in the monorepo. Exported so tests can assert the exact
 * strings without duplicating them.
 *
 * Set on every response by `applySecurityHeaders`. Standalone constants
 * (not behind a factory) because they have no per-app variation today —
 * if an app needs to deviate, it should re-set the header after calling
 * `applySecurityHeaders`.
 */
export const SECURITY_HEADERS = {
  /** Two years HSTS + subdomains + preload. Only set when the request is HTTPS. */
  strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
  /** Block MIME-sniffing. */
  xContentTypeOptions: "nosniff",
  /** Send only the origin on cross-origin navigations. */
  referrerPolicy: "strict-origin-when-cross-origin",
  /** Disable powerful browser APIs we don't use. */
  permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=()",
  /**
   * Redundant with CSP `frame-ancestors 'none'`, kept as defence in depth
   * for older browsers that don't support `frame-ancestors`.
   */
  xFrameOptions: "DENY",
} as const;

/**
 * Apply the shared static security headers to a SvelteKit `Response`.
 * Designed to be called from inside `hooks.server.ts` after `resolve(event)`.
 *
 * - `Strict-Transport-Security` is only set when the request is HTTPS
 *   (avoids confusing dev `http://localhost` traffic and protects against
 *   accidental HSTS pollution from a local proxy).
 * - All other headers are unconditional.
 *
 * @example
 * ```ts
 * // hooks.server.ts
 * import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';
 *
 * export const handle: Handle = async ({ event, resolve }) => {
 *   const response = await resolve(event);
 *   applySecurityHeaders(response, event);
 *   return response;
 * };
 * ```
 */
export const applySecurityHeaders = (
  response: Response,
  // Narrow to the only field we actually read so callers can pass any
  // RequestEvent-shape (real or mocked).
  event: Pick<RequestEvent, "url">,
): Response => {
  if (event.url.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      SECURITY_HEADERS.strictTransportSecurity,
    );
  }
  response.headers.set(
    "X-Content-Type-Options",
    SECURITY_HEADERS.xContentTypeOptions,
  );
  response.headers.set("Referrer-Policy", SECURITY_HEADERS.referrerPolicy);
  response.headers.set(
    "Permissions-Policy",
    SECURITY_HEADERS.permissionsPolicy,
  );
  response.headers.set("X-Frame-Options", SECURITY_HEADERS.xFrameOptions);
  return response;
};
