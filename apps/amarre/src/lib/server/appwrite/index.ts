import { Client, Account, Users } from 'node-appwrite';
import type { Cookies } from '@sveltejs/kit';

import { SessionError } from '@univ-lehavre/atlas-errors';
import { SESSION_COOKIE } from '@univ-lehavre/atlas-appwrite';
import { APPWRITE_KEY } from '$env/static/private';
import { PUBLIC_APPWRITE_ENDPOINT, PUBLIC_APPWRITE_PROJECT } from '$env/static/public';

interface AdminClient {
  readonly account: Account;
  readonly users: Users;
}

const createAdminClient = (): AdminClient => {
  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT || !APPWRITE_KEY)
    throw new Error('Appwrite admin client not configured: missing environment variables');

  const client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT)
    .setKey(APPWRITE_KEY);

  return {
    get account() {
      return new Account(client);
    },
    get users() {
      return new Users(client);
    },
  };
};

const createSession = (cookies: Cookies): Client => {
  if (!PUBLIC_APPWRITE_ENDPOINT || !PUBLIC_APPWRITE_PROJECT)
    throw new Error('Appwrite session client not configured: missing PUBLIC_APPWRITE_*');

  const client: Client = new Client()
    .setEndpoint(PUBLIC_APPWRITE_ENDPOINT)
    .setProject(PUBLIC_APPWRITE_PROJECT);
  const session: string | undefined = cookies.get(SESSION_COOKIE);
  if (!session || session === '')
    throw new SessionError('No active session', { cause: 'No secret set in cookie' });

  client.setSession(session);
  return client;
};

interface SessionAccount {
  readonly account: Account;
}

const createSessionClient = (cookies: Cookies): SessionAccount => {
  const client = createSession(cookies);
  return {
    get account() {
      return new Account(client);
    },
  };
};

export { createAdminClient, createSessionClient };
