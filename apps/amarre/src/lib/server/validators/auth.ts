import { validateSignupEmail as sharedValidateSignupEmail } from '@univ-lehavre/atlas-auth';

import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';

// `validateSignupEmail` du package prend la regex en argument ; on
// l'enveloppe pour préserver l'API locale (un seul paramètre) en
// injectant l'env de l'app.
export const validateSignupEmail = (email?: unknown): Promise<string> =>
  sharedValidateSignupEmail(email, { allowedDomainsRegexp: ALLOWED_DOMAINS_REGEXP });

export { validateMagicUrlLogin, validateUserId } from '@univ-lehavre/atlas-auth';
export { ensureJsonContentType, parseJsonBody } from '@univ-lehavre/atlas-validators';
