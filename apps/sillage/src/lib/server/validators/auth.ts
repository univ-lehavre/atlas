import { validateSignupEmail as sharedValidateSignupEmail } from '@univ-lehavre/atlas-auth';

import { allowedDomainsRegexp } from '$lib/server/env';

// `validateSignupEmail` du package prend la regex en argument ; on
// l'enveloppe pour préserver l'API locale (un seul paramètre) en
// injectant l'env de l'app. La regex est lue à l'appel (late-binding).
export const validateSignupEmail = (email?: unknown): Promise<string> =>
  sharedValidateSignupEmail(email, { allowedDomainsRegexp: allowedDomainsRegexp() });

export { validateMagicUrlLogin, validateUserId, checkRequestBody } from '@univ-lehavre/atlas-auth';
export { ensureJsonContentType, parseJsonBody } from '@univ-lehavre/atlas-validators';
