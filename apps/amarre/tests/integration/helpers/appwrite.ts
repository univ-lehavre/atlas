// Appwrite admin helper for level-4 integration tests. The admin SDK
// is the only way to clean up users created during tests — the regular
// client requires a valid session.

import { createAdminClient } from '@univ-lehavre/atlas-baas';
import { Query } from 'node-appwrite';
import { env } from '$env/dynamic/private';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT } from '$env/static/public';

// Helper de test : lecture TOLÉRANTE de la clé (forme objet `env` de
// dynamic/private), pas le getter fail-closed `$lib/server/env` — la suite doit
// pouvoir DÉTECTER une clé absente/placeholder pour se skip, pas throw.
const APPWRITE_KEY = env.APPWRITE_KEY;

const adminConfig = {
  endpoint: PUBLIC_APPWRITE_ENDPOINT,
  projectId: PUBLIC_APPWRITE_PROJECT,
  apiKey: APPWRITE_KEY ?? '',
};

/**
 * Probes the Appwrite admin endpoint with the configured server key.
 * Returns true when the project is reachable AND the key is accepted.
 * Used as a skip predicate at the top of the auth integration suite.
 */
// We only treat the endpoint as a placeholder when it points at the
// literal example.com host of `.env.example`. `includes('example.com')`
// would also match e.g. `appwrite.example.company.io`, which CodeQL
// flags as an incomplete URL sanitisation (`js/incomplete-url-
// substring-sanitization`, alert #41). Comparing the parsed host
// instead pins us to the actual placeholder.
const isPlaceholderEndpoint = (endpoint: string): boolean => {
  try {
    return new URL(endpoint).hostname === 'cloud.example.com';
  } catch {
    return false;
  }
};

export const isAppwriteReachable = async (): Promise<boolean> => {
  if (
    !APPWRITE_KEY ||
    APPWRITE_KEY.startsWith('<') ||
    !PUBLIC_APPWRITE_ENDPOINT ||
    isPlaceholderEndpoint(PUBLIC_APPWRITE_ENDPOINT)
  ) {
    return false;
  }
  try {
    const { users } = createAdminClient(adminConfig);
    // List 1 user — cheapest authenticated admin call. Throws on bad
    // credentials, returns OK on success.
    await users.list({ queries: [Query.limit(1)] });
    return true;
  } catch {
    return false;
  }
};

/**
 * Deletes any Appwrite user whose email matches the given address. Used
 * by afterAll() to keep the test environment clean. Tolerates "not
 * found" so cleanup never fails the suite.
 */
export const deleteUserByEmail = async (email: string): Promise<void> => {
  try {
    const { users } = createAdminClient(adminConfig);
    const list = await users.list({ queries: [Query.equal('email', email)] });
    await Promise.all(list.users.map((u) => users.delete({ userId: u.$id })));
  } catch {
    // best-effort cleanup, don't escalate
  }
};

/**
 * Counts active sessions for a user. After a successful magic-link
 * login() the test expects this to return >= 1.
 */
export const countSessions = async (userId: string): Promise<number> => {
  try {
    const { users } = createAdminClient(adminConfig);
    const result = await users.listSessions({ userId });
    return result.sessions.length;
  } catch {
    return 0;
  }
};
