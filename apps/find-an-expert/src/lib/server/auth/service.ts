import type { Cookies } from '@sveltejs/kit';
import { ID, type Models } from 'node-appwrite';

import { SESSION_COOKIE } from '$lib/constants';
import { PUBLIC_LOGIN_URL } from '$env/static/public';
import { createAdminClient, createSessionClient } from '$lib/server/appwrite';
import { validateMagicUrlLogin, validateSignupEmail, validateUserId } from './validators';

/**
 * Signs up a user with email and sends a magic link for authentication.
 * @param unsecuredEmail - The email address to validate and use for signup
 * @returns A promise resolving to the magic URL token
 */
export const signupWithEmail = async (unsecuredEmail: unknown): Promise<Models.Token> => {
  const email: string = await validateSignupEmail(unsecuredEmail);
  const url: string = `${PUBLIC_LOGIN_URL}/login`;

  const { account } = createAdminClient();
  const userId: string = ID.unique();
  const token: Models.Token = await account.createMagicURLToken({ userId, email, url });

  return token;
};

/**
 * Logs in a user using magic URL parameters and creates a session.
 * @param unsecuredUserId - The user ID from the magic URL
 * @param unsecuredSecret - The secret from the magic URL
 * @param cookies - SvelteKit cookies object for setting the session cookie
 * @returns A promise resolving to the created session
 */
export const login = async (
  unsecuredUserId: unknown,
  unsecuredSecret: unknown,
  cookies: Cookies
): Promise<Models.Session> => {
  const { userId, secret } = validateMagicUrlLogin(unsecuredUserId, unsecuredSecret);

  const { account } = createAdminClient();
  const session: Models.Session = await account.createSession({ userId, secret });
  cookies.set(SESSION_COOKIE, session.secret, {
    sameSite: 'strict',
    expires: new Date(session.expire),
    secure: true,
    path: '/',
  });

  return session;
};

/**
 * Logs out a user by deleting all their sessions and clearing the session cookie.
 * @param unsecuredUserId - The user ID to validate
 * @param cookies - SvelteKit cookies object for deleting the session cookie
 */
export const logout = async (unsecuredUserId: unknown, cookies: Cookies): Promise<void> => {
  validateUserId(unsecuredUserId);

  const { account } = createSessionClient(cookies);
  await account.deleteSessions();
  cookies.delete(SESSION_COOKIE, { path: '/' });
};
