import { isEmail } from '$lib/validators';
import {
  MagicUrlLoginValidationError,
  RequestBodyValidationError,
  UserIdValidationError,
} from '$lib/errors/auth';
import { isHexadecimal } from '$lib/server/validators';
import {
  InvalidContentTypeError,
  InvalidJsonBodyError,
  NotAnEmailError,
  SessionError,
} from '$lib/errors';
import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';

export const validateSignupEmail = async (email?: unknown): Promise<string> => {
  if (!email)
    throw new NotAnEmailError('Authentication not possible', {
      cause: 'No email address provided',
    });
  if (typeof email !== 'string')
    throw new NotAnEmailError('Authentication not possible', { cause: 'Email must be a string' });
  if (!isEmail(email))
    throw new NotAnEmailError('Authentication not possible', { cause: 'Invalid email format' });
  if (!email.match(ALLOWED_DOMAINS_REGEXP))
    throw new NotAnEmailError('Authentication not possible', {
      cause: 'Your professional email domain is unknown',
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

export const checkRequestBody = async (
  request: Request,
  properties: string[]
): Promise<Record<string, unknown>> => {
  const contentType: string | null = request.headers.get('content-type');
  if (contentType === null) throw new RequestBodyValidationError('Content-Type header is missing');
  if (!contentType.includes('application/json'))
    throw new RequestBodyValidationError('Unsupported Content-Type');
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new RequestBodyValidationError('Request body must be a JSON object');
  const result: Record<string, unknown> = {};
  for (const property of properties) {
    if (!Object.keys(body).includes(property))
      throw new RequestBodyValidationError('Request body missing correct data');
    result[property] = body[property];
  }
  return result;
};
