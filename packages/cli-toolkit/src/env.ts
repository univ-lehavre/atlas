/**
 * Environment-variable helpers shared by the atlas CLIs.
 *
 * These wrap `process.env` access so every CLI handles missing/empty
 * variables the same way, without each re-implementing the lookup and the
 * "required variable missing" check.
 */

/**
 * Reads an environment variable, returning `fallback` when it is unset
 * **or** the empty string. The empty-string case matters for CLIs that
 * receive a blank value from a partially-filled `.env` file.
 *
 * @param name - Variable name to read.
 * @param fallback - Value returned when the variable is unset or empty (default `""`).
 */
export const getEnv = (name: string, fallback = ''): string => {
  // eslint-disable-next-line security/detect-object-injection -- `name` is a caller-supplied, known key
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

/** Result of {@link requireEnv}. */
export type RequireEnvResult =
  | { readonly ok: true; readonly values: Readonly<Record<string, string>> }
  | { readonly ok: false; readonly missing: readonly string[] };

/**
 * Reads several required environment variables at once.
 *
 * Returns `{ ok: true, values }` with every requested variable resolved, or
 * `{ ok: false, missing }` listing the names that are unset/empty. A variable
 * is considered missing when {@link getEnv} would return the empty string.
 *
 * Callers decide how to react (print a message and exit, throw, etc.), keeping
 * terminal I/O out of the toolkit.
 *
 * @param names - Required variable names.
 */
export const requireEnv = (names: readonly string[]): RequireEnvResult => {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const name of names) {
    const value = getEnv(name);
    if (value === '') {
      missing.push(name);
    } else {
      // eslint-disable-next-line security/detect-object-injection -- `name` is a caller-supplied env var name written into a fresh object
      values[name] = value;
    }
  }
  return missing.length > 0 ? { ok: false, missing } : { ok: true, values };
};
