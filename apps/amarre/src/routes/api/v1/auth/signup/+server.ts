import { createSignupHandler, validateSignupEmail } from '@univ-lehavre/atlas-auth';

import { allowedDomainsRegexp } from '$lib/server/env';
import { signupWithEmail } from '$lib/server/services/auth';

export const POST = createSignupHandler({
  // La regex est lue à l'appel (dans la closure) via `$lib/server/env`, jamais à
  // l'import du module — late-binding 12-factor (ADR 0045).
  validateEmail: (email) =>
    validateSignupEmail(email, { allowedDomainsRegexp: allowedDomainsRegexp() }),
  signupWithEmail: (email, event) => signupWithEmail(email, { fetch: event.fetch }),
});
