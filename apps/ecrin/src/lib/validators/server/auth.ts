import { isEmail } from '@univ-lehavre/atlas-validators';
import { ensureJsonContentType, parseJsonBody } from '@univ-lehavre/atlas-validators';
import { validateMagicUrlLogin, validateUserId } from '@univ-lehavre/atlas-auth';
import { NotAnEmailError, NotPartOfAllianceError } from '@univ-lehavre/atlas-errors';
import { isAlliance } from '$lib/validators/server';

/**
 * Validates an email address for signup. Spécifique ecrin : l'allowlist
 * est résolue de manière asynchrone via `isAlliance` (lecture base
 * Appwrite) au lieu d'une regex statique en env. Pour cette raison, on
 * n'utilise pas le `validateSignupEmail` du package partagé.
 *
 * @throws NotAnEmailError si format invalide
 * @throws NotPartOfAllianceError si domaine hors alliance
 */
export const validateSignupEmail = async (email?: unknown): Promise<string> => {
  if (!email)
    throw new NotAnEmailError('Registration not possible', { cause: 'No email address provided' });
  if (typeof email !== 'string')
    throw new NotAnEmailError('Registration not possible', { cause: 'Email must be a string' });
  if (!isEmail(email))
    throw new NotAnEmailError('Registration not possible', { cause: 'Invalid email format' });
  if (!(await isAlliance(email)))
    throw new NotPartOfAllianceError('Registration not possible', {
      cause: 'Email not part of alliance',
    });
  return email;
};

export { validateMagicUrlLogin, validateUserId, ensureJsonContentType, parseJsonBody };
