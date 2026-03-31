import { isEmail, isHexadecimal } from '@univ-lehavre/atlas-validators';
import {
  ensureJsonContentType as sharedEnsureJsonContentType,
  parseJsonBody as sharedParseJsonBody,
} from '@univ-lehavre/atlas-validators';
import {
  NotAnEmailError,
  NotPartOfAllianceError,
  SessionError,
  MagicUrlLoginValidationError,
  UserIdValidationError,
} from '@univ-lehavre/atlas-errors';
import { isAlliance } from '$lib/validators/server';

/**
 * Validates an email address for signup.
 * Checks format and domain against allowed alliance domains (from database).
 *
 * @param email - The email to validate
 * @returns The validated email string
 * @throws NotAnEmailError if email format is invalid
 * @throws NotPartOfAllianceError if domain is not in alliance
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

/**
 * Validates magic URL login parameters.
 */
export const validateMagicUrlLogin = (
  userId?: unknown,
  secret?: unknown
): { userId: string; secret: string } => {
  if (!userId || !secret)
    throw new MagicUrlLoginValidationError('Login failed', { cause: 'Missing userId or secret' });
  if (typeof userId !== 'string' || typeof secret !== 'string')
    throw new MagicUrlLoginValidationError('Login failed', {
      cause: 'userId and secret must be strings',
    });
  if (!isHexadecimal(userId) || !isHexadecimal(secret))
    throw new MagicUrlLoginValidationError('Login failed', {
      cause: 'Invalid userId or secret format',
    });
  return { userId, secret };
};

/**
 * Validates a user ID from session.
 */
export const validateUserId = (userId?: unknown): string => {
  if (!userId) throw new SessionError('No active session', { cause: 'Missing userId in session' });
  if (typeof userId !== 'string')
    throw new UserIdValidationError('Operation failed', { cause: 'userId must be a string' });
  if (!isHexadecimal(userId))
    throw new UserIdValidationError('Operation failed', { cause: 'Invalid userId format' });
  return userId;
};

// Re-export shared validators
export const ensureJsonContentType = sharedEnsureJsonContentType;
export const parseJsonBody = sharedParseJsonBody;
