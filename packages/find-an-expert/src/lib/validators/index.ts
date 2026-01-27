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
 * @param email - The string to validate
 * @returns True if the string is a valid email, false otherwise
 */
export const isEmail = (email: string): boolean => {
  if (email.length === 0 || email.length > 254) {
    return false;
  }
  return EMAIL_REGEXP.test(email);
};
