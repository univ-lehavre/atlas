import { InvalidContentTypeError, InvalidJsonBodyError } from '@univ-lehavre/atlas-errors';

/**
 * Email regex pattern based on RFC 5322 (simplified).
 * Secure against ReDoS attacks by avoiding nested quantifiers.
 * Supports:
 * - Standard alphanumeric characters
 * - Special characters in local part: .!#$%&'*+/=?^_`{|}~-
 * - Domain labels with hyphens (not at start/end)
 * - TLDs of 2+ characters
 * - IP address domains in brackets
 */
const EMAIL_REGEXP =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\])$/;

/**
 * Validates if a string is a valid email address.
 * Uses RFC 5322 compliant regex with ReDoS protection.
 *
 * @param email - The string to validate
 * @returns True if the string is a valid email, false otherwise
 *
 * @example
 * ```typescript
 * isEmail('user@example.com'); // true
 * isEmail('invalid'); // false
 * ```
 */
export const isEmail = (email: string): boolean => {
  if (email.length === 0 || email.length > 254) {
    return false;
  }
  return EMAIL_REGEXP.test(email);
};

/**
 * Hexadecimal validation regex.
 */
const HEX_REGEXP = /^[0-9a-fA-F]+$/;

/**
 * Validates if a string contains only hexadecimal characters.
 * Used for validating Appwrite user IDs and session tokens.
 *
 * @param str - The string to validate
 * @returns True if the string contains only hex characters, false otherwise
 *
 * @example
 * ```typescript
 * isHexadecimal('abc123'); // true
 * isHexadecimal('xyz'); // false
 * ```
 */
export const isHexadecimal = (str: string): boolean => {
  return HEX_REGEXP.test(str);
};

/**
 * Validates that the request has a JSON content type.
 * Throws InvalidContentTypeError if the content type is not application/json.
 *
 * @param request - The HTTP request to validate
 * @throws InvalidContentTypeError if Content-Type is not application/json
 *
 * @example
 * ```typescript
 * ensureJsonContentType(request);
 * const body = await parseJsonBody(request);
 * ```
 */
export const ensureJsonContentType = (request: Request): void => {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new InvalidContentTypeError();
  }
};

/**
 * Parses and validates the JSON body of a request.
 * Ensures the body is a valid JSON object (not an array or primitive).
 *
 * @param request - The HTTP request to parse
 * @returns The parsed JSON object
 * @throws InvalidJsonBodyError if the body is not valid JSON or not an object
 *
 * @example
 * ```typescript
 * const body = await parseJsonBody(request);
 * const email = body.email;
 * ```
 */
export const parseJsonBody = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const body: unknown = await request.json();

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
 * Validates a request body with JSON content type and parses it.
 * Combines ensureJsonContentType and parseJsonBody.
 *
 * @param request - The HTTP request to validate and parse
 * @returns The parsed JSON object
 * @throws InvalidContentTypeError if Content-Type is not application/json
 * @throws InvalidJsonBodyError if the body is not valid JSON or not an object
 *
 * @example
 * ```typescript
 * const body = await validateAndParseJsonBody(request);
 * ```
 */
export const validateAndParseJsonBody = async (
  request: Request
): Promise<Record<string, unknown>> => {
  ensureJsonContentType(request);
  return parseJsonBody(request);
};

/**
 * Normalizes an email address.
 * - Converts to lowercase
 * - Removes subaddressing (everything after + in the local part)
 *
 * @param email - The email to normalize
 * @returns The normalized email
 *
 * @example
 * ```typescript
 * normalizeEmail('User+tag@Example.COM'); // 'user@example.com'
 * ```
 */
export const normalizeEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email.toLowerCase();
  }
  // Remove subaddressing (everything after +)
  const normalizedLocal = localPart.split('+')[0];
  return `${normalizedLocal}@${domain}`.toLowerCase();
};
