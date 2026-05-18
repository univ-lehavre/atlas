import { Client, Account, Users, Databases } from 'node-appwrite';
import type { Cookies } from '@sveltejs/kit';

import { SessionError } from '$lib/server/http';
import { SESSION_COOKIE } from '$lib/constants';
import { APPWRITE_KEY } from '$env/static/private';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT } from '$env/static/private';

interface AdminClient {
  readonly account: Account;
  readonly users: Users;
  readonly databases: Databases;
}

/**
 * Creates an Appwrite admin client with full API access.
 * Used for server-side operations requiring admin privileges.
 * @returns An object with account and users managers
 * @throws Error if environment variables are not configured
 */
export const createAdminClient = (): AdminClient => {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_KEY) {
    throw new Error('Appwrite admin client not configured: missing environment variables');
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_KEY);

  return {
    get account() {
      return new Account(client);
    },
    get users() {
      return new Users(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
};

/**
 * Creates an Appwrite client configured with the user's session.
 * @param cookies - SvelteKit cookies object containing the session cookie
 * @returns A configured Appwrite Client
 * @throws SessionError if no active session exists
 */
const createSession = (cookies: Cookies): Client => {
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
    throw new Error('Appwrite session client not configured: missing PUBLIC_APPWRITE_*');
  }

  const client: Client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);

  const session: string | undefined = cookies.get(SESSION_COOKIE);
  if (!session || session === '') {
    throw new SessionError('No active session', { cause: 'No secret set in cookie' });
  }

  client.setSession(session);
  return client;
};

interface SessionAccount {
  readonly account: Account;
}

/**
 * Creates an Appwrite session client for authenticated user operations.
 * @param cookies - SvelteKit cookies object containing the session cookie
 * @returns An object with account manager for the authenticated user
 */
export const createSessionClient = (cookies: Cookies): SessionAccount => {
  const client = createSession(cookies);
  return {
    get account() {
      return new Account(client);
    },
  };
};
