import { isEmail } from '$lib/validators';
import { normalizeEmail } from '$lib/normalizers';
import { SessionError, InvalidContentTypeError, InvalidJsonBodyError } from '$lib/server/http';
import {
  NotAnEmailError,
  MagicUrlLoginValidationError,
  UserIdValidationError,
  RequestBodyValidationError,
} from './errors';
import { ALLOWED_DOMAINS_REGEXP } from '$env/static/private';

/**
 * Validates if a string contains only hexadecimal characters.
 * Used for validating Appwrite IDs and secrets.
 * @param str - The string to validate
 * @returns True if the string is valid hexadecimal, false otherwise
 */
const isHexadecimal = (str: string): boolean => {
  const HEX_RE = /^[0-9a-fA-F]+$/;
  return HEX_RE.test(str);
};

/**
 * Validates an email address for signup.
 * Checks format and domain against allowed domains.
 * Returns normalized email (lowercase, subaddressing removed).
 * @param email - The email to validate
 * @returns The validated and normalized email string
 * @throws NotAnEmailError if validation fails
 */
export const validateSignupEmail = async (email?: unknown): Promise<string> => {
  if (!email) {
    throw new NotAnEmailError('Authentication not possible', {
      cause: 'No email address provided',
    });
  }
  if (typeof email !== 'string') {
    throw new NotAnEmailError('Authentication not possible', { cause: 'Email must be a string' });
  }
  if (!isEmail(email)) {
    throw new NotAnEmailError('Authentication not possible', { cause: 'Invalid email format' });
  }
  if (!email.match(ALLOWED_DOMAINS_REGEXP)) {
    throw new NotAnEmailError('Authentication not possible', {
      cause: 'Your professional email domain is unknown',
    });
  }
  return normalizeEmail(email);
};

/**
 * Validates magic URL login parameters.
 * @param userId - The user ID from the magic URL
 * @param secret - The secret from the magic URL
 * @returns An object containing validated userId and secret
 * @throws MagicUrlLoginValidationError if validation fails
 */
export const validateMagicUrlLogin = (
  userId?: unknown,
  secret?: unknown
): { userId: string; secret: string } => {
  if (!userId || !secret) {
    throw new MagicUrlLoginValidationError('Login failed', { cause: 'Missing userId or secret' });
  }
  if (typeof userId !== 'string' || typeof secret !== 'string') {
    throw new MagicUrlLoginValidationError('Login failed', {
      cause: 'userId and secret must be strings',
    });
  }
  if (!isHexadecimal(userId) || !isHexadecimal(secret)) {
    throw new MagicUrlLoginValidationError('Login failed', {
      cause: 'Invalid userId or secret format',
    });
  }
  return { userId, secret };
};

/**
 * Validates a user ID from session.
 * @param userId - The user ID to validate
 * @returns The validated user ID string
 * @throws SessionError if userId is missing
 * @throws UserIdValidationError if format is invalid
 */
export const validateUserId = (userId?: unknown): string => {
  if (!userId) {
    throw new SessionError('No active session', { cause: 'Missing userId in session' });
  }
  if (typeof userId !== 'string') {
    throw new UserIdValidationError('Operation failed', { cause: 'userId must be a string' });
  }
  if (!isHexadecimal(userId)) {
    throw new UserIdValidationError('Operation failed', { cause: 'Invalid userId format' });
  }
  return userId;
};

/**
 * Ensures the request has a JSON content type.
 * @param request - The incoming request
 * @throws InvalidContentTypeError if content type is not JSON
 */
export const ensureJsonContentType = (request: Request): void => {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new InvalidContentTypeError();
  }
};

/**
 * Parses the request body as JSON.
 * @param request - The incoming request
 * @returns The parsed JSON object
 * @throws InvalidJsonBodyError if body is not valid JSON
 */
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

/**
 * Validates request body and extracts required properties.
 * @param request - The incoming request
 * @param properties - Array of required property names
 * @returns Object containing the extracted properties
 * @throws RequestBodyValidationError if validation fails
 */
export const checkRequestBody = async (
  request: Request,
  properties: string[]
): Promise<Record<string, unknown>> => {
  const contentType: string | null = request.headers.get('content-type');
  if (contentType === null) {
    throw new RequestBodyValidationError('Content-Type header is missing');
  }
  if (!contentType.includes('application/json')) {
    throw new RequestBodyValidationError('Unsupported Content-Type');
  }
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RequestBodyValidationError('Request body must be a JSON object');
  }
  const result: Record<string, unknown> = {};
  for (const property of properties) {
    if (!Object.keys(body).includes(property)) {
      throw new RequestBodyValidationError('Request body missing correct data');
    }
    result[property] = body[property];
  }
  return result;
};
