/**
 * Normalizes an email address for uniqueness checking.
 * - Converts to lowercase
 * - Removes subaddressing (everything after + in local part)
 * @param email - The email address to normalize
 * @returns The normalized email address
 * @example
 * normalizeEmail('User+tag@Example.COM') // returns 'user@example.com'
 */
export const normalizeEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return email.toLowerCase();
  }
  const normalizedLocal = localPart.split('+')[0];
  return `${normalizedLocal}@${domain}`.toLowerCase();
};
