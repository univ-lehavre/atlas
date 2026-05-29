import { createSignupHandler, validateSignupEmail } from '@univ-lehavre/atlas-auth';
import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';

import { signupWithEmail } from '$lib/server/services/auth';

export const POST = createSignupHandler({
  validateEmail: (email) =>
    validateSignupEmail(email, { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP }),
  signupWithEmail: (email, event) => signupWithEmail(email, { fetch: event.fetch }),
});
