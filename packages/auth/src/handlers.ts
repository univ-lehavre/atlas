/**
 * SvelteKit handler factories for shared authentication endpoints.
 *
 * Each app's `/auth/login` and `/auth/logout` `+server.ts` is otherwise
 * a thin wrapper that mirrors the same try/validate/service/respond
 * shape. These factories encapsulate the shape once so each app's
 * handler becomes a single-line composition.
 *
 * Implementation note: the package builds JSON responses with the
 * platform `Response.json` static (available in Node 20.6+) so it can
 * import `@sveltejs/kit` for types only — the workspace audit forbids
 * runtime imports of `@sveltejs/kit` from `packages/`.
 *
 * @module
 */

import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { mapErrorToApiResponse } from '@univ-lehavre/atlas-errors';
import { ensureJsonContentType, parseJsonBody } from '@univ-lehavre/atlas-validators';
import { checkRequestBody } from './validators.js';
import { createRateLimiter, rateLimitHeaders } from './rate-limit.js';
import type { AuthService } from './index.js';

const jsonResponse = (body: unknown, init?: ResponseInit): Response => Response.json(body, init);

const mapErrorToResponse = (error: unknown): Response => {
  const { body, status } = mapErrorToApiResponse(error);
  return jsonResponse(body, { status });
};

/**
 * Subset of {@link AuthService} required by {@link createLoginHandler}.
 */
export interface LoginHandlerService {
  readonly login: AuthService['login'];
}

/**
 * Creates a `POST /api/v1/auth/login` handler.
 *
 * Expects a JSON body with `userId` and `secret` fields (the magic URL
 * payload). Delegates validation and session cookie creation to the
 * provided `service.login` — typically the `login` method of an
 * {@link AuthService} produced by `createAuthService`.
 *
 * @example
 * ```ts
 * import { createLoginHandler, createAuthService } from '@univ-lehavre/atlas-auth';
 * const auth = createAuthService({ ... });
 * export const POST = createLoginHandler(auth);
 * ```
 */
export const createLoginHandler = (service: LoginHandlerService): RequestHandler => {
  return async ({ request, cookies }) => {
    try {
      ensureJsonContentType(request);
      const body = await parseJsonBody(request);
      const { userId, secret } = body;
      await service.login(userId, secret, cookies);
      return jsonResponse({ data: { loggedIn: true }, error: null }, { status: 200 });
    } catch (error: unknown) {
      return mapErrorToResponse(error);
    }
  };
};

/**
 * Subset of {@link AuthService} required by {@link createLogoutHandler}.
 */
export interface LogoutHandlerService {
  readonly logout: AuthService['logout'];
}

/**
 * Creates a `POST /api/v1/auth/logout` handler.
 *
 * Reads `locals.userId` (populated by the session hook), passes it to
 * `service.logout`, and returns 200 on success. A missing or invalid
 * userId surfaces a `session_error` 401 from the shared validators.
 *
 * @example
 * ```ts
 * import { createLogoutHandler, createAuthService } from '@univ-lehavre/atlas-auth';
 * const auth = createAuthService({ ... });
 * export const POST = createLogoutHandler(auth);
 * ```
 */
export const createLogoutHandler = (service: LogoutHandlerService): RequestHandler => {
  return async ({ locals, cookies }) => {
    try {
      // SvelteKit Locals is `{}` here ; each app augments it with
      // `userId?: string` via its app.d.ts. The service validates the
      // value and throws SessionError/UserIdValidationError when
      // missing or malformed.
      const userId = (locals as { userId?: unknown }).userId;
      await service.logout(userId, cookies);
      return jsonResponse({ data: { loggedOut: true }, error: null }, { status: 200 });
    } catch (error: unknown) {
      return mapErrorToResponse(error);
    }
  };
};

// signup ---------------------------------------------------------------

/**
 * Token-like result returned by a signup action. Matches the shape of
 * `node-appwrite`'s `Models.Token` for the fields used by the factory,
 * without importing `node-appwrite` here.
 */
