import type { Cookies } from '@sveltejs/kit';

/** Contexte minimal nécessaire aux services d'authentification */
export interface SignupContext {
  fetch: typeof fetch;
  // cookies utilisés si le service a besoin d'accéder/modifier les cookies
  cookies?: Cookies;
}
