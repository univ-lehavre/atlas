import { isEmail } from '$lib/validators';
import { MagicUrlLoginValidationError, UserIdValidationError } from '$lib/errors/auth';
import { isAlliance, isHexadecimal } from '$lib/validators/server';
import {
  InvalidContentTypeError,
  InvalidJsonBodyError,
  NotAnEmailError,
  NotPartOfAllianceError,
  SessionError,
} from '$lib/errors';

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

export const validateUserId = (userId?: unknown): string => {
  if (!userId) throw new SessionError('No active session', { cause: 'Missing userId in session' });
  if (typeof userId !== 'string')
    throw new UserIdValidationError('Operation failed', { cause: 'userId must be a string' });
  if (!isHexadecimal(userId))
    throw new UserIdValidationError('Operation failed', { cause: 'Invalid userId format' });
  return userId;
};

export const ensureJsonContentType = (request: Request): void => {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new InvalidContentTypeError();
  }
};

export const parseJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new InvalidJsonBodyError('Request body must be a JSON object');
    }

    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) throw error;
    throw new InvalidJsonBodyError('Request body must be valid JSON');
  }
};