export interface SignupTokenLike {
  readonly $createdAt?: string;
}

/**
 * Configuration of {@link createSignupHandler}.
 *
 * The three required strategies cover the divergences observed across
 * apps : how to read the email out of the request, how to validate it,
 * and how to call the actual signup service (with whatever per-app
 * context — `fetch`, `cookies`, etc. — the service needs).
 */
export interface SignupHandlerConfig {
  /**
   * Reads the candidate email out of the incoming request.
   * Default : JSON body via `checkRequestBody(request, ['email'])`.
   */
  readonly extractEmail?: (request: Request) => Promise<unknown>;
  /**
   * Validates and normalises the candidate email. Throws an
   * `ApplicationError` subclass (e.g. `NotAnEmailError`) on rejection.
   */
  readonly validateEmail: (email: unknown) => Promise<string>;
  /**
   * Performs the signup. Receives the validated email and the full
   * SvelteKit event so the app can pick whatever it needs (fetch,
   * cookies, locals…) to build its service context.
   */
  readonly signupWithEmail: (email: string, event: RequestEvent) => Promise<SignupTokenLike>;
  /**
   * Anti-spam / brute-force rate limit, per client IP. Default :
   * `{ limit: 5, windowMs: 60_000 }` (Phase 6.5 DevSecOps).
   */
  readonly rateLimit?: { readonly limit: number; readonly windowMs: number };
}

const defaultExtractEmail = async (request: Request): Promise<unknown> => {
  const body = await checkRequestBody(request, ['email']);
  return body['email'];
};

/**
 * Creates a `POST /api/v1/auth/signup` handler.
 *
 * Wraps the rate-limited signup flow shared by apps :
 *
 * 1. Per-IP rate limit (default 5 req/min — Phase 6.5).
 * 2. Email extraction (strategy ; default = JSON `{ email }`).
 * 3. Email validation (strategy — e.g. regex allowlist or async lookup).
 * 4. Signup service call (strategy — receives the SvelteKit event so
 *    the app can pass through `fetch`, `cookies`, etc.).
 * 5. JSON response `{ data: { signedUp: true, createdAt? }, error: null }`
 *    with `X-RateLimit-*` headers ; 429 with `Retry-After` on cap.
 *
 * @example
 * ```ts
 * import {
 *   createSignupHandler,
 *   validateSignupEmail,
 * } from '@univ-lehavre/atlas-auth';
 * import { signupWithEmail } from '$lib/server/services/auth';
 * import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';
 *
 * export const POST = createSignupHandler({
 *   validateEmail: (e) =>
 *     validateSignupEmail(e, { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP }),
 *   signupWithEmail: (email, event) =>
 *     signupWithEmail(email, { fetch: event.fetch }),
 * });
 * ```
 */
export const createSignupHandler = (config: SignupHandlerConfig): RequestHandler => {
  const limiter = createRateLimiter(config.rateLimit ?? { limit: 5, windowMs: 60_000 });
  const extractEmail = config.extractEmail ?? defaultExtractEmail;

  return async (event) => {
    const rate = limiter.check(event.getClientAddress());
    const rateHeaders = rateLimitHeaders(rate, limiter.limit);
    if (!rate.ok) {
      return jsonResponse(
        {
          data: null,
          error: {
            code: 'rate_limited',
            message: 'Trop de tentatives, réessayez plus tard.',
          },
        },
        { status: 429, headers: rateHeaders }
      );
    }

    try {
      const unsecuredEmail = await extractEmail(event.request);
      const email = await config.validateEmail(unsecuredEmail);
      const token = await config.signupWithEmail(email, event);
      return jsonResponse(
        {
          data: { signedUp: true, createdAt: token.$createdAt },
          error: null,
        },
        { status: 200, headers: rateHeaders }
      );
    } catch (error: unknown) {
      return mapErrorToResponse(error);
    }
  };
};
