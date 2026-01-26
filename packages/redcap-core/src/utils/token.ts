/**
 * Token utilities
 */

/**
 * Mask a token for display (show first 4 and last 4 characters)
 *
 * @example
 * ```ts
 * maskToken('A1B2C3D4E5F67890A1B2C3D4E5F67890')
 * // 'A1B2************************7890'
 * ```
 */
export const maskToken = (token: string): string => {
  if (token.length <= 8) {
    return '*'.repeat(token.length);
  }
  return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4);
};

/**
 * Check if two tokens are equal (constant-time comparison)
 *
 * Prevents timing attacks by always comparing all characters.
 */
export const tokensEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};
