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

import type { RequestHandler } from '@sveltejs/kit';
import { mapErrorToApiResponse } from '@univ-lehavre/atlas-errors';
import { ensureJsonContentType, parseJsonBody } from '@univ-lehavre/atlas-validators';
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
