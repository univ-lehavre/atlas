import { Client, Account, Users, Databases } from 'node-appwrite';
import type { Models } from 'node-appwrite';
import type { Cookies } from '@sveltejs/kit';

import { SessionError } from '@univ-lehavre/atlas-errors';

/**
 * Name of the cookie used to store the Appwrite session token.
 */
export const SESSION_COOKIE = 'session';

/**
 * Appwrite label for admin users.
 */
export const ADMIN_LABEL = 'admin';

/**
 * Configuration for Appwrite clients.
 */
export interface AppwriteConfig {
  /** Appwrite endpoint URL */
  endpoint: string;
  /** Appwrite project ID */
  projectId: string;
  /** Appwrite API key (required for admin client) */
  apiKey?: string;
}

/**
 * Admin client interface with full API access.
 */
export interface AdminClient {
  readonly account: Account;
  readonly users: Users;
  readonly databases: Databases;
}

/**
 * Session client interface for authenticated user operations.
 */
export interface SessionAccount {
  readonly account: Account;
}

/**
 * Creates an Appwrite admin client with full API access.
 * Used for server-side operations requiring admin privileges.
 *
 * @param config - Appwrite configuration
 * @returns An object with account, users, and databases managers
 * @throws Error if configuration is incomplete
 *
 * @example
 * ```typescript
 * const config = {
 *   endpoint: process.env.APPWRITE_ENDPOINT,
 *   projectId: process.env.APPWRITE_PROJECT,
 *   apiKey: process.env.APPWRITE_KEY,
 * };
 * const { account, users, databases } = createAdminClient(config);
 * ```
 */
export const createAdminClient = (config: AppwriteConfig): AdminClient => {
  if (!config.endpoint || !config.projectId || !config.apiKey) {
    throw new Error('Appwrite admin client not configured: missing endpoint, projectId, or apiKey');
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

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
 *
 * @param config - Appwrite configuration (endpoint and projectId)
 * @param cookies - SvelteKit cookies object containing the session cookie
 * @returns A configured Appwrite Client
 * @throws SessionError if no active session exists
 */
const createSession = (config: Omit<AppwriteConfig, 'apiKey'>, cookies: Cookies): Client => {
  if (!config.endpoint || !config.projectId) {
    throw new Error('Appwrite session client not configured: missing endpoint or projectId');
  }

  const client: Client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);

  const session: string | undefined = cookies.get(SESSION_COOKIE);
  if (!session || session === '') {
    throw new SessionError('No active session', { cause: 'No secret set in cookie' });
  }

  client.setSession(session);
  return client;
};

/**
 * Creates an Appwrite session client for authenticated user operations.
 *
 * @param config - Appwrite configuration (endpoint and projectId)
 * @param cookies - SvelteKit cookies object containing the session cookie
 * @returns An object with account manager for the authenticated user
 *
 * @example
 * ```typescript
 * const config = {
 *   endpoint: process.env.APPWRITE_ENDPOINT,
 *   projectId: process.env.APPWRITE_PROJECT,
 * };
 * const { account } = createSessionClient(config, cookies);
 * const user = await account.get();
 * ```
 */
export const createSessionClient = (
  config: Omit<AppwriteConfig, 'apiKey'>,
  cookies: Cookies
): SessionAccount => {
  const client = createSession(config, cookies);
  return {
    get account() {
      return new Account(client);
    },
  };
};

/**
 * User data structure returned by the repository.
 */
export interface TUser {
  id: string;
  email: string | null;
  labels: string[];
}

/**
 * Contract for retrieving users from a source (Appwrite, REDCap, etc.).
 */
export interface UserRepository {
  getById(userId: string): Promise<TUser>;
}

/**
 * Appwrite implementation of the UserRepository interface.
 * Retrieves user data from Appwrite using the admin client.
 */
export class AppwriteUserRepository implements UserRepository {
  private readonly config: AppwriteConfig;

  constructor(config: AppwriteConfig) {
    this.config = config;
  }

  /**
   * Retrieves a user by their ID.
   * Returns a minimal user profile if the user is not found or an error occurs.
   *
   * @param userId - The user ID to look up
   * @returns The user data or a minimal profile on error
   */
  async getById(userId: string): Promise<TUser> {
    const { users } = createAdminClient(this.config);
    try {
      const user: Models.User<Models.Preferences> = await users.get({ userId });
      return { id: user.$id, email: user.email, labels: user.labels };
    } catch (error) {
      console.error('AppwriteUserRepository.getById error', error);
      // Return minimal profile so callers can continue
      return { id: userId, email: null, labels: [] };
    }
  }
}

/**
 * Creates an AppwriteUserRepository with the given configuration.
 *
 * @param config - Appwrite configuration with API key
 * @returns A UserRepository instance
 *
 * @example
 * ```typescript
 * const userRepo = createUserRepository({
 *   endpoint: process.env.APPWRITE_ENDPOINT,
 *   projectId: process.env.APPWRITE_PROJECT,
 *   apiKey: process.env.APPWRITE_KEY,
 * });
 * const user = await userRepo.getById('user123');
 * ```
 */
export const createUserRepository = (config: AppwriteConfig): UserRepository => {
  return new AppwriteUserRepository(config);
};

// Re-export node-appwrite types for convenience
export type { Models, Account, Users, Databases, Client } from 'node-appwrite';
export { ID } from 'node-appwrite';
